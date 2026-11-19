// 좁은 화면 위젯 배치 — 4칸 격자에 한 줄로 쌓는 순서와 위젯별 크기. 넓은 화면 칸 배치(widgetLayout.ts)와 따로 저장한다.
// React 없이 값만 다룬다(node --test 가 직접 읽는다 — 상대 경로 + 확장자).

import type { StackSize } from '../../../shared/widget/index.ts'
import { reading, type Item, type Page } from './widgetLayout.ts'

/**
 * 좁은 화면에서 한 줄로 쌓는 순서 — 따로 저장한 순서(order)대로, 거기 없는 위젯은 뒤에 페이지 · 읽는 순서대로.
 * 좁은 화면에서 순서를 바꿔도 넓은 화면의 칸 배치는 그대로다
 */
export function stack(pages: Page[], order: string[]): Item[] {
  const at = (i: string) => (order.includes(i) ? order.indexOf(i) : order.length)
  return pages.flatMap((p) => [...p].sort(reading)).sort((a, b) => at(a.i) - at(b.i))
}

/**
 * 좁은 화면 크기 — 갤럭시 홈 화면처럼 4칸 격자의 칸 수로 정한다(칸은 정사각, styles/widgets/stack.css 의 .stack-wrap).
 * 작게 2×2 · 넓게 4×2 · 보통 4×3 · 크게 4×4(처음 넷은 저장 이름이 글자 하나), 그리고 1×1 · 1×2 · 4×1 · 3×2 · 2×3.
 * 위젯마다 그릴 수 있는 것(registry 의 stack) 사이에서만 고른다
 */
export const STACK_SIZES: StackSize[] = ['1x1', '1x2', '4x1', 's', '3x2', 'w', '2x3', 'm', 'l']
/** 크기별 [가로, 세로] 칸 수 */
export const STACK_CELLS: Record<StackSize, [number, number]> = {
  '1x1': [1, 1],
  '1x2': [1, 2],
  '4x1': [4, 1],
  s: [2, 2],
  '3x2': [3, 2],
  w: [4, 2],
  '2x3': [2, 3],
  m: [4, 3],
  l: [4, 4],
}
/** 위젯이 그릴 모양 — 3×2 는 넓게(4×2), 2×3 은 작게(2×2) 모양을 칸에 맞춰 늘려 쓴다. 나머지는 그 크기 그대로 */
export const lookOf = (s: StackSize | undefined) => (s === '3x2' ? 'w' : s === '2x3' ? 's' : s)

/** 좁은 화면 배치 — 쌓는 순서와 위젯별 크기. 넓은 화면 칸 배치와 따로 저장한다 */
export interface Stack {
  order: string[]
  sizes: Record<string, StackSize>
}

/** 저장해 둔 좁은 화면 배치. 틀린 것은 버린다 — 순서가 틀리면 빈 순서(넓은 화면의 읽는 순서), 크기가 틀리면 그 위젯만 기본 크기 */
export function parseStack(saved: unknown): Stack {
  const v = saved as Partial<Stack> | null
  const order = Array.isArray(v?.order) && v.order.every((i) => typeof i === 'string') ? v.order : []
  const sizes = v?.sizes && typeof v.sizes === 'object' ? Object.fromEntries(Object.entries(v.sizes).filter(([, s]) => STACK_SIZES.includes(s))) : {}
  return { order, sizes }
}

/** 고른 크기를 그 위젯이 그릴 수 있으면 그대로, 아니면 보통(없으면 그릴 수 있는 첫 크기) */
export const stackSizeOf = (supported: StackSize[], saved: StackSize | undefined): StackSize =>
  saved && supported.includes(saved) ? saved : supported.includes('m') ? 'm' : supported[0]

/**
 * 가로 w · 세로 h 칸에 가장 가까운, 그릴 수 있는 크기 — 끄는 쪽(across 면 가로) 칸 수를 먼저 맞추고, 같으면 다른 쪽이 가까운 것.
 * 없는 조합(3×4 등)은 그 쪽 칸 수가 가까운 것으로
 */
export const nearest = (supported: StackSize[], w: number, h: number, across: boolean) => {
  const gap = (s: StackSize) => {
    const [dw, dh] = [Math.abs(STACK_CELLS[s][0] - w), Math.abs(STACK_CELLS[s][1] - h)]
    return across ? dw * 10 + dh : dh * 10 + dw
  }
  return supported.reduce((a, b) => (gap(b) < gap(a) ? b : a))
}
