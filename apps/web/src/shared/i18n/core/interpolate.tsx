import { Fragment, type ReactNode } from 'react'
import type { Vars } from './types'

const PLACEHOLDER = /\{(\w+)\}/g

/** '{name} 님' + { name: '지현' } → '지현 님'. 값이 없는 자리는 그대로 둔다 — 빠진 걸 화면에서 알아볼 수 있게 */
export function interpolate(template: string, vars?: Vars) {
  if (!vars) return template
  return template.replace(PLACEHOLDER, (whole, key: string) => (key in vars ? String(vars[key]) : whole))
}

/** interpolate 와 같지만 자리에 요소(굵은 글씨 · 링크 · 스켈레톤)를 끼울 수 있다 */
export function interpolateNodes(template: string, vars: Record<string, ReactNode>): ReactNode {
  // split 에 묶음이 있으면 홀수 칸이 자리표시자 이름이다
  return template.split(/\{(\w+)\}/).map((part, i) =>
    i % 2 === 0 ? part : <Fragment key={i}>{part in vars ? vars[part] : `{${part}}`}</Fragment>,
  )
}
