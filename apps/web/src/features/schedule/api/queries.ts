// 오늘의 일정 · 회사 캘린더 데이터 훅

import { queryOptions } from '@tanstack/react-query'
import { calendarApi, scheduleApi } from './schedule'
import { FLOW_STALE } from '@/shared/constants'
import { addDays } from '@/shared/lib'

/** 오늘의 일정 창에서 넘겨 보는 지난 날 수 (오늘 포함 15일 — 서버 한도 31일) */
export const SCHEDULE_PAST_DAYS = 14

const scheduleKeys = {
  range: (from: string, to: string) => ['schedule', from, to] as const,
  month: (month: string) => ['calendar', month] as const,
}

export const scheduleQueries = {
  /**
   * 오늘과 지난 2주. 날짜 오름차순으로 오므로 마지막 칸이 오늘이다.
   * 오늘 패널 · 히어로 요약 · 전체 일정 창이 같은 요청 하나를 나눠 쓴다.
   */
  recent: (today: string) => {
    const from = addDays(today, -SCHEDULE_PAST_DAYS)
    return queryOptions({
      queryKey: scheduleKeys.range(from, today),
      queryFn: ({ signal }) => scheduleApi.range(from, today, { signal }),
      staleTime: FLOW_STALE,
    })
  },
}

export const calendarQueries = {
  /** 'YYYY-MM' 달. 달을 넘겨도 앞서 받은 달은 캐시에서 바로 그린다 */
  month: (month: string) =>
    queryOptions({
      queryKey: scheduleKeys.month(month),
      queryFn: ({ signal }) => calendarApi.month(month, { signal }),
      staleTime: FLOW_STALE,
    }),
}
