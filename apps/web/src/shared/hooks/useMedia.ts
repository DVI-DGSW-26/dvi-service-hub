import { useSyncExternalStore } from 'react'

/** 미디어 쿼리가 맞는지. 화면을 돌리거나 창 크기가 바뀌면 다시 그린다 */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => matchMedia(query).matches,
  )
}
