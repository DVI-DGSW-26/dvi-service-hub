// 오늘의 일정 · 회사 캘린더 API (포털 대시보드 명세 v0.5)
// signal 은 TanStack Query 가 넘겨 준다 — 화면을 떠나면 받던 요청을 끊는다. 화면은 이 함수를 직접 부르지 않고 같은 폴더 queries.ts 를 쓴다

import type { CalendarEvent, ScheduleDay } from '@dvi/core/types'
import { hubApi } from '@/shared/api'

interface Opts { signal?: AbortSignal }

/** 오늘의 일정 — from ~ to(YYYY-MM-DD, 양 끝 포함 31일 이하)의 날짜마다 하루치. 빈 날도 온다 */
export const scheduleApi = {
  range: (from: string, to: string, { signal }: Opts = {}) => hubApi.get<ScheduleDay[]>('/schedule', { params: { from, to }, signal }),
}

/** 회사 캘린더 — 'YYYY-MM' 달에 걸친 일정, 한 건당 한 줄. 조회만 */
export const calendarApi = {
  month: (month: string, { signal }: Opts = {}) => hubApi.get<CalendarEvent[]>('/calendar', { params: { month }, signal }),
}
