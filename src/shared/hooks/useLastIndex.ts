import { useState } from 'react'

/** 닫히는 애니메이션 동안에도 내용이 남아 있도록 마지막으로 본 글의 자리. 목록이 줄었으면 끝으로 */
export function useLastIndex(index: number | null, length: number) {
  const [last, setLast] = useState(0)
  if (index !== null && index !== last) setLast(index)
  return Math.min(index ?? last, length - 1)
}
