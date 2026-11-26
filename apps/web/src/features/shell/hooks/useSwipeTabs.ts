import { useEffect, useRef } from 'react'
import { hrefOf, type Page } from '@/shared/hooks'
import { DRAG_START, EASE, VELOCITY_WINDOW } from '@/shared/constants'
import { motionOff, releaseSpeed, rubberband, type Trail } from '@/shared/lib'
import { NAV_ITEMS } from '../lib/navItems'

/** 화면 폭의 이만큼 넘게 밀고 놓으면 넘긴다 */
const COMMIT = 0.3
/** 이 빠르기(px/ms) 넘게 던지면 덜 밀어도 넘긴다 */
const FLING = 0.4
/** 옆이 위 · 아래보다 이만큼 커야 탭 넘기기로 본다 — 비스듬한 스크롤을 빼앗지 않게 */
const SLOPE = 1.2

/** 쓰는 중 — 시작점 · 민 거리(dx) · 지난 자리(trail, 빠르기용) · 정한 방향 */
interface Swipe { x: number; y: number; dx: number; trail: Trail; axis?: 'x' | 'y' }

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
 * React 의 터치 핸들러는 passive 라 막을 수 없어 직접 건다.
 * 리스너는 한 번만 걸고 지금 탭은 ref 로 읽는다 — 탭이 바뀔 때마다 다시 걸면 손가락이 닿은 채 바뀐 순간 옛 리스너가 반쯤 민 본문을 남겼다
 */
export function useSwipeTabs(page: Page, enabled: boolean) {
  const pageRef = useRef(page)
  useEffect(() => {
    pageRef.current = page
  }, [page])

  useEffect(() => {
    if (!enabled) return
    /** dx 쪽(왼쪽으로 밀면 다음)에 있는 탭 */
    const neighbor = (dx: number) =>
      NAV_ITEMS[NAV_ITEMS.findIndex((n) => n.page === pageRef.current) + (dx < 0 ? 1 : -1)] as (typeof NAV_ITEMS)[number] | undefined
    const main = () => document.getElementById('main')
    let s: Swipe | null = null
    /** 밀어 넘긴 탭 — 새 화면으로 바뀔 때까지(본문이 화면 밖에 있는 동안) 다시 밀지 않는다 */
    let leaving: Page | null = null

    const down = (e: TouchEvent) => {
      const t = e.touches[0]
      if (leaving === pageRef.current) return void (s = null)
      leaving = null
      // #main 밖(탭 바 · 상단 바)은 조상마다 스타일을 읽는 ownsSwipe 까지 가지 않는다
      const free = e.touches.length === 1 && (e.target as Element).closest('#main') && !document.querySelector('dialog[open]') && !ownsSwipe(e.target)
      s = free ? { x: t.clientX, y: t.clientY, dx: 0, trail: [] } : null
    }
    const move = (e: TouchEvent) => {
      if (!s) return
      const t = e.touches[0]
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      const decided = s.axis
      s.axis ??= Math.hypot(dx, dy) < DRAG_START ? undefined : Math.abs(dx) > Math.abs(dy) * SLOPE ? 'x' : 'y'
      if (s.axis !== 'x') return
      e.preventDefault()
      s.trail.push({ t: e.timeStamp, p: dx })
      s.dx = dx
      const el = main()
      if (!el) return
      // 제자리로 돌아가는 중에 다시 잡으면 그 움직임을 멈추고 손을 따른다 — 안 멈추면 움직임이 끝나는 순간 손 자리로 튄다
      if (!decided) el.getAnimations().forEach((a) => a.cancel())
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
    const up = (e: TouchEvent) => {
      const done = s
      s = null
      const el = main()
      if (done?.axis !== 'x' || !el) return
      const next = neighbor(done.dx)
      const v = releaseSpeed(done.trail, e.timeStamp, VELOCITY_WINDOW)
      const flung = Math.abs(v) > FLING && Math.sign(v) === Math.sign(done.dx)
      if (next && (Math.abs(done.dx) > innerWidth * COMMIT || flung)) {
        // 밀던 쪽으로 마저 내보낸 뒤 탭을 옮긴다. 그 자리에는 옆 화면(SwipePeek)이 이미 들어와 있어,
        // 새 화면은 들어오는 움직임 없이 그 자리에 바로 바꿔 놓는다(App 의 usePageIn 이 data-swiped 를 본다) — 두 번 들어오지 않게
        const out = `translateX(${Math.sign(done.dx) * innerWidth}px)`
        leaving = pageRef.current
        el.dataset.swiped = ''
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

    // 시스템이 터치를 가져가면(가장자리 뒤로 가기 등) 넘기지 않고 제자리로
    const cancel = (e: TouchEvent) => {
      if (s) Object.assign(s, { dx: 0, trail: [] })
      up(e)
    }

    addEventListener('touchstart', down, { passive: true })
    addEventListener('touchmove', move, { passive: false })
    addEventListener('touchend', up)
    addEventListener('touchcancel', cancel)
    return () => {
      removeEventListener('touchstart', down)
      removeEventListener('touchmove', move)
      removeEventListener('touchend', up)
      removeEventListener('touchcancel', cancel)
    }
  }, [enabled])
}
