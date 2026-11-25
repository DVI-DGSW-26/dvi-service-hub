// 플로우 공유방 글 데이터 훅

import { queryOptions } from '@tanstack/react-query'
import { flowApi } from './flow'
import { FLOW_STALE } from '@/shared/constants'

/** 위젯에 받는 글 수 — 큰 칸에 들어가는 만큼. 더 보려면 플로우에서 연다 */
export const FLOW_PAGE = 8

export const flowQueries = {
  posts: () =>
    queryOptions({
      queryKey: ['flow', 'posts'] as const,
      queryFn: ({ signal }) => flowApi.posts(0, FLOW_PAGE, { signal }),
      staleTime: FLOW_STALE,
    }),
}
