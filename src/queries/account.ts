// 로그인 사용자 · 계정 설정 데이터 훅.

import { queryOptions } from '@tanstack/react-query'
import { fetchMe } from '../api/auth'
import { accountSecurity } from '../mocks/account'

export const accountQueries = {
  /** /api/auth/me — 앱을 여는 동안 한 번. 세션이 끝나면 fetchMe 가 로그인으로 보낸다 */
  me: () =>
    queryOptions({
      queryKey: ['auth', 'me'],
      queryFn: ({ signal }) => fetchMe({ signal }),
      staleTime: Infinity,
      retry: false,
    }),

  /** 로그인 수단 · 기기 — Keycloak 계정 API(/account/credentials, /account/sessions) 연동 전까지 목업 */
  security: () =>
    queryOptions({
      queryKey: ['account', 'security'],
      queryFn: async () => structuredClone(accountSecurity),
      staleTime: Infinity,
    }),
}
