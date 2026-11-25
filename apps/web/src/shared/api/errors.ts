// 서버 오류를 화면이 다루기 쉬운 한 모양(ApiError)으로 맞춘다.
//
// 서버 오류 본문: { code, status, message, field? } (명세 1.4). 화면 분기는 code 로 한다.
// 서버에 닿지 못한 경우(연결 끊김 · 시간 초과)는 code 를 NETWORK_ERROR · TIMEOUT 으로 붙인다.
// from 은 오류를 누가 냈는지 — 로그를 어디서 찾을지 정한다(logger.ts).

import { isAxiosError } from 'axios'

/** 명세에 적힌 오류 코드. 서버가 새 코드를 보낼 수 있어 string 도 받는다 */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'ACCESS_DENIED'
  | 'METHOD_ARGUMENT_NOT_VALID'
  | 'HTTP_MESSAGE_NOT_READABLE'
  | 'MISSING_REQUEST_PARAMETER'
  | 'METHOD_ARGUMENT_TYPE_MISMATCH'
  | 'NOTICE_NOT_FOUND'
  | 'MAINTENANCE_NOT_FOUND'
  | 'MAINTENANCE_SERVICE_UNKNOWN'
  | 'MAINTENANCE_TIME_INVALID'
  | 'INVALID_SCHEDULE_RANGE'
  | 'INVALID_MONTH'
  | 'INVALID_NEWS_PAGE'
  | 'FLOW_NOT_CONFIGURED'
  | 'FLOW_KEY_REJECTED'
  | 'FLOW_FORBIDDEN'
  | 'FLOW_PROJECT_NOT_FOUND'
  | 'FLOW_RATE_LIMITED'
  | 'FLOW_UNAVAILABLE'
  | 'NEWS_NOT_CONFIGURED'
  | 'NEWS_REJECTED'
  | 'NEWS_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN'
  | (string & {})

/**
 * 오류를 낸 곳
 *   network     서버에 닿지 못했다 — 사용자 연결 · 시간 초과
 *   vercel      Vercel 이 직접 냈다(x-vercel-error) — 프록시 대상에 못 닿음 · 함수 오류. Vercel Runtime Logs
 *   hub-web     허브 Vercel 함수 · middleware(/api/auth, 세션 검사). Vercel Runtime Logs 의 JSON 줄
 *   hub-server  허브 서버(service-hub-server). 그 서버 로그
 *   app         화면 코드가 직접 던졌다
 */
export type ErrorSource = 'network' | 'vercel' | 'hub-web' | 'hub-server' | 'app'

export class ApiError extends Error {
  readonly name = 'ApiError'

  constructor(
    /** HTTP 상태. 서버에 닿지 못했으면 0 */
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    /** 입력값 오류(400)에서 걸린 칸 이름 */
    readonly field?: string,
    /** 서버가 준 본문 그대로 (로그 · 디버깅용) */
    readonly data?: unknown,
    readonly from: ErrorSource = 'app',
    /** Vercel 이 붙인 x-vercel-id — 보조 진단값. Vercel Logs 검색은 요청 번호(#id · rid)로 한다 */
    readonly vercelId?: string,
  ) {
    super(message)
  }

  /** 'title: 제목을 입력해 주세요.' → '제목을 입력해 주세요.' — 칸 아래에 보여줄 문구 */
  get fieldMessage() {
    return this.field ? this.message.replace(new RegExp(`^${this.field}:\\s*`), '') : this.message
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError

interface ServerError {
  code?: string
  status?: number
  message?: string
  field?: string
  /** middleware 가 준 401 에만 있다 — source: 'hub-web', reason: none · expired · invalid */
  source?: string
}

const STATUS_CODE: Partial<Record<number, ApiErrorCode>> = { 401: 'UNAUTHORIZED', 403: 'ACCESS_DENIED' }

/** axios 오류 → ApiError */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error
  if (!isAxiosError<unknown>(error)) {
    return new ApiError(0, 'UNKNOWN', error instanceof Error ? error.message : String(error))
  }
  if (!error.response) {
    const timeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
    return new ApiError(0, timeout ? 'TIMEOUT' : 'NETWORK_ERROR', timeout ? '서버 응답이 늦어 요청을 멈췄습니다.' : '서버에 연결하지 못했습니다.', undefined, undefined, 'network')
  }
  const { status, data, headers } = error.response
  // Vercel · 프록시가 직접 준 오류처럼 본문이 JSON 이 아닐 수 있다
  const body: ServerError = data && typeof data === 'object' ? data : {}
  const text = typeof data === 'string' && data.length < 200 ? data : undefined
  return new ApiError(
    status,
    body.code ?? STATUS_CODE[status] ?? 'UNKNOWN',
    body.message ?? text ?? `요청을 처리하지 못했습니다. (${status})`,
    body.field,
    data,
    sourceOf(headers, body, error.config?.baseURL),
    header(headers, 'x-vercel-id'),
  )
}

const header = (headers: unknown, name: string) => {
  const v = (headers as Record<string, unknown> | undefined)?.[name]
  return typeof v === 'string' ? v : undefined
}

function sourceOf(headers: unknown, body: ServerError, baseURL: string | undefined): ErrorSource {
  if (header(headers, 'x-vercel-error')) return 'vercel'
  if (body.source === 'hub-web' || baseURL === '/api/auth') return 'hub-web'
  return 'hub-server'
}
