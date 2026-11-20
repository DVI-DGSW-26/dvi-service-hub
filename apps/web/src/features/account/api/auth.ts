// 로그인 정보 (/api/auth/me — 허브의 Vercel Edge 함수).

import { mockMe } from '@/mocks/info'
import type { Me } from '@/shared/types'
import { isApiError, auth, toLogin, apiLog } from '@/shared/api'

/**
 * 로그인 정보. 미들웨어가 로그인 안 된 접근을 이미 막지만, 화면이 열린 채
 * 세션이 만료될 수 있어 401 이면 다시 로그인으로 보낸다 (null 반환).
 *
 * 로컬 개발(vite)에는 Edge 함수가 없어 index.html 이 돌아온다. 그때만 목업 사용자를 쓴다.
 */
export async function fetchMe({ signal }: { signal?: AbortSignal } = {}): Promise<Me | null> {
  try {
    const res = await auth.get<Me>('/me', { signal })
    const isJson = String(res.headers['content-type'] ?? '').includes('application/json')
    if (isJson) return res.data
  } catch (e) {
    if (isApiError(e) && e.status === 401) {
      toLogin()
      return null
    }
    // 그 밖의 실패는 로그만 남기고(인터셉터) 로그인 정보 없이 연다 — 권한으로 거르는 목록은 모두 보인다
  }
  if (!import.meta.env.DEV) return null
  apiLog.hint('/api/auth/me 가 없어(vite 에는 Edge 함수가 돌지 않는다) 목업 사용자(mocks/info.ts)로 엽니다.')
  return mockMe
}
