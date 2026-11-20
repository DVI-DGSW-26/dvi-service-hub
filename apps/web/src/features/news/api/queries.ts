// 사내 주요 소식 데이터 훅

import { infiniteQueryOptions } from '@tanstack/react-query'
import { newsApi } from './news'
import { FLOW_STALE } from '@/shared/constants'

/** 사내 소식 한 쪽 크기 (사내정보 3열 두 줄) */
export const NEWS_PAGE = 6

export const newsQueries = {
  /**
   * 소식 쪽 넘기기. 홈은 첫 쪽만, 사내정보는 '더 보기'로 다음 쪽을 이어 받는다 — 같은 캐시다.
   * 그림 주소가 30~60분 뒤 만료되므로 오래 두지 않는다(gcTime).
   */
  pages: () =>
    infiniteQueryOptions({
      queryKey: ['news'] as const,
      queryFn: ({ pageParam, signal }) => newsApi.page({ limit: NEWS_PAGE, cursor: pageParam }, { signal }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => last.nextCursor,
      staleTime: FLOW_STALE,
      gcTime: 20 * 60_000,
    }),
}
