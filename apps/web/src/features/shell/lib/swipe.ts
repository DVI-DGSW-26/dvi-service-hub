// 본문을 옆으로 밀어 탭 넘기기(useSwipeTabs)의 판정 — DOM 없이 값만 다룬다. node --test 가 직접 읽는다

/** 이만큼(px) 움직이기 전에는 방향을 정하지 않는다 */
export const SLOP = 10
/** 가로가 세로보다 이만큼 커야 가로 밀기로 본다 — 비스듬한 세로 스크롤을 탭 넘기기로 잡지 않게 */
const AXIS_RATIO = 1.2

/** 처음 움직임의 방향 — 아직 모르면 null */
export function axisOf(dx: number, dy: number): 'x' | 'y' | null {
  if (Math.hypot(dx, dy) < SLOP) return null
  return Math.abs(dx) > Math.abs(dy) * AXIS_RATIO ? 'x' : 'y'
}

/** 처음 · 마지막 탭 너머로는 버티며 조금만 따라온다 */
export function resist(dx: number, index: number, count: number) {
  return (dx > 0 && index === 0) || (dx < 0 && index === count - 1) ? dx / 4 : dx
}

/**
 * 놓았을 때 몇 탭 옮길지 — 화면 폭의 1/4(최대 96px)을 넘게 밀었거나 빠르게 튕겼으면(0.5px/ms) 옆 탭(±1), 아니면 0(제자리).
 * 왼쪽으로 밀면(dx < 0) 다음 탭(+1)이다. 끝 탭 너머인지는 부르는 쪽이 본다
 */
export function swipeStep(dx: number, velocity: number, width: number): number {
  const far = Math.abs(dx) > Math.min(96, width / 4)
  const flick = Math.abs(velocity) > 0.5 && Math.sign(velocity) === Math.sign(dx)
  return dx && (far || flick) ? -Math.sign(dx) : 0
}
