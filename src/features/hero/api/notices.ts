// 전사 공지 API (포털 대시보드 명세 v0.5)
// signal 은 TanStack Query 가 넘겨 준다 — 화면을 떠나면 받던 요청을 끊는다. 화면은 이 함수를 직접 부르지 않고 같은 폴더 queries.ts 를 쓴다

import type { Notice, NoticeInput } from '@/shared/types'
import { hubApi, seg } from '@/shared/api'

interface Opts { signal?: AbortSignal }

/** 전사 공지 — 최신순. 권한: 조회 employee · 등록 · 삭제 service-hub 의 notice:write 또는 admin */
export const noticesApi = {
  list: ({ signal }: Opts = {}) => hubApi.get<Notice[]>('/notices', { signal }),
  create: (input: NoticeInput) => hubApi.post<Notice>('/notices', input),
  remove: (id: string) => hubApi.delete(`/notices/${seg(id)}`),
}
