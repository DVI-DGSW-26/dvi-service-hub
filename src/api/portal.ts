// 포털 데이터 창구. 화면은 여기 함수만 부른다.
//
// 지금은 src/mocks 의 목업을 약간의 지연과 함께 돌려준다 (로딩 화면 확인용).
// 플로우 · 게시판 연동 API 가 생기면 각 함수 안을 fetch('/api/portal/…') 로 바꾸면 된다.

import { maintenance, news, notices, notifications, quickLinks, schedule, scheduleHistory } from '../mocks/dashboard'
import { accountSecurity } from '../mocks/account'
import { addCalendarEvent, calendarMonth, removeCalendarEvent } from '../mocks/calendar'
import { mockMe, orgChart } from '../mocks/info'
import type { CalendarEventInput, Maintenance, MaintenanceInput, Me, Notice, NoticeInput } from '../types/portal'

// 같은 데이터를 여러 패널이 불러도(히어로 요약 + 일정 패널 등) 요청은 한 번만 간다
const cache = new Map<string, Promise<unknown>>()

// 글을 쓰면 그 데이터를 보던 패널이 다시 받아 간다 (useAsync 의 watch)
const listeners = new Map<string, Set<() => void>>()

export function onChange(key: string, fn: () => void) {
  if (!listeners.has(key)) listeners.set(key, new Set())
  listeners.get(key)!.add(fn)
  return () => void listeners.get(key)!.delete(fn)
}

/** key 의 캐시를 버리고 보던 패널에 알린다. 'calendar' 처럼 달마다 나뉜 캐시(calendar:2026-11)는 통째로 버린다 */
function changed(key: string) {
  for (const k of cache.keys()) if (k === key || k.startsWith(`${key}:`)) cache.delete(k)
  listeners.get(key)?.forEach((fn) => fn())
}

const pad = (n: number) => String(n).padStart(2, '0')
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** '2026-11-16', '02:00', '06:00' → '11.16 (일) 02:00 ~ 06:00' — 목업 일정 문구와 같은 모양 (서버가 만들어 줄 값) */
function whenText({ date, start, end }: MaintenanceInput) {
  const [y, m, d] = date.split('-').map(Number)
  const day = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(new Date(y, m - 1, d))
  const time = start ? ` ${start}${end ? ` ~ ${end}` : ''}` : ''
  return `${m}.${pad(d)} (${day})${time}`
}

function serve<T>(key: string, data: T): Promise<T> {
  if (!cache.has(key)) {
    cache.set(key, new Promise((resolve) => setTimeout(() => resolve(data), 200 + Math.random() * 300)))
  }
  return (cache.get(key) as Promise<T>).then((d) => structuredClone(d))
}

export const portalApi = {
  notices: () => serve('notices', notices),
  /** 날짜가 지난 안내는 뺀다 — 오늘 점검은 하루 동안 남아 있다 */
  maintenance: () => serve('maintenance', maintenance.filter((m) => !m.date || m.date >= todayIso())),
  schedule: () => serve('schedule', schedule),
  /** 오늘 + 지난 2주 일정 (전체 일정 모달) */
  scheduleHistory: () => serve('scheduleHistory', scheduleHistory(14)),
  news: () => serve('news', news),
  quickLinks: () => serve('quickLinks', quickLinks),
  /** 회사 캘린더 — 'YYYY-MM' 달에 걸친 행사 · 생일 */
  calendar: (month: string) => serve(`calendar:${month}`, calendarMonth(month)),
  notifications: () => serve('notifications', notifications),
  /** 조직도 (홈 바로가기 · 사내정보에서 여는 창) */
  orgChart: () => serve('orgChart', orgChart),
  /** 로그인 수단 · 로그인한 기기 (계정 설정 화면) */
  accountSecurity: () => serve('accountSecurity', accountSecurity),

  // 글쓰기 — 지금은 목업 목록 맨 앞에 넣는다. API 가 생기면 POST 로 바꾸고, 권한은 서버가 세션 역할로 다시 확인해야 한다
  // (화면의 버튼 숨김은 안내일 뿐이다 — lib/access.ts)
  /** 점검 · 안내 등록 (admin · 연구개발 · IT개발) */
  createMaintenance: async (input: MaintenanceInput): Promise<Maintenance> => {
    const item: Maintenance = {
      id: `m-${Date.now()}`,
      kind: input.kind,
      title: input.title,
      date: input.date,
      when: whenText(input),
      body: input.body || undefined,
      url: input.url || undefined,
    }
    maintenance.unshift(item)
    changed('maintenance')
    return item
  },
  /** 전사 공지 등록 (admin) */
  createNotice: async (input: NoticeInput): Promise<Notice> => {
    const item: Notice = { id: `n-${Date.now()}`, ...input, body: input.body || undefined, url: input.url || undefined, date: todayIso() }
    notices.unshift(item)
    changed('notices')
    return item
  },
  /** 회사 캘린더 직접 등록 (admin · 행사 관리자) */
  createCalendarEvent: async (input: CalendarEventInput) => {
    addCalendarEvent(input)
    changed('calendar')
  },
  deleteCalendarEvent: async (id: string) => {
    removeCalendarEvent(id)
    changed('calendar')
  },
  /** 점검 · 안내 삭제 (쓸 수 있는 사람과 같다) */
  deleteMaintenance: async (id: string) => {
    const i = maintenance.findIndex((m) => m.id === id)
    if (i >= 0) maintenance.splice(i, 1)
    changed('maintenance')
  },
  /** 전사 공지 삭제 (admin) — 공지는 기간이 없어 지워야 내려간다 */
  deleteNotice: async (id: string) => {
    const i = notices.findIndex((n) => n.id === id)
    if (i >= 0) notices.splice(i, 1)
    changed('notices')
  },
}

/** dev:mock · preview 배포 — 로그인 서버 없이 목업 사용자로 연다 (vite.config.ts 의 mockPortal 이 켠다) */
export const MOCK_AUTH = import.meta.env.VITE_MOCK_AUTH === 'true'

// 다른 목업처럼 조금 늦게 돌려줘 로딩 화면(스켈레톤)을 확인할 수 있게 한다
const devMe = () => (import.meta.env.DEV ? serve('me', mockMe) : Promise.resolve(null))

/**
 * 로그인 정보. 미들웨어가 로그인 안 된 접근을 이미 막지만, 화면이 열린 채
 * 세션이 만료될 수 있어 401 이면 다시 로그인으로 보낸다 (null 반환).
 *
 * 로컬 개발(vite)에는 Edge 함수가 없어 index.html 이 돌아온다. 그때만 목업 사용자를 쓴다.
 */
export async function fetchMe(): Promise<Me | null> {
  if (MOCK_AUTH) return serve('me', mockMe)
  try {
    const r = await fetch('/api/auth/me')
    if (r.status === 401) {
      window.location.href = '/api/auth/login?next=' + encodeURIComponent(location.pathname + location.hash)
      return null
    }
    const isJson = (r.headers.get('content-type') || '').includes('application/json')
    if (!isJson) return devMe()
    return (await r.json()) as Me
  } catch {
    return devMe()
  }
}
