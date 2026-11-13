import { interpolate, type Lang, type Messages } from '../i18n'

// 날짜 · 시각 표기. 말마다 순서 · 요일 · 오전/오후가 달라서 Intl 로 만들고, 짧은 표기만 직접 짠다.

const LOCALE: Record<Lang, string> = { ko: 'ko-KR', en: 'en-US' }

const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const weekday = (date: Date, lang: Lang) => new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'short' }).format(date)

/** 2026-11-13 → ko 11.13 (금) · en Nov 13 (Fri) */
export function shortDate(iso: string, lang: Lang) {
  const date = parse(iso)
  if (lang === 'ko') return `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, '0')} (${weekday(date, lang)})`
  return `${new Intl.DateTimeFormat(LOCALE[lang], { month: 'short', day: 'numeric' }).format(date)} (${weekday(date, lang)})`
}

/** 2026-11-13 → ko 2026.11.13 · en Nov 13, 2026 */
export function formatDate(iso: string, lang: Lang) {
  if (lang === 'ko') return iso.replaceAll('-', '.')
  return new Intl.DateTimeFormat(LOCALE[lang], { dateStyle: 'medium' }).format(parse(iso))
}

/** 오늘 → ko 2026년 11월 13일 금요일 · en Friday, November 13, 2026 */
export function longToday(now: Date, lang: Lang) {
  return new Intl.DateTimeFormat(LOCALE[lang], { dateStyle: 'full' }).format(now)
}

/** 'HH:mm' → 하루 중 몇 분째 */
export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export const nowMinutes = (now = new Date()) => now.getHours() * 60 + now.getMinutes()

/** 'HH:mm' 이 지금보다 이른가 */
export function isPast(hhmm: string, now = new Date()) {
  return toMinutes(hhmm) <= nowMinutes(now)
}

/** 133 → ko 2시간 13분 · en 2h 13m — 단위 문구는 사전(common.duration)에서 */
export function duration(minutes: number, forms: Messages['common']['duration']) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return interpolate(h === 0 ? forms.m : m === 0 ? forms.h : forms.hm, { h, m })
}

/** 14:00 → ko 오후 2:00 · en 2:00 PM — 24시간제보다 한눈에 읽힌다 */
export function clockTime(hhmm: string, lang: Lang) {
  const [h, m] = hhmm.split(':').map(Number)
  return new Intl.DateTimeFormat(LOCALE[lang], { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, h, m))
}
