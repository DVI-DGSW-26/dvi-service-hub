import { useMutation, useQueryClient } from '@tanstack/react-query'

/** 쓰기 훅 — 성공하든 실패하든(이미 지워진 글 404 등) 목록을 다시 받아 화면을 서버와 맞춘다 */
export function useWrite<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>, key: readonly unknown[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}
