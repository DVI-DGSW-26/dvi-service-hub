import type { CalendarEvent } from '@dvi/core/types'

// 회사 캘린더의 달 계산. 주는 일요일부터 시작한다.

/** m 은 0(1월) ~ 11(12월) */
export interface Month {
  y: number
  m: number
}

const formatters = new Map<string, Intl.DateTimeFormat>()

/** Intl.DateTimeFormat 은 만들기가 비싸다 — 달력 한 장에 수십 번 부르므로 (로캘, 옵션)마다 하나만 만든다 */
export function dtf(locale: string, opts: Intl.DateTimeFormatOptions) {
  const key = locale + JSON.stringify(opts)
  let f = formatters.get(key)
  if (!f) formatters.set(key, (f = new Intl.DateTimeFormat(locale, opts)))
  return f
}

export const pad = (n: number) => String(n).padStart(2, '0')

export const monthOf = (d: Date): Month => ({ y: d.getFullYear(), m: d.getMonth() })
export const addMonths = ({ y, m }: Month, n: number) => monthOf(new Date(y, m + n, 1))
/** API · 캐시 열쇠 — 'YYYY-MM' */
export const monthKey = ({ y, m }: Month) => `${y}-${pad(m + 1)}`
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromIso = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (iso: string, n: number) => {
  const d = fromIso(iso)
  d.setDate(d.getDate() + n)
  return toIso(d)
}
export const inMonth = (iso: string, month: Month) => iso.startsWith(monthKey(month))

/** 그 달을 덮는 주들. fixed 면 늘 6주 — 넘겨 볼 때 달마다 높이가 달라지지 않게 */
export function monthWeeks({ y, m }: Month, fixed = false): Date[][] {
  const lead = new Date(y, m, 1).getDay()
  const days = new Date(y, m + 1, 0).getDate()
  const count = fixed ? 6 : Math.ceil((lead + days) / 7)
  return Array.from({ length: count }, (_, w) => Array.from({ length: 7 }, (_, d) => new Date(y, m, 1 - lead + w * 7 + d)))
}

/** 그날에 걸친 행사 · 생일 (여러 날 행사 포함) */
export const eventsOn = (events: CalendarEvent[], iso: string) => events.filter((e) => e.date <= iso && (e.end ?? e.date) >= iso)

/** ko 2026년 11월 · en November 2026 */
export const monthTitle = ({ y, m }: Month, locale: string) =>
  dtf(locale, { year: 'numeric', month: 'long' }).format(new Date(y, m, 1))

/** 일 ~ 토 짧은 요일 이름 */
export const weekdayNames = (locale: string) =>
  // 2023-01-01 은 일요일
  Array.from({ length: 7 }, (_, i) => dtf(locale, { weekday: 'short' }).format(new Date(2023, 0, 1 + i)))
