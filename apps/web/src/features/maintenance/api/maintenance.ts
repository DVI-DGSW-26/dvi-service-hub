// 시스템 점검 API (포털 대시보드 명세 v0.5)
// signal 은 TanStack Query 가 넘겨 준다 — 화면을 떠나면 받던 요청을 끊는다. 화면은 이 함수를 직접 부르지 않고 같은 폴더 queries.ts 를 쓴다

import type { Maintenance, MaintenanceInput } from '@/shared/types'
import { hubApi, seg } from '@/shared/api'

interface Opts { signal?: AbortSignal }

/** 시스템 점검 · 안내 — 점검 당일까지, 날짜 · 시작 시각 오름차순. 등록 · 삭제는 maintenance:write 또는 admin */
export const maintenanceApi = {
  list: ({ signal }: Opts = {}) => hubApi.get<Maintenance[]>('/maintenance', { signal }),
  create: (input: MaintenanceInput) => hubApi.post<Maintenance>('/maintenance', input),
  remove: (id: string) => hubApi.delete(`/maintenance/${seg(id)}`),
}
