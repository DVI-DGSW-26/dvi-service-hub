// 시스템 점검 데이터 훅
// 열쇠(queryKey)는 이 파일의 *Keys 에 둔다. 글을 쓰거나 지우면 그 열쇠를 무효로 돌려 보던 패널이 다시 받는다.

import { queryOptions } from '@tanstack/react-query'
import { maintenanceApi } from './maintenance'
import type { MaintenanceInput } from '@dvi/core/types'
import { alreadyGone, useWrite } from '@/shared/api'

const maintenanceKeys = { list: ['maintenance'] as const }

export const maintenanceQueries = {
  list: () => queryOptions({ queryKey: maintenanceKeys.list, queryFn: ({ signal }) => maintenanceApi.list({ signal }) }),
}

export const useCreateMaintenance = () => useWrite((input: MaintenanceInput) => maintenanceApi.create(input), maintenanceKeys.list)
export const useDeleteMaintenance = () => useWrite((id: string) => maintenanceApi.remove(id).catch(alreadyGone), maintenanceKeys.list)
