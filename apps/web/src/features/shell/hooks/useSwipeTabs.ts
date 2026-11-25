import { useEffect } from 'react'
import { hrefOf, type Page } from '@/shared/hooks'
import { DRAG_START, EASE } from '@/shared/constants'
import { motionOff, rubberband } from '@/shared/lib'
import { NAV_ITEMS } from '../lib/navItems'

/** 화면 폭의 이만큼 넘게 밀고 놓으면 넘긴다 */
const COMMIT = 0.3
/** 이 빠르기(px/ms) 넘게 던지면 덜 밀어도 넘긴다 */
const FLING = 0.4
/** 옆이 위 · 아래보다 이만큼 커야 탭 넘기기로 본다 — 비스듬한 스크롤을 빼앗지 않게 */
const SLOPE = 1.2

/** 쓰는 중 — 시작점 · 민 거리(dx) · 빠르기(v, px/ms) · 마지막 움직임 시각(t) · 정한 방향 */
interface Swipe { x: number; y: number; dx: number; v: number; t: number; axis?: 'x' | 'y' }

/**
 * 손가락 아래가 스스로 옆으로 움직이는 곳인지 — 거기서 시작한 밀기는 그쪽 몫이다.
 * touch-action 이 pan-y · none 인 곳(카드 페이지 · 공지 넘기기 · 달력 등이 직접 받는다), 옆으로 스크롤되는 곳, 입력칸
 */
function ownsSwipe(target: EventTarget | null) {
  for (let el = target instanceof Element ? target : null; el && el.id !== 'main'; el = el.parentElement) {
    const s = getComputedStyle(el)
    if (/pan-y|none/.test(s.touchAction) && !s.touchAction.includes('pan-x')) return true
    if (/auto|scroll/.test(s.overflowX) && el.scrollWidth > el.clientWidth) return true
    if (el.matches('input, textarea, select, [contenteditable]')) return true
  }
  return false
}

/**
 * 좁은 화면에서 본문(#main)을 옆으로 밀어 탭을 넘긴다 — 앱의 탭처럼 본문이 손을 따라오고, 놓으면 넘어가거나 제자리로.
 * 처음 DRAG_START 만큼 움직인 방향으로 정하고, 옆이면 그때부터 화면 스크롤을 막는다. 끝 탭에서 더 밀면 고무줄처럼 조금만.
 * React 의 터치 핸들러는 passive 라 막을 수 없어 직접 건다
 */
export function useSwipeTabs(page: Page, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const index = NAV_ITEMS.findIndex((n) => n.page === page)
    /** dx 쪽(왼쪽으로 밀면 다음)에 있는 탭 */
    const neighbor = (dx: number) => NAV_ITEMS[index + (dx < 0 ? 1 : -1)] as (typeof NAV_ITEMS)[number] | undefined
    const main = () => document.getElementById('main')
    let s: Swipe | null = null

    const down = (e: TouchEvent) => {
      const t = e.touches[0]
      const free = e.touches.length === 1 && !document.querySelector('dialog[open]') && !ownsSwipe(e.target)
      s = free && (e.target as Element).closest('#main') ? { x: t.clientX, y: t.clientY, dx: 0, v: 0, t: e.timeStamp } : null
    }
    const move = (e: TouchEvent) => {
      if (!s) return
      const t = e.touches[0]
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      s.axis ??= Math.hypot(dx, dy) < DRAG_START ? undefined : Math.abs(dx) > Math.abs(dy) * SLOPE ? 'x' : 'y'
      if (s.axis !== 'x') return
      e.preventDefault()
      s.v = (dx - s.dx) / Math.max(1, e.timeStamp - s.t)
      s.t = e.timeStamp
      s.dx = dx
      const el = main()
      if (!el) return
      // 옆에 드러나는 자리에 옆 탭 화면(SwipePeek) — 끝 탭이라 옆이 없으면 고무줄만.
      // 내려 본 자리에서 밀면 옆 화면은 상단 바 바로 아래부터 보인다
      if (neighbor(dx)) {
        if (!('swiping' in el.dataset)) {
          const bar = document.querySelector('.app-bar')?.getBoundingClientRect().bottom ?? 0
          el.style.setProperty('--peek-top', `${Math.max(0, bar - el.getBoundingClientRect().top)}px`)
        }
        el.dataset.swiping = ''
      } else delete el.dataset.swiping
      el.style.transform = `translateX(${neighbor(dx) ? dx : rubberband(dx, innerWidth)}px)`
    }
    const up = () => {
      const done = s
      s = null
      const el = main()
      if (done?.axis !== 'x' || !el) return
      const next = neighbor(done.dx)
      const flung = Math.abs(done.v) > FLING && Math.sign(done.v) === Math.sign(done.dx)
      if (next && (Math.abs(done.dx) > innerWidth * COMMIT || flung)) {
        // 밀던 쪽으로 마저 내보낸 뒤 탭을 옮긴다 — 새 화면은 반대쪽에서 들어온다(App 의 usePageIn)
        const out = `translateX(${Math.sign(done.dx) * innerWidth}px)`
        const go = () => (location.hash = hrefOf(next.page))
        if (motionOff()) return go()
        el.animate([{ transform: el.style.transform }, { transform: out }], { duration: 160, easing: EASE }).finished.then(go, go)
        el.style.transform = out
        return
      }
      const from = el.style.transform
      el.style.transform = ''
      // 넘어가면 자리표시는 새 화면이 그려질 때 걷힌다(App 의 usePageIn) — 제자리로 돌아오면 다 돌아온 뒤에
      const settled = () => delete el.dataset.swiping
      if (motionOff()) settled()
      else el.animate([{ transform: from }, { transform: 'none' }], { duration: 280, easing: EASE }).finished.then(settled, settled)
    }

    addEventListener('touchstart', down, { passive: true })
    addEventListener('touchmove', move, { passive: false })
    addEventListener('touchend', up)
    addEventListener('touchcancel', up)
    return () => {
      removeEventListener('touchstart', down)
      removeEventListener('touchmove', move)
      removeEventListener('touchend', up)
      removeEventListener('touchcancel', up)
    }
  }, [page, enabled])
}
