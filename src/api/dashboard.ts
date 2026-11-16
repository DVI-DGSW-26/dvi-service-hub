// 포털 대시보드 API (명세 v0.5) — 전사 공지 · 시스템 점검 · 오늘의 일정 · 회사 캘린더 · 사내 소식.
// 화면은 이 함수를 직접 부르지 않고 queries/dashboard.ts 의 훅을 쓴다(캐시 · 다시 받기를 TanStack Query 가 맡는다).
//
// signal 은 TanStack Query 가 넘겨 준다 — 화면을 떠나면 받던 요청을 끊는다.

import type { CalendarEvent, Maintenance, MaintenanceInput, NewsPage, Notice, NoticeInput, ScheduleDay } from '../types/portal'
import { hubApi, seg } from './http'

type Opts = { signal?: AbortSignal }

/** 전사 공지 — 최신순. 권한: 조회 employee · 등록 · 삭제 service-hub 의 notice:write 또는 admin */
export const noticesApi = {
  list: ({ signal }: Opts = {}) => hubApi.get<Notice[]>('/notices', { signal }),
  create: (input: NoticeInput) => hubApi.post<Notice>('/notices', input),
  remove: (id: string) => hubApi.delete(`/notices/${seg(id)}`),
}

/** 시스템 점검 · 안내 — 점검 당일까지, 날짜 · 시작 시각 오름차순. 등록 · 삭제는 maintenance:write 또는 admin */
export const maintenanceApi = {
  list: ({ signal }: Opts = {}) => hubApi.get<Maintenance[]>('/maintenance', { signal }),
  create: (input: MaintenanceInput) => hubApi.post<Maintenance>('/maintenance', input),
  remove: (id: string) => hubApi.delete(`/maintenance/${seg(id)}`),
}

/** 오늘의 일정 — from ~ to(YYYY-MM-DD, 양 끝 포함 31일 이하)의 날짜마다 하루치. 빈 날도 온다 */
export const scheduleApi = {
  range: (from: string, to: string, { signal }: Opts = {}) => hubApi.get<ScheduleDay[]>('/schedule', { params: { from, to }, signal }),
}

/** 회사 캘린더 — 'YYYY-MM' 달에 걸친 일정, 한 건당 한 줄. 조회만 */
export const calendarApi = {
  month: (month: string, { signal }: Opts = {}) => hubApi.get<CalendarEvent[]>('/calendar', { params: { month }, signal }),
}

/** 사내 주요 소식 — 최신순. cursor 는 앞 응답의 nextCursor 를 그대로 */
export const newsApi = {
  page: ({ limit = 6, cursor }: { limit?: number; cursor?: string } = {}, { signal }: Opts = {}) =>
    hubApi.get<NewsPage>('/news', { params: { limit, cursor }, signal }),
}
