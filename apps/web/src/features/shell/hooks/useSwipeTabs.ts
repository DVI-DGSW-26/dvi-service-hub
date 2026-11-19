import { useEffect, useRef } from 'react'
import { hrefOf, type Page } from '@/shared/hooks'
import { motionOff } from '@/shared/lib'
import { NAV_ITEMS } from '../lib/navItems'
import { axisOf, resist, swipeStep } from '../lib/swipe'

const PAGES = NAV_ITEMS.map((n) => n.page)
/** 화면 끝 이만큼(px)에서 시작한 밀기는 브라우저 몫 — iOS 뒤로 가기 · 안드로이드 뒤로 제스처 */
const EDGE = 24

/** 가로로 스크롤되는 칸(가로 목록 · 표) 안에서 시작했나 — 그 칸이 먼저 밀린다 */
function inScroller(target: EventTarget | null, root: HTMLElement) {
  for (let el = target as HTMLElement | null; el && el !== root; el = el.parentElement) {
    if (el.dataset.noSwipe !== undefined) return true
    if (el.scrollWidth > el.clientWidth && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true
  }
  return false
}

/**
 * 본문(main)을 옆으로 밀어 탭을 넘긴다 — 왼쪽으로 밀면 다음 탭. 손을 따라 본문이 움직이고, 놓으면 넘기거나 제자리로.
 * touch 이벤트를 passive 로 듣는다: 세로 스크롤은 브라우저가 그대로 하고, 가로로 정해진 밀기만 우리가 쓴다.
 * touch-action: pan-y 는 쓰지 않는다 — 조상에 걸면 안쪽 가로 스크롤 칸까지 막힌다
 */
export function useSwipeTabs<T extends HTMLElement>(page: Page, enabled: boolean) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    const index = PAGES.indexOf(page)
    let s: { x: number; y: number; dx: number; t: number; v: number; axis: 'x' | 'y' | null } | null = null

    const reset = () => {
      if (!s?.dx || motionOff()) el.style.removeProperty('transform')
      else el.animate([{ transform: el.style.transform }, { transform: 'none' }], { duration: 200, easing: 'ease-out' }).onfinish = () => el.style.removeProperty('transform')
      s = null
    }
    const onStart = (e: TouchEvent) => {
      const p = e.touches[0]
      if (e.touches.length > 1 || p.clientX < EDGE || p.clientX > innerWidth - EDGE || document.querySelector('dialog[open]') || inScroller(e.target, el)) {
        s = null
        return
      }
      s = { x: p.clientX, y: p.clientY, dx: 0, t: e.timeStamp, v: 0, axis: null }
    }
    const onMove = (e: TouchEvent) => {
      if (!s) return
      const p = e.touches[0]
      s.axis ??= axisOf(p.clientX - s.x, p.clientY - s.y)
      if (s.axis !== 'x') return
      const dx = resist(p.clientX - s.x, index, PAGES.length)
      s.v = (dx - s.dx) / Math.max(1, e.timeStamp - s.t)
      s.dx = dx
      s.t = e.timeStamp
      el.style.transform = `translateX(${dx}px)`
    }
    const onEnd = () => {
      if (s?.axis !== 'x') return void (s = null)
      const next = PAGES[index + swipeStep(s.dx, s.v, el.clientWidth)]
      // 넘기면 main 이 새로 그려지며 들어온다(.page-in) — 지금 것은 그대로 두고 주소만 바꾼다. 끝 탭 너머(undefined)면 제자리
      if (next && next !== page) location.hash = hrefOf(next)
      else reset()
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', reset)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', reset)
    }
  }, [page, enabled])
  return ref
}
