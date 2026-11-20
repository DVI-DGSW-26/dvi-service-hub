// 위젯이 그려질 크기 — 홈 보드와 위젯(패널)이 함께 쓰는 약속

/** 좁은 화면에서 고르는 크기(4칸 격자의 칸 수 또는 넓은 화면 크기 이름) */
export type StackSize = 's' | 'w' | 'm' | 'l' | '1x1' | '1x2' | '4x1' | '3x2' | '2x3'
/** 아주 작은 칸 — 아이콘 · 숫자 하나(1×1 · 1×2)나 한 줄 띠(4×1)만 들어간다(shared/ui 의 MiniPanel) */
export type MiniSize = '1x1' | '1x2' | '4x1'
export const isMini = (s: StackSize | undefined): s is MiniSize => s === '1x1' || s === '1x2' || s === '4x1'

/**
 * 좁은 화면 크기 — 갤럭시 홈 화면처럼 4칸 격자의 칸 수로 정한다(칸은 정사각).
 * 작게 2×2 · 넓게 4×2 · 보통 4×3 · 크게 4×4(처음 넷은 저장 이름이 글자 하나), 그리고 1×1 · 1×2 · 4×1 · 3×2 · 2×3.
 * 위젯마다 그릴 수 있는 것(웹 registry 의 stack) 사이에서만 고른다
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

/** 4칸 격자에 놓인 자리(칸 단위) */
export interface Cell {
  x: number
  y: number
  w: number
  h: number
}

/**
 * 순서대로 4칸 격자에 놓는다 — CSS grid 의 자동 배치(dense 없이)와 같다: 앞 위젯 바로 뒤부터 들어갈 첫 자리를 찾고,
 * 줄이 넘치면 다음 줄 처음으로. 앞의 빈칸으로 되돌아가 메우지 않아 순서가 읽는 순서 그대로다.
 * 웹은 CSS 가 하고, 앱(React Native 에는 grid 가 없다)은 이것으로 자리를 계산한다
 */
export function placeStack(sizes: StackSize[], cols = 4): Cell[] {
  const taken = new Set<string>()
  const key = (x: number, y: number) => `${String(x)},${String(y)}`
  const free = (x: number, y: number, w: number, h: number) => {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (taken.has(key(x + dx, y + dy))) return false
    return true
  }
  let row = 0
  let col = 0
  return sizes.map((s) => {
    const [w, h] = STACK_CELLS[s]
    while (col + w > cols || !free(col, row, w, h)) {
      if (col + w > cols) {
        row++
        col = 0
      } else col++
    }
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) taken.add(key(col + dx, row + dy))
    const cell = { x: col, y: row, w, h }
    col += w
    return cell
  })
}
