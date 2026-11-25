/** 칸을 꽉 채울 때 노리는 카드 가로 : 세로 — 로고 · 이름 · 설명이 옆으로 놓이는 카드 */
const FILL_ASPECT = 3

/**
 * count 장을 한 페이지에 담는 [열, 줄] 중 카드 비율이 FILL_ASPECT 에 가장 가까운 것 — 빈칸이 많으면 조금 깎는다.
 * max 는 카드가 제 최소 크기를 지키는 한도(auto-fill 열 수 · 잰 줄 수), box 는 페이지 안쪽 크기와 칸 사이
 */
export function spreadOut(count: number, max: { cols: number; lines: number }, box: { w: number; h: number; colGap: number; rowGap: number }): [number, number] {
  const { w: width, h: height, colGap, rowGap } = box
  let best: [number, number] = [max.cols, Math.ceil(count / max.cols)]
  let bestScore = Infinity
  for (let c = Math.min(max.cols, count); c >= 1; c--) {
    const r = Math.ceil(count / c)
    if (r > max.lines) break
    const w = (width - (c - 1) * colGap) / c
    const h = (height - (r - 1) * rowGap) / r
    const score = Math.abs(Math.log(w / h / FILL_ASPECT)) + (c * r - count) * 0.1
    if (score < bestScore) [best, bestScore] = [[c, r], score]
  }
  return best
}
