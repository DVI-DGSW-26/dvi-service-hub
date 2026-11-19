// 꾸미기 그림(홈 배경 · 인사 카드)의 자리 계산 — decor/components/Wallpaper.tsx · HeroCard 가 쓴다. DOM 없이 돌아 pnpm test 로 본다

interface Size {
  w: number
  h: number
}

/** 그림에서 칸 가운데 쪽에 올 점(가로 · 세로 %)과 확대 배율 */
export interface DecorPos {
  x: number
  y: number
  zoom: number
}

export const CENTER: DecorPos = { x: 50, y: 50, zoom: 1 }
export const MAX_ZOOM = 3

/** 그림을 칸에 까는 style — object-fit: cover 인 <img> 에. 같은 점을 중심으로 키워 확대해도 칸을 덮는다 */
export const placeStyle = (p: DecorPos) => ({ objectPosition: `${p.x}% ${p.y}%`, transformOrigin: `${p.x}% ${p.y}%`, scale: String(p.zoom) })

/**
 * 그림을 손이 dx · dy(px) 끈 만큼 옮긴 자리(%). 그림은 object-fit: cover + object-position(x% y%)으로 깔고
 * 같은 점(transform-origin)을 중심으로 zoom 배 키운다 — 이때 그림 왼쪽 끝은 -(x / 100) × span 에 놓이므로 span 으로 나누면 손을 1:1 로 따라온다.
 * 남는 폭이 없는 쪽(칸과 비율이 같고 확대도 안 한 쪽)은 움직이지 않는다
 */
export function panBy(pos: DecorPos, dx: number, dy: number, view: Size, img: Size): DecorPos {
  const cover = Math.max(view.w / img.w, view.h / img.h)
  const span = (v: number, n: number) => v * (pos.zoom - 1) + (n * cover - v) * pos.zoom
  const move = (at: number, d: number, s: number) => (s > 0.5 ? Math.min(100, Math.max(0, at - (100 * d) / s)) : at)
  return { ...pos, x: move(pos.x, dx, span(view.w, img.w)), y: move(pos.y, dy, span(view.h, img.h)) }
}
