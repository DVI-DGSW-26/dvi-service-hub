import { LOCALE, interpolate, useI18n, type Lang, type Messages } from '../i18n'
import { dtf, fromIso } from './calendar'

// 날짜 · 시각 표기. 말마다 순서 · 요일 · 오전/오후가 달라서 Intl 로 만들고, 짧은 표기만 직접 짠다.

const weekday = (date: Date, lang: Lang) => dtf(LOCALE[lang], { weekday: 'short' }).format(date)

/** 2026-11-13 → ko 11.13 (금) · en Nov 13 (Fri) */
export function shortDate(iso: string, lang: Lang) {
  return `${monthDay(iso, lang)} (${weekday(fromIso(iso), lang)})`
}

/** 2026-11-13 → ko 2026.11.13 · en Nov 13, 2026 */
export function formatDate(iso: string, lang: Lang) {
  if (lang === 'ko') return iso.replaceAll('-', '.')
  return dtf(LOCALE[lang], { dateStyle: 'medium' }).format(fromIso(iso))
}

/** 2026-09-30 + 08:31 → ko 2026년 9월 30일 오전 8:31 · en September 30, 2026 at 8:31 AM. 시각이 없으면 날짜만 */
export function dateTime(iso: string, hhmm: string | undefined, lang: Lang) {
  const date = fromIso(iso)
  if (!hhmm) return dtf(LOCALE[lang], { dateStyle: 'long' }).format(date)
  const [h, m] = hhmm.split(':').map(Number)
  date.setHours(h, m)
  return dtf(LOCALE[lang], { dateStyle: 'long', timeStyle: 'short' }).format(date)
}

/** 오늘 → ko 2026년 11월 13일 금요일 · en Friday, November 13, 2026 */
export function longToday(now: Date, lang: Lang) {
  return dtf(LOCALE[lang], { dateStyle: 'full' }).format(now)
}

/** 'HH:mm' → 하루 중 몇 분째 */
export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export const nowMinutes = (now = new Date()) => now.getHours() * 60 + now.getMinutes()

/** 133 → ko 2시간 13분 · en 2h 13m — 단위 문구는 사전(common.duration)에서 */
export function duration(minutes: number, forms: Messages['common']['duration']) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return interpolate(h === 0 ? forms.m : m === 0 ? forms.h : forms.hm, { h, m })
}

/** 14:00 → ko 오후 2:00 · en 2:00 PM — 24시간제보다 한눈에 읽힌다 */
export function clockTime(hhmm: string, lang: Lang) {
  const [h, m] = hhmm.split(':').map(Number)
  return dtf(LOCALE[lang], { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, h, m))
}

/**
 * 날짜 + 시각 범위 → ko 11.22 (일) 02:00 ~ 06:00 · en Nov 22 (Sun) 02:00 ~ 06:00.
 * 서버는 날짜 · 시각을 따로 주고 문구는 만들지 않는다(명세 1.3). 시각이 없으면 날짜만, 끝이 없으면 시작만.
 */
export function dateTimeRange(iso: string, start: string | undefined, end: string | undefined, lang: Lang) {
  const time = start ? ` ${start}${end ? ` ~ ${end}` : ''}` : ''
  return `${shortDate(iso, lang)}${time}`
}

/** 2026-11-18 → ko 11.18 · en Nov 18 — 좁은 칸에 쓰는 요일 없는 날짜 */
export function monthDay(iso: string, lang: Lang) {
  const date = fromIso(iso)
  if (lang === 'ko') return `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, '0')}`
  return dtf(LOCALE[lang], { month: 'short', day: 'numeric' }).format(date)
}

/**
 * 바깥 서버(플로우 · 행사 아카이브)는 제목 없이 줄 수 있다 — 빈 문자열로 온다 (명세 4.1 · 6.1).
 * 화면에 빈 줄이 생기지 않게 '(제목 없음)' 으로.
 */
export function useTitle() {
  const { t } = useI18n()
  return (title: string) => title.trim() || t.common.untitled
}
