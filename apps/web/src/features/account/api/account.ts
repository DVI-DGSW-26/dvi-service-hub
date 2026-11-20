// 설정 화면의 계정 정보 — 허브 서버에 요청 중인 API (docs/bd.md). 생기기 전에는 404 가 온다.

import type { AccountCredentials } from '@/shared/types'
import { hubApi } from '@/shared/api'

interface Opts { signal?: AbortSignal }

export const accountApi = {
  /** 내 로그인 수단 (비밀번호 · OTP · 패스키) */
  credentials: ({ signal }: Opts = {}) => hubApi.get<AccountCredentials>('/account/credentials', { signal }),
}
