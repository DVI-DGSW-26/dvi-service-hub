import { useEffect, useRef, type PointerEvent } from 'react'
import type { Decor, DecorPos } from '../hooks/useDecor'
import { panBy, placeStyle } from '../lib/wallpaper'

/** 홈 배경 그림(위젯 편집의 꾸미기) — 화면에 고정해 깔고 바탕색을 반쯤 덮어 옅게(styles/home.css 의 .wallpaper) */
export function Wallpaper({ src, pos }: { src: string; pos: DecorPos }) {
  return (
    <div aria-hidden="true" className="wallpaper">
      <img data-decor="wallpaper" src={src} alt="" style={placeStyle(pos)} />
    </div>
  )
}

/**
 * 꾸미기 그림 위치 조정의 끄는 판 — 화면 어디든 끌면 조정 중인 그림(배경 · 인사 카드, data-decor)이 손을 따라온다. 확대 · 취소 · 완료는 편집 독(EditDock).
 * 그동안 배경이면 위젯을 숨기고, 인사 카드면 다른 위젯을 흐린다(App · styles/home.css 의 [data-adjust])
 */
export function DecorAdjust({ decor }: { decor: Decor }) {
  const drag = useRef<{ id: number; x: number; y: number; from: DecorPos } | null>(null)
  const kind = decor.adjusting
  const pos = kind && decor.pos[kind]

  // Esc 는 취소 — 위젯 편집은 그대로(App 이 위치 조정 중에는 Esc 로 편집을 끝내지 않는다)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && decor.endAdjust(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  if (!kind || !pos) return null

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: pos }
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const el = document.querySelector<HTMLImageElement>(`[data-decor="${kind}"]`)
    if (d?.id !== e.pointerId || !el?.naturalWidth) return
    // 칸 크기 — scale 은 transform 이라 clientWidth 에 들지 않는다
    const view = { w: el.clientWidth, h: el.clientHeight }
    decor.movePos(panBy(d.from, e.clientX - d.x, e.clientY - d.y, view, { w: el.naturalWidth, h: el.naturalHeight }))
  }
  const onUp = () => void (drag.current = null)

  // 상단 바 · 사이드바 아래, 본문 위
  return <div className="fixed inset-0 z-10 cursor-grab touch-none active:cursor-grabbing" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
}
