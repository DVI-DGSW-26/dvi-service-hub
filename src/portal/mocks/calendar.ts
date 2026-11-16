// 회사 캘린더 목업 — 행사 · 생일자. 실제 API 가 생기면 src/api/portal.ts 의 calendar 만 바꾼다.

import type { CalendarEvent, CalendarEventInput } from '../types/portal'

/** 그해 그 날짜에만 있는 행사 */
const EVENTS: Omit<CalendarEvent, 'kind'>[] = [
  { id: 'e-2610-ws', title: '하반기 워크숍', date: '2026-10-23', end: '2026-10-24', place: '가평 연수원' },
  { id: 'e-2610-sport', title: '사내 체육대회', date: '2026-10-30', place: '본사 운동장' },
  { id: 'e-2611-seminar', title: '사내 기술 세미나', date: '2026-11-10', place: '본사 대회의실' },
  { id: 'e-2611-health', title: '임직원 건강검진', date: '2026-11-24', end: '2026-11-26', place: '협력 검진센터' },
  { id: 'e-2611-kimjang', title: '김장 나눔 봉사', date: '2026-11-28', place: '지역 복지관' },
  { id: 'e-2612-party', title: '송년회', date: '2026-12-18', place: '본사 구내식당' },
  { id: 'e-2612-off', title: '연말 휴무', date: '2026-12-30', end: '2027-01-01' },
  { id: 'e-2701-start', title: '시무식', date: '2027-01-04', place: '본사 대회의실' },
  { id: 'e-2701-plan', title: '연간 사업 계획 발표', date: '2027-01-15', place: '본사 대회의실' },
]

/** 해마다 같은 날 (MM-DD) */
const ANNUAL: { id: string; title: string; day: string; place?: string }[] = [{ id: 'e-founding', title: '창립 기념일', day: '04-15' }]

const BIRTHDAYS: { name: string; department: string; day: string }[] = [
  { name: '김지현', department: '연구개발팀', day: '01-09' },
  { name: '박서준', department: '생산팀', day: '01-23' },
  { name: '이하은', department: '경영지원팀', day: '02-14' },
  { name: '최민호', department: '품질팀', day: '03-02' },
  { name: '정유나', department: '연구개발팀', day: '03-27' },
  { name: '강도윤', department: '영업팀', day: '04-08' },
  { name: '윤채원', department: '생산팀', day: '05-19' },
  { name: '임건우', department: '연구개발팀', day: '06-11' },
  { name: '한소율', department: '경영지원팀', day: '07-04' },
  { name: '오준혁', department: '품질팀', day: '07-30' },
  { name: '서예린', department: '영업팀', day: '08-17' },
  { name: '신동하', department: '생산팀', day: '09-05' },
  { name: '권나윤', department: '연구개발팀', day: '09-22' },
  { name: '황시우', department: '경영지원팀', day: '10-13' },
  { name: '조아라', department: '품질팀', day: '11-03' },
  { name: '배현우', department: '연구개발팀', day: '11-18' },
  { name: '송지아', department: '생산팀', day: '11-18' },
  { name: '전태민', department: '영업팀', day: '11-27' },
  { name: '문하린', department: '경영지원팀', day: '12-08' },
  { name: '유재윤', department: '연구개발팀', day: '12-21' },
]

/** 'YYYY-MM' 달에 걸친 행사 · 생일. 날짜순 */
export function calendarMonth(month: string): CalendarEvent[] {
  const year = month.slice(0, 4)
  const mm = month.slice(5, 7)
  const last = `${month}-31`
  const first = `${month}-01`
  const events: CalendarEvent[] = [
    ...EVENTS.filter((e) => e.date <= last && (e.end ?? e.date) >= first).map((e) => ({ ...e, kind: 'event' as const })),
    ...ANNUAL.filter((e) => e.day.startsWith(mm)).map((e) => ({ id: `${e.id}-${year}`, kind: 'event' as const, title: e.title, date: `${year}-${e.day}`, place: e.place })),
    ...BIRTHDAYS.filter((b) => b.day.startsWith(mm)).map((b) => ({
      id: `b-${year}-${b.day}-${b.name}`,
      kind: 'birthday' as const,
      title: b.name,
      date: `${year}-${b.day}`,
      department: b.department,
    })),
  ]
  // 같은 날이면 행사(event)를 생일(birthday)보다 먼저
  return events.sort((a, b) => a.date.localeCompare(b.date) || b.kind.localeCompare(a.kind))
}

/** 직접 등록 — 행사는 그날(부터 끝나는 날까지), 생일은 해마다 */
export function addCalendarEvent(input: CalendarEventInput) {
  if (input.kind === 'birthday') {
    BIRTHDAYS.push({ name: input.title, department: input.department ?? '', day: input.date.slice(5) })
  } else {
    EVENTS.push({ id: `e-${Date.now()}`, title: input.title, date: input.date, end: input.end, place: input.place })
  }
}

/** 삭제. 생일 · 해마다 행사는 id 에 붙은 해를 떼고 찾는다 (b-2026-11-18-이름, e-founding-2026) */
export function removeCalendarEvent(id: string) {
  const drop = <T,>(list: T[], hit: (x: T) => boolean) => {
    const i = list.findIndex(hit)
    if (i >= 0) list.splice(i, 1)
  }
  if (id.startsWith('b-')) drop(BIRTHDAYS, (b) => id === `b-${id.slice(2, 6)}-${b.day}-${b.name}`)
  else if (EVENTS.some((e) => e.id === id)) drop(EVENTS, (e) => e.id === id)
  else drop(ANNUAL, (e) => id.startsWith(`${e.id}-`))
}
