// 허브 서버의 기존 API 훅.

import { queryOptions } from '@tanstack/react-query'
import { fetchServices } from './hub'

export const serviceQueries = {
  /** 서버의 서비스 목록 (GET /services). 실패하면 호출부가 내장 목록(services.ts)으로 돌아간다 */
  list: () =>
    queryOptions({
      queryKey: ['services'],
      queryFn: ({ signal }) => fetchServices({ signal }),
      staleTime: 5 * 60_000,
    }),
}
