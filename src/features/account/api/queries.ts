// 로그인 사용자 · 계정 설정 데이터 훅.

import { queryOptions } from '@tanstack/react-query'
import { accountApi } from './account'
import { fetchMe } from './auth'

export const accountQueries = {
  /** /api/auth/me — 앱을 여는 동안 한 번. 세션이 끝나면 fetchMe 가 로그인으로 보낸다 */
  me: () =>
    queryOptions({
      queryKey: ['auth', 'me'],
      queryFn: ({ signal }) => fetchMe({ signal }),
      staleTime: Infinity,
      retry: false,
    }),

  /** 내 로그인 수단. 서버에 API 가 아직 없어 운영에서는 404 — 화면은 목록 없이 변경 · 등록만 보여준다 */
  credentials: () =>
    queryOptions({
      queryKey: ['account', 'credentials'],
      queryFn: ({ signal }) => accountApi.credentials({ signal }),
      retry: false,
    }),
}
