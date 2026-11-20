// 내비 물방울(useLiquidNav)의 계산 — 끌기 상태 · 한도 · 놓을 메뉴 고르기. DOM · React 없이 값만 다룬다.
import { project, rubberband } from '@/shared/lib'
import { VELOCITY_WINDOW } from '@/shared/constants'

export interface Drag {
  /** 터치는 포인터 id, 마우스(브라우저 끌어놓기)는 -1 */
  id: number
  startX: number
  startY: number
  /** 메뉴 목록의 시작 끝(세로는 위, 가로는 왼쪽) — 화면 기준 */
  listStart: number
  /** 잡은 자리 — 메뉴 시작 끝에서 손가락까지 */
  offset: number
  live: boolean
  /** 메뉴 판(data-liquid-root) 안에 있는지. 밖이면 방울은 제자리로 돌아가고 링크 칩이 커서를 따라간다 */
  inside: boolean
  to: number
  history: { t: number; p: number }[]
}

// 아래 한도들은 모두 px — 비율로만 두면 넓은 칸(하단 탭 84px)에서 방울이 메뉴 판 밖으로 나간다.
// 탭바 안쪽 여백(6px) 안에 들어오도록: 끝 넘김 4 + 들어 올림 한쪽 1.5 < 6
/** 끝을 넘겨 끌어도 방울은 이만큼까지만 밀려난다 — 그 뒤로는 버티기만 한다 */
const OVERSHOOT = 4
/** 들어 올릴 때 메뉴 방향으로 커지는 길이(양쪽 합) */
export const MAX_LIFT = 3
/** 빠르게 움직일 때 늘어나는 길이(양쪽 합) */
export const MAX_STRETCH = 10
/** 끝 메뉴로 내려앉을 때 바깥쪽으로 남겨 둘 속도(px/s) — 이보다 빠르면 스프링이 끝을 넘어 튀어나간다 */
export const EDGE_SPEED = 150

/** 손가락 위치를 방울 목표로 — 끝(0 ~ max)을 넘으면 고무줄처럼. 속도를 재려고 지난 위치를 쌓는다 */
export function followTo(d: Drag, client: number, t: number, max: number) {
  let p = client - d.listStart - d.offset
  if (p < 0) p = -rubberband(-p, OVERSHOOT)
  if (p > max) p = max + rubberband(p - max, OVERSHOOT)
  d.to = p
  d.history.push({ t, p })
  while (d.history.length > 2 && t - d.history[0].t > VELOCITY_WINDOW) d.history.shift()
}

/**
 * 놓을 때 — 놓는 순간 속도와, 그 속도로 멈출 자리에 가장 가까운 메뉴. outward: 끝 메뉴로 바깥쪽을 향해 가는 중.
 * 멈춰 있다 놓으면 그동안 move 가 오지 않아 멈추기 전 속도가 남는다 — 놓는 순간을 마지막 점으로 넣고
 * 그 앞 VELOCITY_WINDOW 안의 점만 본다. 오래 멈춰 있었으면 속도 0 → 가장 가까운 메뉴에 내려앉는다
 */
export function aimAt(d: Drag, t: number, starts: number[]) {
  const h = [...d.history.filter((s) => t - s.t <= VELOCITY_WINDOW), { t, p: d.to }]
  const v = h.length > 1 ? ((h[h.length - 1].p - h[0].p) / Math.max(1, h[h.length - 1].t - h[0].t)) * 1000 : 0
  const aim = d.to + project(v)
  let target = 0
  starts.forEach((start, i) => {
    if (Math.abs(start - aim) < Math.abs(starts[target] - aim)) target = i
  })
  const last = starts.length - 1
  const outward = (target === last && v > 0) || (target === 0 && v < 0)
  return { target, v, outward }
}

/** 방울 가운데(center)가 올라가 있는 메뉴 — 칸 길이의 0.6 보다 멀면 없음(-1) */
export function nearestMenu(starts: number[], size: number, center: number) {
  let near = -1
  let best = Infinity
  starts.forEach((start, i) => {
    const d = Math.abs(start + size / 2 - center)
    if (d < best) {
      best = d
      near = i
    }
  })
  return best > size * 0.6 ? -1 : near
}
