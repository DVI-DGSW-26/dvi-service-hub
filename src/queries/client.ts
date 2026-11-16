// TanStack Query 기본 설정 — 캐시 · 다시 받기 · 재시도 규칙.

import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '../api/errors'

/**
 * 다시 해 볼 만한 실패만 한 번 더 — 연결 끊김 · 시간 초과 · 502/504.
 * 4xx(권한 · 입력값)와 503(설정 빠짐 · 플로우 호출 한도)은 다시 불러도 같거나 더 나빠진다.
 */
function shouldRetry(failureCount: number, error: unknown) {
  if (failureCount >= 1) return false
  if (!isApiError(error)) return false
  return error.status === 0 || error.status === 502 || error.status === 504
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 같은 데이터를 여러 패널이 불러도(히어로 요약 + 일정 패널 등) 이 시간 안에는 다시 받지 않는다
      staleTime: 60_000,
      retry: shouldRetry,
    },
    mutations: {
      retry: false,
    },
  },
})
