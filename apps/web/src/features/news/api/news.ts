// 사내 주요 소식 API (포털 대시보드 명세 v0.5)
// signal 은 TanStack Query 가 넘겨 준다 — 화면을 떠나면 받던 요청을 끊는다. 화면은 이 함수를 직접 부르지 않고 같은 폴더 queries.ts 를 쓴다

import type { NewsPage } from '@/shared/types'
import { hubApi } from '@/shared/api'

interface Opts { signal?: AbortSignal }

/** 사내 주요 소식 — 최신순. cursor 는 앞 응답의 nextCursor 를 그대로 */
export const newsApi = {
  page: ({ limit = 6, cursor }: { limit?: number; cursor?: string } = {}, { signal }: Opts = {}) =>
    hubApi.get<NewsPage>('/news', { params: { limit, cursor }, signal }),
}
