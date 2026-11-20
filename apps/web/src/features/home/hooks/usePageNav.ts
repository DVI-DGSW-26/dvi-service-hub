import { useEffect, useRef, type MouseEvent as ReactMouseEvent, type PointerEvent, type RefObject, type WheelEvent } from 'react'
import type { WideLayout } from './useWideLayout'

interface PageNavOptions {
  layout: Pick<WideLayout, 'page' | 'setPage' | 'undo' | 'redo'>
  pageCount: number
  /** 넓은 화면(칸 판)인지 · 판 폭 */
  area: { lg: boolean; width: number }
  editing: boolean
  /** 위젯을 끄는 중 — 그동안 휠로 넘기지 않는다 */
  dragging: RefObject<boolean>
  viewRef: RefObject<HTMLDivElement | null>
  trackRef: RefObject<HTMLDivElement | null>
}

/** 판의 빈 곳(위젯 · 단추 밖)인지 */
const empty = (t: EventTarget) => !(t as Element).closest('.react-grid-item, button, a, input')

/**
 * 넓은 화면 페이지 넘기기 — 트랙패드 · 가로 휠, 빈 곳을 옆으로 밀기(스와이프), 위젯에 초점이 없을 때 ← · →.
 * 편집 중 Ctrl(⌘) + Z 되돌리기 · Ctrl + Shift + Z · Ctrl + Y 다시 하기도 여기서 받는다
 */
export function usePageNav({ layout, pageCount, area, editing, dragging, viewRef, trackRef }: PageNavOptions) {
  const { page } = layout
  const wheel = useRef({ sum: 0, at: 0 })
  /** 빈 곳을 옆으로 미는 중 — 손가락 · 마우스 하나, 시작점과 민 거리(px) */
  const swipe = useRef<{ id: number; x: number; dx: number } | null>(null)

  // 트랙패드 · 가로 휠로 페이지 넘기기 — 한 번 넘기면 잠깐 쉰다(관성 스크롤이 여러 장을 넘기지 않게)
  const onWheel = (e: WheelEvent) => {
    if (pageCount < 2 || dragging.current || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
    const w = wheel.current
    if (performance.now() - w.at < 600) return
    w.sum += e.deltaX
    if (Math.abs(w.sum) < 60) return
    const next = page + Math.sign(w.sum)
    w.sum = 0
    w.at = performance.now()
    if (next >= 0 && next < pageCount) layout.setPage(next)
  }

  // 빈 곳을 누르고 끌면 브라우저가 글자 선택을 시작해 화면 글자가 다 잡힌다 — 빈 곳에서는 선택을 시작하지 않는다(위젯 안 글자는 그대로 고를 수 있다).
  // 누르기를 막으면 초점도 안 옮겨 가니, 위젯에 있던 초점은 직접 풀어 ← · → 가 페이지를 넘기게 한다
  const onMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!area.lg || !empty(e.target)) return
    e.preventDefault()
    ;(document.activeElement as HTMLElement | null)?.blur()
  }
  // 빈 곳을 옆으로 밀면 옆 페이지로 — 트랙이 손을 따라오고, 판 폭의 1/6(최대 120px)을 넘게 밀고 놓으면 넘어간다
  const onSwipeStart = (e: PointerEvent<HTMLDivElement>) => {
    if (!area.lg || pageCount < 2 || e.button !== 0 || !empty(e.target)) return
    swipe.current = { id: e.pointerId, x: e.clientX, dx: 0 }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onSwipeMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = swipe.current
    const track = trackRef.current
    if (s?.id !== e.pointerId || !track) return
    const dx = e.clientX - s.x
    // 처음 · 마지막 페이지 너머로는 버티며 조금만
    s.dx = (dx > 0 && page === 0) || (dx < 0 && page === pageCount - 1) ? dx / 4 : dx
    track.dataset.swiping = ''
    track.style.setProperty('--swipe', `${s.dx}px`)
  }
  const onSwipeEnd = (e: PointerEvent<HTMLDivElement>) => {
    const s = swipe.current
    const track = trackRef.current
    if (s?.id !== e.pointerId || !track) return
    swipe.current = null
    delete track.dataset.swiping
    track.style.removeProperty('--swipe')
    const next = page - Math.sign(s.dx)
    if (e.type === 'pointerup' && Math.abs(s.dx) > Math.min(120, area.width / 6) && next >= 0 && next < pageCount) layout.setPage(next)
  }

  // 편집 중 되돌리기 · 다시 하기, 위젯에 초점이 없을 때 ← · → 로 페이지 — 글을 쓰는 칸 · 열린 창에서는 그쪽 몫으로 둔다.
  // 렌더마다 다시 건다(지금 페이지 · 배치를 읽는다)
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.defaultPrevented || document.querySelector('dialog[open]') || el.closest('input, textarea, select, [contenteditable="true"]')) return
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (editing && mod && (key === 'z' || key === 'y')) {
        e.preventDefault()
        if (key === 'z' && !e.shiftKey) layout.undo()
        else layout.redo()
        return
      }
      const dir = { ArrowLeft: -1, ArrowRight: 1 }[e.key]
      const next = page + (dir ?? 0)
      if (!dir || mod || e.altKey || e.shiftKey || !area.lg || (el !== document.body && el !== viewRef.current) || next < 0 || next >= pageCount) return
      e.preventDefault()
      layout.setPage(next)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  return { onWheel, onMouseDown, onSwipeStart, onSwipeMove, onSwipeEnd }
}
