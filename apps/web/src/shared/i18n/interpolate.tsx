import { Fragment, type ReactNode } from 'react'
/** interpolate 와 같지만 자리에 요소(굵은 글씨 · 링크 · 스켈레톤)를 끼울 수 있다 */
export function interpolateNodes(template: string, vars: Record<string, ReactNode>): ReactNode {
  // split 에 묶음이 있으면 홀수 칸이 자리표시자 이름이다
  return template.split(/\{(\w+)\}/).map((part, i) =>
    i % 2 === 0 ? part : <Fragment key={i}>{part in vars ? vars[part] : `{${part}}`}</Fragment>,
  )
}
