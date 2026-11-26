// 로그인 사용자 · 계정 설정 데이터 훅.

import { queryOptions } from '@tanstack/react-query'
import { accountApi } from './account'
import { fetchMe } from './auth'

export const accountQueries = {
  /**
   * /api/auth/me — 받으면 앱을 여는 동안 한 번. 세션이 끝나면 fetchMe 가 로그인으로 보낸다.
   * 연결이 끊겨 못 받았으면(null) 다시 보거나 연결이 돌아올 때 또 묻는다 — 이름 · 관리자 버튼이 빠진 채 남지 않게
   */
  me: () =>
    queryOptions({
      queryKey: ['auth', 'me'],
      queryFn: ({ signal }) => fetchMe({ signal }),
      staleTime: (q) => (q.state.data ? Infinity : 0),
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
