/**
 * 애플식 스프링 — 감쇠비(1 = 튕김 없음)와 응답 시간(초)으로 고른다.
 * 정해진 길이가 없어서 언제든 목표를 바꿔도 지금 위치 · 속도에서 끊김 없이 이어 간다.
 */
export interface Spring {
  x: number
  v: number
  to: number
}

export const spring = (x: number): Spring => ({ x, v: 0, to: x })

export function step(s: Spring, dt: number, damping: number, response: number) {
  const k = ((2 * Math.PI) / response) ** 2
  const c = (4 * Math.PI * damping) / response
  // 프레임이 늘어져도 튀지 않게 잘게 나눠 적분한다
  for (let t = dt; t > 0; t -= 1 / 240) {
    const h = Math.min(t, 1 / 240)
    s.v += (-k * (s.x - s.to) - c * s.v) * h
    s.x += s.v * h
  }
}

export function snap(s: Spring, x = s.to) {
  s.x = s.to = x
  s.v = 0
}

/** 거의 멈췄으면 목표에 딱 붙이고 true */
export function settle(s: Spring, eps: number) {
  if (Math.abs(s.x - s.to) > eps || Math.abs(s.v) > eps * 10) return false
  snap(s)
  return true
}

/** 끝을 넘어 끌면 갈수록 덜 따라온다 */
export const rubberband = (over: number, dim: number, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over))

/** 놓는 순간의 속도(px/s)로 멈출 자리를 내다본다. 0.99 는 짧은 목록에 맞춘 감속률 */
export const project = (v: number, rate = 0.99) => ((v / 1000) * rate) / (1 - rate)
