// 허브 서버(service-hub-server) 호출 창구 — axios 인스턴스와 인터셉터.
//
// 화면은 서버를 직접 부르지 않고 같은 주소의 /api/hub 로 부른다. Vercel 이 /api/hub 를 떼고
// 서버로 넘기면서(vercel.json rewrites) 허브 로그인 쿠키(hub_session)를 함께 실어 보낸다.
// 로컬 개발은 vite.config.ts 의 프록시가 같은 일을 한다. 그래서 여기서는 토큰을 다루지 않는다.
//
// 인터셉터가 맡는 일
//   요청  요청 번호(X-Request-Id) · 시작 시각을 붙이고 로그
//   응답  걸린 시간과 함께 로그
//   오류  ApiError 로 맞추고 로그, 401 이면 다시 로그인으로
//
// 성공 응답은 { status, message, data } 로 감싸 온다(명세 1.3). hubApi.get 등은 data 만 돌려준다.

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ApiError, toApiError } from './errors'
import { apiLog, type LogEntry } from './logger'

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** 로그용 — 요청 번호와 보낸 시각 */
    meta?: { id: string; startedAt: number }
  }
}

/** 서버 성공 응답의 겉모양 */
export interface Envelope<T> {
  status: number
  message: string
  data: T
}

const newId = () => (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 8)

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
    return JSON.parse(text)
  } catch {
    return text
  }
}

let redirecting = false

/**
 * 세션이 끝났다 — 로그인으로 보내고 돌아오면 지금 화면으로.
 * 로컬 개발에는 로그인 함수(Edge)가 없으니 쿠키 설정을 안내만 한다.
 */
function onUnauthorized() {
  if (import.meta.env.DEV) {
    // 패널마다 401 이 오므로 안내는 한 번만
    if (redirecting) return
    redirecting = true
    apiLog.hint('401 — .env.local 의 HUB_SESSION_COOKIE 가 비었거나 만료됐습니다. 운영 허브에 로그인한 브라우저의 hub_session 쿠키 값을 넣고 dev 서버를 다시 켜세요.')
    return
  }
  if (redirecting) return
  redirecting = true
  window.location.href = '/api/auth/login?next=' + encodeURIComponent(location.pathname + location.search + location.hash)
}

function withInterceptors(instance: AxiosInstance, { redirectOn401 }: { redirectOn401: boolean }) {
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
      if (redirectOn401 && apiError.status === 401) onUnauthorized()
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
  { redirectOn401: true },
)

const unwrap = <T>(res: AxiosResponse<Envelope<T>>) => res.data?.data as T

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
 */
export const auth = withInterceptors(
  axios.create({
    baseURL: '/api/auth',
    timeout: 10_000,
    headers: { Accept: 'application/json' },
  }),
  { redirectOn401: false },
)

export { ApiError }

/** 경로 조각 — id 에 / · ? 가 섞여도 경로가 깨지지 않게 */
export const seg = encodeURIComponent
