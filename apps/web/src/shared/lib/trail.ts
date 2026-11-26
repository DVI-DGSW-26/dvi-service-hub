/** 끄는 손의 지난 자리 — 시각(t, 이벤트 timeStamp) · 위치(p, px). 한 번 끄는 동안만 쌓는다 */
export type Trail = { t: number; p: number }[]

/**
 * 놓는 순간(t)의 빠르기(px/ms) — 그 전 windowMs 안의 움직임으로 잰다. 그 안에 움직임이 없으면(멈췄다 놓으면) 0.
 * 마지막 한 번의 움직임으로 재면 터치가 자주 오는 휴대폰(S26 앱)에서 손을 떼며 느려진 몇 px 만 잡혀 던져도 안 넘어갔다
 */
export function releaseSpeed(trail: Trail, t: number, windowMs: number) {
  const w = trail.filter((s) => t - s.t <= windowMs)
  return w.length < 2 ? 0 : (w[w.length - 1].p - w[0].p) / Math.max(1, w[w.length - 1].t - w[0].t)
}
