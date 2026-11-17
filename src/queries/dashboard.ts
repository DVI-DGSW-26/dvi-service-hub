// 대시보드 데이터 훅 — 화면은 이 파일만 쓴다.
//
//   const { data, isPending, isError } = useQuery(noticeQueries.list())
//   const create = useCreateNotice()  →  await create.mutateAsync(input)
//
// 열쇠(queryKey)는 *Keys 에 모아 둔다. 글을 쓰거나 지우면 그 열쇠를 무효로 돌려 보던 패널이 다시 받는다.

import { infiniteQueryOptions, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { calendarApi, maintenanceApi, newsApi, noticesApi, scheduleApi } from '../api/dashboard'
import { isApiError } from '../api/errors'
import { addDays } from '../lib/calendar'
import type { MaintenanceInput, NoticeInput } from '../types/portal'

/** 오늘의 일정 창에서 넘겨 보는 지난 날 수 (오늘 포함 15일 — 서버 한도 31일) */
export const SCHEDULE_PAST_DAYS = 14
/** 사내 소식 한 쪽 크기 (사내정보 3열 두 줄) */
export const NEWS_PAGE = 6

// 플로우 · 행사 아카이브는 서버가 5 · 10분 기억한다 — 그보다 자주 받아도 같은 값이다
const FLOW_STALE = 5 * 60_000

export const dashboardKeys = {
  notices: ['notices'] as const,
  maintenance: ['maintenance'] as const,
  schedule: (from: string, to: string) => ['schedule', from, to] as const,
  calendar: (month: string) => ['calendar', month] as const,
  news: ['news'] as const,
}

export const noticeQueries = {
  list: () => queryOptions({ queryKey: dashboardKeys.notices, queryFn: ({ signal }) => noticesApi.list({ signal }) }),
}

export const maintenanceQueries = {
  list: () => queryOptions({ queryKey: dashboardKeys.maintenance, queryFn: ({ signal }) => maintenanceApi.list({ signal }) }),
}

export const scheduleQueries = {
  /**
   * 오늘과 지난 2주. 날짜 오름차순으로 오므로 마지막 칸이 오늘이다.
   * 오늘 패널 · 히어로 요약 · 전체 일정 창이 같은 요청 하나를 나눠 쓴다.
   */
  recent: (today: string) => {
    const from = addDays(today, -SCHEDULE_PAST_DAYS)
    return queryOptions({
      queryKey: dashboardKeys.schedule(from, today),
      queryFn: ({ signal }) => scheduleApi.range(from, today, { signal }),
      staleTime: FLOW_STALE,
    })
  },
}

export const calendarQueries = {
  /** 'YYYY-MM' 달. 달을 넘겨도 앞서 받은 달은 캐시에서 바로 그린다 */
  month: (month: string) =>
    queryOptions({
      queryKey: dashboardKeys.calendar(month),
      queryFn: ({ signal }) => calendarApi.month(month, { signal }),
      staleTime: FLOW_STALE,
    }),
}

export const newsQueries = {
  /**
   * 소식 쪽 넘기기. 홈은 첫 쪽만, 사내정보는 '더 보기'로 다음 쪽을 이어 받는다 — 같은 캐시다.
   * 그림 주소가 30~60분 뒤 만료되므로 오래 두지 않는다(gcTime).
   */
  pages: () =>
    infiniteQueryOptions({
      queryKey: dashboardKeys.news,
      queryFn: ({ pageParam, signal }) => newsApi.page({ limit: NEWS_PAGE, cursor: pageParam }, { signal }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => last.nextCursor,
      staleTime: FLOW_STALE,
      gcTime: 20 * 60_000,
    }),
}

/** 쓰기 훅 — 성공하든 실패하든(이미 지워진 글 404 등) 목록을 다시 받아 화면을 서버와 맞춘다 */
function useWrite<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>, key: readonly unknown[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}

/** 같은 글을 다른 사람이 먼저(또는 동시에) 지웠으면 404 가 온다 (명세 2.3 · 3.3) — 지우려던 결과는 같으니 성공으로 */
const alreadyGone = (e: unknown) => {
  if (isApiError(e) && e.status === 404) return
  throw e
}

export const useCreateNotice = () => useWrite((input: NoticeInput) => noticesApi.create(input), dashboardKeys.notices)
export const useDeleteNotice = () => useWrite((id: string) => noticesApi.remove(id).catch(alreadyGone), dashboardKeys.notices)
export const useCreateMaintenance = () => useWrite((input: MaintenanceInput) => maintenanceApi.create(input), dashboardKeys.maintenance)
export const useDeleteMaintenance = () => useWrite((id: string) => maintenanceApi.remove(id).catch(alreadyGone), dashboardKeys.maintenance)
