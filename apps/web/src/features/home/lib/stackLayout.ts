// 좁은 화면 위젯 배치 — 4칸 격자에 한 줄로 쌓는 순서와 위젯별 크기. 넓은 화면 칸 배치(widgetLayout.ts)와 따로 저장한다.
// React 없이 값만 다룬다(node --test 가 직접 읽는다 — 상대 경로 + 확장자).

import { STACK_CELLS, STACK_SIZES, type StackSize } from '@dvi/core/widget'
import { reading, type Item, type Page } from './widgetLayout.ts'

/**
 * 좁은 화면에서 한 줄로 쌓는 순서 — 따로 저장한 순서(order)대로, 거기 없는 위젯은 뒤에 페이지 · 읽는 순서대로.
 * 좁은 화면에서 순서를 바꿔도 넓은 화면의 칸 배치는 그대로다
 */
export function stack(pages: Page[], order: string[]): Item[] {
  const at = (i: string) => (order.includes(i) ? order.indexOf(i) : order.length)
  return pages.flatMap((p) => [...p].sort(reading)).sort((a, b) => at(a.i) - at(b.i))
}

// 크기 이름 · 칸 수 · 모양은 앱(apps/mobile)과 같이 쓴다
export { STACK_CELLS, STACK_SIZES, lookOf } from '@dvi/core/widget'

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
