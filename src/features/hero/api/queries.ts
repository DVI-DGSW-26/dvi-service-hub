// 전사 공지 데이터 훅 — const create = useCreateNotice()  →  await create.mutateAsync(input)
// 열쇠(queryKey)는 이 파일의 *Keys 에 둔다. 글을 쓰거나 지우면 그 열쇠를 무효로 돌려 보던 패널이 다시 받는다.

import { queryOptions } from '@tanstack/react-query'
import { noticesApi } from './notices'
import type { NoticeInput } from '@/shared/types'
import { alreadyGone, useWrite } from '@/shared/api'

const noticeKeys = { list: ['notices'] as const }

export const noticeQueries = {
  list: () => queryOptions({ queryKey: noticeKeys.list, queryFn: ({ signal }) => noticesApi.list({ signal }) }),
}

export const useCreateNotice = () => useWrite((input: NoticeInput) => noticesApi.create(input), noticeKeys.list)
export const useDeleteNotice = () => useWrite((id: string) => noticesApi.remove(id).catch(alreadyGone), noticeKeys.list)
