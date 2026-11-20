// pnpm dev:mock — 서버 없이 화면을 띄운다.
//
// axios 의 adapter(실제로 요청을 보내는 자리)만 바꿔 끼운다. 인터셉터 · 로그 · ApiError · TanStack Query 는
// 실제와 똑같이 돈다 — 콘솔의 [api] 로그와 Query Devtools 로 그대로 들여다볼 수 있다.
// main.tsx 가 mock 모드에서만 불러오므로 운영 빌드에는 들어가지 않는다.
//
// 상황 바꾸기 — 주소에 ?mock= 을 붙인다 (쉼표로 여러 개):
//   empty      목록이 모두 비었다
//   error      조회가 실패한다 (일정 · 캘린더 502 FLOW_UNAVAILABLE, 소식 502 NEWS_UNAVAILABLE, 공지 · 점검 500)
//   forbidden  조회가 403 이다 (재직자가 아닌 사람)
//   slow       응답이 2.5초 걸린다
//   readonly   쓰기 롤이 없는 사람 — 공지 · 점검 작성 버튼이 안 보인다
//   예) http://localhost:5173/?mock=slow,empty#/

import { AxiosError, AxiosHeaders, CanceledError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { auth, hub, apiLog } from '@/shared/api'
import { services } from '@/features/systems'
import type { CalendarEvent, Maintenance, MaintenanceInput, MaintenanceKind, NewsPage, Notice, NoticeInput, ScheduleDay, ScheduleItem } from '@/shared/types'
import { addDays, fromIso } from '@/shared/lib'
import { flowEvents, seedCredentials, seedMaintenance, seedNews, seedNotices, today, type FlowEvent } from './data'
import { mockMe } from './info'

type Scenario = 'empty' | 'error' | 'forbidden' | 'slow' | 'readonly'
const scenarios = new Set((new URLSearchParams(location.search).get('mock') ?? '').split(',').filter(Boolean) as Scenario[])

// 새로 고침하면 처음 상태로 돌아간다
const db = { notices: seedNotices(), maintenance: seedMaintenance(), news: seedNews(), credentials: seedCredentials(), nextId: 200 }

// ---------------------------------------------------------------- 응답 · 오류

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly field?: string,
  ) {
    super(message)
  }
}

const ok = <T>(data: T, message = '성공', status = 200) => ({ status, body: { status, message, data } })
const done = (message: string) => ({ status: 200, body: { status: 200, message } })
const bad = (field: string, message: string) => new HttpError(400, 'METHOD_ARGUMENT_NOT_VALID', `${field}: ${message}`, field)

// ---------------------------------------------------------------- 입력 검사 (명세 1.4 · 2.2 · 3.2)

const blank = (s: unknown) => typeof s !== 'string' || s.trim() === ''
const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const validDate = (s: string) => DATE.test(s) && addDays(s, 0) === s

/** 앞뒤 공백을 지우고 비면 없는 것. 있으면 http(s):// 로 시작 · 500자 이하 */
function cleanUrl(url: unknown): string | undefined {
  if (url == null) return undefined
  const u = String(url).trim()
  if (!u) return undefined
  if (!/^https?:\/\//.test(u)) throw bad('url', '주소는 http:// 또는 https:// 로 시작해야 합니다.')
  if (u.length > 500) throw bad('url', '주소는 500자 이하로 입력해 주세요.')
  return u
}

function requireText(input: Record<string, unknown>, field: string, label: string, max: number, trim = true) {
  const v = input[field]
  if (blank(v)) throw bad(field, `${label}을(를) 입력해 주세요.`)
  const s = trim ? String(v).trim() : String(v)
  if (s.length > max) throw bad(field, `${label}은(는) ${max.toLocaleString()}자 이하로 입력해 주세요.`)
  return s
}

function createNotice(input: Partial<NoticeInput>): Notice {
  const i = input as Record<string, unknown>
  const notice: Notice = {
    id: String(db.nextId++),
    title: requireText(i, 'title', '제목', 100),
    summary: requireText(i, 'summary', '요약', 150),
    body: requireText(i, 'body', '본문', 5000, false),
    date: today(),
    important: input.important === true,
  }
  const url = cleanUrl(input.url)
  if (url) notice.url = url
  return notice
}

const KINDS: MaintenanceKind[] = ['MAINTENANCE', 'NOTICE', 'INCIDENT']

function createMaintenance(input: Partial<MaintenanceInput>): Maintenance {
  const i = input as Record<string, unknown>
  // 형식 → 칸 검사 → 시각 → 서비스 순 (명세 1.4)
  if (input.kind == null) throw bad('kind', '종류를 골라 주세요.')
  if (!KINDS.includes(input.kind)) throw new HttpError(400, 'HTTP_MESSAGE_NOT_READABLE', '요청 본문을 읽을 수 없습니다.')
  if (input.date == null) throw bad('date', '날짜를 입력해 주세요.')
  if (!validDate(input.date)) throw new HttpError(400, 'HTTP_MESSAGE_NOT_READABLE', '요청 본문을 읽을 수 없습니다.')
  const start = input.start || undefined
  const end = input.end || undefined
  if ((start && !TIME.test(start)) || (end && !TIME.test(end))) throw new HttpError(400, 'HTTP_MESSAGE_NOT_READABLE', '요청 본문을 읽을 수 없습니다.')

  const title = requireText(i, 'title', '제목', 100)
  const body = requireText(i, 'body', '내용', 2000, false)
  const serviceId = blank(input.serviceId) ? undefined : input.serviceId!
  const url = serviceId ? undefined : cleanUrl(input.url)

  if (end && !start) throw new HttpError(400, 'MAINTENANCE_TIME_INVALID', '종료 시각만 입력할 수 없습니다.', 'start')
  if (start && end && end < start) throw new HttpError(400, 'MAINTENANCE_TIME_INVALID', '종료 시각이 시작 시각보다 빠릅니다.', 'end')

  const service = serviceId ? services.find((s) => s.id === serviceId) : undefined
  if (serviceId && !service) throw new HttpError(400, 'MAINTENANCE_SERVICE_UNKNOWN', '서비스 목록에 없는 시스템입니다.', 'serviceId')

  const m: Maintenance = { id: String(db.nextId++), kind: input.kind, title, date: input.date, body }
  if (service) Object.assign(m, { serviceId: service.id, url: service.links[0]?.url })
  else if (url) m.url = url
  if (start) m.start = start
  if (end) m.end = end
  return m
}

// ---------------------------------------------------------------- 일정 · 캘린더 (명세 4.2 · 5.1)

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

function scheduleRange(from: string, to: string): ScheduleDay[] {
  const events = flowEvents(from, to)
  const days: ScheduleDay[] = []
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const items: ScheduleItem[] = events
      .filter((e) => e.startDate <= date && date <= e.endDate)
      .map((e) => toScheduleItem(e))
      .sort((a, b) => Number(b.allDay) - Number(a.allDay) || (a.allDay ? 0 : byText(a.start!, b.start!)) || byText(a.title, b.title) || byText(a.id, b.id))
    days.push({ date, items })
  }
  return days
}

function toScheduleItem(e: FlowEvent): ScheduleItem {
  const multi = e.startDate !== e.endDate
  const item: ScheduleItem = { id: e.id, title: e.title, allDay: e.allDay || multi }
  if (multi) Object.assign(item, { startDate: e.startDate, endDate: e.endDate })
  else if (!e.allDay) Object.assign(item, { start: e.start, end: e.end })
  if (e.color) item.color = e.color
  return item
}

function calendarMonth(month: string): CalendarEvent[] {
  const first = `${month}-01`
  const next = fromIso(first)
  next.setMonth(next.getMonth() + 1, 0)
  const last = `${month}-${String(next.getDate()).padStart(2, '0')}`
  return flowEvents(first, last)
    .map((e) => {
      const row: CalendarEvent = { id: e.id, kind: 'event', title: e.title, date: e.startDate, source: 'flow' }
      if (e.endDate !== e.startDate) row.end = e.endDate
      if (e.color) row.color = e.color
      return row
    })
    .sort((a, b) => byText(a.date, b.date) || byText(a.title, b.title) || byText(a.id, b.id))
}

// ---------------------------------------------------------------- 길 찾기

type Params = Record<string, string | number | undefined>
interface Result { status: number; body: unknown }

function hubRoute(method: string, path: string, params: Params, input: Record<string, unknown>): Result {
  const read = method === 'get'
  const dashboard = /^\/(notices|maintenance|schedule|calendar|news)/.test(path)
  if (read && dashboard && scenarios.has('forbidden')) throw new HttpError(403, 'ACCESS_DENIED', '접근 권한이 없습니다.')
  if (read && dashboard && scenarios.has('error')) {
    if (/^\/(schedule|calendar)/.test(path)) throw new HttpError(502, 'FLOW_UNAVAILABLE', '플로우에 연결하지 못했습니다.')
    if (path.startsWith('/news')) throw new HttpError(502, 'NEWS_UNAVAILABLE', '행사 아카이브에 연결하지 못했습니다.')
    throw new HttpError(500, 'UNKNOWN', '서버 오류가 발생했습니다.')
  }
  const empty = scenarios.has('empty')

  if (method === 'get' && path === '/services') return ok(services, '서비스 목록 조회 성공')

  // 공지
  if (method === 'get' && path === '/notices') {
    const list = [...db.notices].sort((a, b) => byText(b.date, a.date) || Number(b.id) - Number(a.id))
    return ok(empty ? [] : list, '공지 조회 성공')
  }
  if (method === 'post' && path === '/notices') {
    const n = createNotice(input)
    db.notices.push(n)
    return ok(n, '공지 등록 성공', 201)
  }
  let m = /^\/notices\/([^/]+)$/.exec(path)
  if (method === 'delete' && m) {
    const id = decodeURIComponent(m[1])
    if (!/^\d+$/.test(id)) throw new HttpError(400, 'METHOD_ARGUMENT_TYPE_MISMATCH', 'id 형식이 올바르지 않습니다.')
    const i = db.notices.findIndex((n) => n.id === id)
    if (i < 0) throw new HttpError(404, 'NOTICE_NOT_FOUND', '공지를 찾을 수 없습니다.')
    db.notices.splice(i, 1)
    return done('공지 삭제 성공')
  }

  // 점검
  if (method === 'get' && path === '/maintenance') {
    const t = today()
    const list = db.maintenance
      .filter((x) => x.date >= t)
      .sort((a, b) => byText(a.date, b.date) || byText(a.start ?? '', b.start ?? '') || Number(a.id) - Number(b.id))
    return ok(empty ? [] : list, '점검 조회 성공')
  }
  if (method === 'post' && path === '/maintenance') {
    const x = createMaintenance(input)
    db.maintenance.push(x)
    return ok(x, '점검 등록 성공', 201)
  }
  m = /^\/maintenance\/([^/]+)$/.exec(path)
  if (method === 'delete' && m) {
    const id = decodeURIComponent(m[1])
    if (!/^\d+$/.test(id)) throw new HttpError(400, 'METHOD_ARGUMENT_TYPE_MISMATCH', 'id 형식이 올바르지 않습니다.')
    const i = db.maintenance.findIndex((x) => x.id === id)
    if (i < 0) throw new HttpError(404, 'MAINTENANCE_NOT_FOUND', '점검을 찾을 수 없습니다.')
    db.maintenance.splice(i, 1)
    return done('점검 삭제 성공')
  }

  // 일정
  if (method === 'get' && path === '/schedule') {
    const from = String(params.from ?? '')
    const to = String(params.to ?? '')
    if (!from || !to) throw new HttpError(400, 'MISSING_REQUEST_PARAMETER', 'from, to 는 필수입니다.')
    if (!validDate(from) || !validDate(to)) throw new HttpError(400, 'METHOD_ARGUMENT_TYPE_MISMATCH', '날짜 형식이 올바르지 않습니다.')
    if (from > to || addDays(from, 30) < to) throw new HttpError(400, 'INVALID_SCHEDULE_RANGE', '조회 범위는 31일 이하입니다.', 'to')
    const days = scheduleRange(from, to)
    return ok(empty ? days.map((d) => ({ ...d, items: [] })) : days, '일정 조회 성공')
  }

  // 캘린더
  if (method === 'get' && path === '/calendar') {
    const month = String(params.month ?? '')
    if (!month) throw new HttpError(400, 'MISSING_REQUEST_PARAMETER', 'month 는 필수입니다.')
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new HttpError(400, 'INVALID_MONTH', 'month 형식이 올바르지 않습니다.', 'month')
    return ok(empty ? [] : calendarMonth(month), '캘린더 조회 성공')
  }

  // 소식
  if (method === 'get' && path === '/news') {
    const rawLimit = params.limit == null || params.limit === '' ? '6' : String(params.limit)
    const rawCursor = params.cursor == null || params.cursor === '' ? '0' : String(params.cursor)
    const limit = Number(rawLimit)
    if (!/^\d+$/.test(rawLimit) || limit < 1 || limit > 50) throw new HttpError(400, 'INVALID_NEWS_PAGE', 'limit 은 1~50 입니다.', 'limit')
    if (!/^\d{1,9}$/.test(rawCursor)) throw new HttpError(400, 'INVALID_NEWS_PAGE', 'cursor 형식이 올바르지 않습니다.', 'cursor')
    const all = empty ? [] : [...db.news].sort((a, b) => byText(b.date, a.date) || byText(b.id, a.id))
    const at = Number(rawCursor)
    const page: NewsPage = { total: all.length, items: all.slice(at, at + limit) }
    if (at + limit < all.length) page.nextCursor = String(at + limit)
    return ok(page, '소식 조회 성공')
  }

  // 설정 › 로그인 수단 — 서버에 요청 중인 API (docs/bd.md 3.1). 운영에는 아직 없다
  if (method === 'get' && path === '/account/credentials') {
    if (scenarios.has('error')) throw new HttpError(500, 'UNKNOWN', '서버 오류가 발생했습니다.')
    const c = db.credentials
    return ok(empty ? { password: c.password, otp: [], passkeys: [] } : c, '로그인 수단 조회 성공')
  }

  throw new HttpError(404, 'NOT_FOUND', `목업에 없는 API 입니다: ${method.toUpperCase()} ${path}`)
}

function authRoute(method: string, path: string): Result {
  if (method === 'get' && path === '/me') {
    // 로그인 정보는 감싸지 않는다 (Vercel 함수)
    const me = scenarios.has('readonly') ? { ...mockMe, svc: { jagigo: ['user'] } } : mockMe
    return { status: 200, body: me }
  }
  throw new HttpError(404, 'NOT_FOUND', `목업에 없는 API 입니다: ${method.toUpperCase()} /api/auth${path}`)
}

// ---------------------------------------------------------------- adapter

/** 실제 네트워크처럼 조금 기다린다. 기다리는 동안 화면을 떠나면(signal) 끊는다 */
function wait(config: InternalAxiosRequestConfig) {
  const ms = scenarios.has('slow') ? 2500 : 150 + Math.random() * 300
  return new Promise<void>((resolve, reject) => {
    const signal = config.signal as AbortSignal | undefined
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener?.('abort', () => {
      clearTimeout(timer)
      reject(new CanceledError(undefined, undefined, config))
    })
  })
}

function adapterFor(route: (method: string, path: string, params: Params, input: Record<string, unknown>) => Result): AxiosAdapter {
  return async (config) => {
    await wait(config)
    const method = (config.method ?? 'get').toLowerCase()
    const path = new URL(config.url ?? '/', 'http://mock').pathname
    const input = typeof config.data === 'string' && config.data ? JSON.parse(config.data) : {}
    const headers = new AxiosHeaders({ 'content-type': 'application/json' })
    try {
      const { status, body } = route(method, path, (config.params ?? {}) as Params, input)
      return { data: body, status, statusText: 'OK', headers, config, request: {} } satisfies AxiosResponse
    } catch (e) {
      if (!(e instanceof HttpError)) throw e
      const data: Record<string, unknown> = { code: e.code, status: e.status, message: e.message }
      if (e.field) data.field = e.field
      const response: AxiosResponse = { data, status: e.status, statusText: e.code, headers, config, request: {} }
      throw new AxiosError(e.message, AxiosError.ERR_BAD_RESPONSE, config, {}, response)
    }
  }
}

export function installMockApi() {
  hub.defaults.adapter = adapterFor(hubRoute)
  auth.defaults.adapter = adapterFor(authRoute)
  const on = [...scenarios].join(', ') || '기본'
  apiLog.hint(`목업 API 로 엽니다 (상황: ${on}). 주소에 ?mock=empty · error · forbidden · slow · readonly 를 붙여 바꿀 수 있습니다.`)
}
