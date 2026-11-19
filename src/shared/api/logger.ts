// API 호출 로그. axios 인터셉터(http.ts)가 요청 · 응답 · 오류마다 부른다.
//
// 단계 — silent(끔) · error(오류만) · info(한 줄씩) · debug(요청 · 응답 본문까지 펼쳐 보기)
//   기본값: 개발 서버 debug, 운영 빌드 error
//   빌드 때 고정: VITE_API_LOG=info
//   운영 화면에서 잠깐 자세히: 콘솔에 portalApiLog.set('debug') — 이 브라우저에만 남는다(localStorage)

import { KEYS } from '@/shared/lib'
import type { ApiError } from './errors'

type LogLevel = 'silent' | 'error' | 'info' | 'debug'

const RANK: Record<LogLevel, number> = { silent: 0, error: 1, info: 2, debug: 3 }

const isLevel = (v: unknown): v is LogLevel => typeof v === 'string' && v in RANK

function initialLevel(): LogLevel {
  try {
    const saved = localStorage.getItem(KEYS.apiLog)
    if (isLevel(saved)) return saved
  } catch {
    /* 저장소가 막혀 있으면 아래 기본값 */
  }
  const env = import.meta.env.VITE_API_LOG
  if (isLevel(env)) return env
  return import.meta.env.DEV ? 'debug' : 'error'
}

let level = initialLevel()
const on = (l: LogLevel) => RANK[level] >= RANK[l]

/** 로그 한 줄에 쓰는 요청 정보 */
export interface LogEntry {
  id: string
  method: string
  url: string
  params?: unknown
  body?: unknown
  /** 요청을 보낸 뒤 걸린 시간(ms) */
  ms?: number
}

const STYLE = {
  ok: 'color:#16a34a;font-weight:700',
  fail: 'color:#dc2626;font-weight:700',
  method: 'color:#2563eb;font-weight:700',
  dim: 'color:#888',
  reset: '',
}

const label = (e: LogEntry) => `${e.method.toUpperCase()} ${e.url}`
const took = (e: LogEntry) => (e.ms === undefined ? '' : ` ${e.ms}ms`)

export const apiLog = {
  get level() {
    return level
  },

  /** 단계를 바꾼다. remember 면 이 브라우저에 남겨 새로고침 뒤에도 유지 */
  set(next: LogLevel, remember = true) {
    level = next
    try {
      if (remember) localStorage.setItem(KEYS.apiLog, next)
    } catch {
      /* 이번 화면에서만 */
    }
  },

  /** 저장한 단계를 지우고 기본값으로 */
  reset() {
    try {
      localStorage.removeItem(KEYS.apiLog)
    } catch {
      /* 무시 */
    }
    level = initialLevel()
  },

  request(e: LogEntry) {
    if (!on('debug')) return
    console.debug(`%c→ %c${label(e)} %c#${e.id}`, STYLE.dim, STYLE.method, STYLE.dim, ...(e.params || e.body ? [{ params: e.params, body: e.body }] : []))
  },

  response(e: LogEntry, status: number, data: unknown) {
    if (!on('info')) return
    const head = [`%c${status}%c ${label(e)}%c${took(e)} #${e.id}`, STYLE.ok, STYLE.reset, STYLE.dim] as const
    if (!on('debug')) { console.info(...head); return; }
    console.groupCollapsed(...head)
    if (e.params) console.log('params', e.params)
    if (e.body !== undefined) console.log('body', e.body)
    console.log('response', data)
    console.groupEnd()
  },

  error(e: LogEntry, err: ApiError) {
    if (!on('error')) return
    const what = [err.status || 'ERR', label(e), err.code, err.field && `field=${err.field}`].filter(Boolean).join(' ')
    const head = [`%c${what}%c${took(e)} #${e.id} — ${err.message}`, STYLE.fail, STYLE.dim] as const
    if (!on('debug')) { console.error(...head); return; }
    console.groupCollapsed(...head)
    if (e.params) console.log('params', e.params)
    if (e.body !== undefined) console.log('body', e.body)
    console.log('error', { status: err.status, code: err.code, field: err.field, message: err.message, data: err.data })
    console.groupEnd()
  },

  /** 개발 중 안내 (설정 빠짐 등) */
  hint(message: string) {
    if (on('error')) console.warn(`[api] ${message}`)
  },
}

// 운영 화면에서도 콘솔로 단계를 바꿀 수 있게 — portalApiLog.set('debug')
declare global {
  interface Window {
    portalApiLog?: typeof apiLog
  }
}
if (typeof window !== 'undefined') window.portalApiLog = apiLog
