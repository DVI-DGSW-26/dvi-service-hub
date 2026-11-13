const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 2026-11-13 → 11.13 (금) */
export function shortDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const day = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  return `${m}.${String(d).padStart(2, '0')} (${day})`
}

/** 2026-11-13 → 2026.11.13 */
export function dotDate(iso: string) {
  return iso.replaceAll('-', '.')
}

/** 오늘 → 2026년 11월 13일 금요일 */
export function longToday(now = new Date()) {
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEKDAYS[now.getDay()]}요일`
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

/** 14:00 → 오후 2:00 — 24시간제보다 한눈에 읽힌다 */
export function koreanTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const half = h < 12 ? '오전' : '오후'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${half} ${h12}:${String(m).padStart(2, '0')}`
}

/** 133 → 2시간 13분 */
export function duration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}분`
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}
