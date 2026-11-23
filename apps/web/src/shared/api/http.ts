// 허브 서버(service-hub-server) 호출 창구 — axios 인스턴스와 인터셉터.
//
// 화면은 서버를 직접 부르지 않고 같은 주소의 /api/hub 로 부른다. Vercel 이 /api/hub 를 떼고
// 서버로 넘기면서(vercel.json rewrites) 허브 로그인 쿠키(hub_session)를 함께 실어 보낸다.
// 로컬 개발은 vite.config.ts 의 프록시가 같은 일을 한다. 그래서 여기서는 토큰을 다루지 않는다.
//
// 인터셉터가 맡는 일
//   요청  요청 번호(X-Request-Id) · 시작 시각을 붙이고 로그
//   응답  걸린 시간과 함께 로그
//   오류  ApiError 로 맞추고 로그. 401 이면 세션을 한 번 늘리고(session.ts) 다시 보낸다 — 거절되면 통합 로그인으로
//
// 성공 응답은 { status, message, data } 로 감싸 온다(명세 1.3). hubApi.get 등은 data 만 돌려준다.

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ApiError, toApiError } from './errors'
import { apiLog, type LogEntry } from './logger'
import { renewSession, toLogin } from './session'

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** 로그용 — 요청 번호와 보낸 시각 */
    meta?: { id: string; startedAt: number }
  }
  interface AxiosRequestConfig {
    /** 401 에 세션을 늘리고 다시 보낸 요청 — 또 401 이면 다시 늘리지 않는다 */
    renewed?: boolean
  }
}

/** 서버 성공 응답의 겉모양 */
interface Envelope<T> {
  status: number
  message: string
  data: T
}

// randomUUID 는 보안 연결(https · localhost)에서만 있다
const newId = () => ((crypto as Partial<Crypto>).randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 8)

const entryOf = (config: InternalAxiosRequestConfig | undefined): LogEntry => ({
  id: config?.meta?.id ?? '-',
  method: config?.method ?? 'get',
  url: `${config?.baseURL ?? ''}${config?.url ?? ''}`,
  params: config?.params,
  body: typeof config?.data === 'string' ? safeJson(config.data) : config?.data,
  ms: config?.meta ? Math.round(performance.now() - config.meta.startedAt) : undefined,
})

function safeJson(text: string) {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

let hinted = false

/**
 * 세션이 끝났다(401) — 한 번 늘려 보고 되면 같은 요청을 다시 보낸다. 거절되면 통합 로그인으로 보내고 돌아오면 지금 화면으로.
 * 늘리고 다시 보냈는데도 401 이면 허브 로그인은 살아 있는데 서버만 쿠키를 받지 않는 것이다 — 그때 로그인으로 보내면
 * Keycloak 이 곧장 돌려보내 화면과 로그인을 끝없이 오간다. 그래서 안내만 남긴다.
 * 로컬 개발에는 로그인 함수(Edge)가 없으니 쿠키 설정을 안내만 한다.
 */
async function retryAfterRenew(instance: AxiosInstance, config: InternalAxiosRequestConfig | undefined, apiError: ApiError) {
  if (import.meta.env.DEV) {
    if (!hinted) apiLog.hint('401 — .env.local 의 HUB_SESSION_COOKIE 가 비었거나 만료됐습니다. 운영 허브에 로그인한 브라우저의 hub_session 쿠키 값을 넣고 dev 서버를 다시 켜세요.')
    hinted = true
    throw apiError
  }
  if (!config || config.renewed) {
    if (!hinted) apiLog.hint('401 — 허브 로그인은 살아 있는데 허브 서버가 쿠키를 받지 않습니다. 서버의 SESSION_SECRET 이 Vercel 과 같은지 확인하세요.')
    hinted = true
    throw apiError
  }
  const renewal = await renewSession()
  if (renewal === 'renewed') return instance.request({ ...config, renewed: true })
  if (renewal === 'expired') toLogin()
  throw apiError
}

function withInterceptors(instance: AxiosInstance, { renewOn401 }: { renewOn401: boolean }) {
  instance.interceptors.request.use((config) => {
    config.meta = { id: newId(), startedAt: performance.now() }
    config.headers.set('X-Request-Id', config.meta.id)
    apiLog.request(entryOf(config))
    return config
  })

  instance.interceptors.response.use(
    (res) => {
      apiLog.response(entryOf(res.config), res.status, res.data)
      return res
    },
    (error: unknown) => {
      // 화면을 떠나 취소한 요청(TanStack Query 의 signal)은 오류가 아니다 — 그대로 넘긴다
      if (axios.isCancel(error)) return Promise.reject(error)
      const apiError = toApiError(error)
      apiLog.error(entryOf(axios.isAxiosError(error) ? error.config : undefined), apiError)
      if (renewOn401 && apiError.status === 401) return retryAfterRenew(instance, axios.isAxiosError(error) ? error.config : undefined, apiError)
      return Promise.reject(apiError)
    },
  )
  return instance
}

/** 허브 서버 (/api/hub → service-hub-server) */
export const hub = withInterceptors(
  axios.create({
    baseURL: '/api/hub',
    timeout: 15_000,
    headers: { Accept: 'application/json' },
  }),
  { renewOn401: true },
)

// 본문이 빈 응답(204 등)도 있다
const unwrap = <T>(res: AxiosResponse<Envelope<T> | undefined>) => res.data?.data as T

/** 감싼 응답에서 data 만 꺼내 주는 호출 함수 */
export const hubApi = {
  get: <T>(url: string, config?: AxiosRequestConfig) => hub.get<Envelope<T>>(url, config).then(unwrap),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => hub.post<Envelope<T>>(url, body, config).then(unwrap),
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => hub.put<Envelope<T>>(url, body, config).then(unwrap),
  delete: <T = void>(url: string, config?: AxiosRequestConfig) => hub.delete<Envelope<T>>(url, config).then(unwrap),
}

/**
 * 허브 Vercel 함수 (/api/auth/*). 응답을 감싸지 않는다.
 * 401 은 호출부(fetchMe)가 직접 다룬다 — 로컬 개발에서는 함수가 없어 index.html 이 오기도 한다.
 * 세션 갱신(/api/auth/refresh)은 이 인스턴스가 아니라 session.ts 가 부른다.
 */
export const auth = withInterceptors(
  axios.create({
    baseURL: '/api/auth',
    timeout: 10_000,
    headers: { Accept: 'application/json' },
  }),
  { renewOn401: false },
)

/** 경로 조각 — id 에 / · ? 가 섞여도 경로가 깨지지 않게 */
export const seg = encodeURIComponent
