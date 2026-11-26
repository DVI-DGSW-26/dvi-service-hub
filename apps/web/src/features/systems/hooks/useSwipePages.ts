import { useEffect, type RefObject } from 'react'
import { VELOCITY_WINDOW } from '@/shared/constants'
import { releaseSpeed, type Trail } from '@/shared/lib'

// 넘길 페이지 고르기 — Android ViewPager(determineTargetPage)와 같다: 25dp 넘게 끌고 400dp/s 넘게 던졌으면 던진 쪽으로,
// 아니면 절반 넘게 끌었을 때만. 그리고 Compose Pager 의 기본(PagerSnapDistance.atMost(1))처럼 한 번에 한 페이지까지
/** 이만큼(px) 넘게 끌어야 던지기로 본다 */
const FLING_PX = 25
/** 이 빠르기(px/ms = 1000px/s)를 넘게 던지면 절반을 안 끌어도 넘긴다 */
const FLING_SPEED = 0.4
/** 넘긴 뒤 이만큼(ms)은 쓸어도 넘기지 않는다 — 연달아 크게 써도 한 페이지씩 */
const FLIP_REST = 300
/** 손을 대고 이만큼(ms) 넘게 옆으로 끌다 놓으면 여러 페이지 — 손을 뗀 자리에서 가장 가까운 페이지로. 그보다 짧으면 한 페이지만 */
const HOLD_MULTI = 1300
/** 휠 · 트랙패드로 옆으로 이만큼(px) 밀면 한 페이지 */
const WHEEL_PX = 40
/** 휠 이벤트가 이만큼(ms) 끊기면 한 번 밀기가 끝난 것 — 트랙패드 관성으로 이어지는 이벤트는 같은 밀기라 더 넘기지 않는다 */
const WHEEL_GAP = 200

/** 여러 페이지 넘기기의 도착 — 손을 뗀 자리(near, 페이지 단위)에서 가장 가까운 페이지, 던졌으면(빠르기 v) 던진 쪽. 0 ~ last 안에서 */
const landing = (near: number, v: number, flung: boolean, last: number) =>
  Math.max(0, Math.min(last, flung ? (v < 0 ? Math.ceil(near) : Math.floor(near)) : Math.round(near)))

/** 쓰는 중 — 시작점 · 시작 시각(at) · 시작 페이지 · 끈 거리(d) · 그린 거리(shown) · 지난 자리(trail, 빠르기용) · 방향 */
interface Swipe { x: number; y: number; at: number; from: number; resting: boolean; d: number; shown: number; trail: Trail; axis?: 'x' | 'y' }

/**
 * 페이지 틀(ref, 자식마다 페이지 하나 · 옆으로 scroll-snap)을 손가락으로 넘기기 — 옆으로도 위 · 아래로도, 넘어간 결과는 같다.
 * 처음 8px 로 방향을 정하고(브라우저가 스크롤을 시작하기 전) 그 뒤는 직접 그린다 — 브라우저의 관성 스크롤에 맡기면 크게 던질 때 두 장씩 넘어간다.
 * 옆은 페이지들이 손을 따라 옆으로, 위 · 아래는 지금 페이지가 손을 따라 위 · 아래로 움직이고, 놓으면 다음 페이지가 그쪽에서 들어온다.
 * 위 · 아래로 쓸 때 그쪽에 페이지가 없으면 받지 않는다(화면이 스크롤된다). 옆으로 HOLD_MULTI 넘게 끌다 놓으면 여러 페이지.
 * 휠 · 트랙패드도 옆으로 한 번 밀면 한 페이지 — 브라우저 스크롤에 맡기면 관성으로 여러 장이 넘어간다.
 * 틀은 브라우저가 옆으로 스크롤을 시작하지 않게 touch-action: pan-y 여야 한다(CardPages) — 시작해 버리면 막을 수 없다.
 * React 의 터치 · 휠 핸들러는 passive 라 막을 수 없어 직접 건다
 */
export function useSwipePages(ref: RefObject<HTMLElement | null>, pageCount: number) {
  useEffect(() => {
    const view = ref.current
    if (!view || pageCount < 2) return
    let s: Swipe | null = null
    let rest = 0
    // 지금 페이지는 스크롤 자리에서 — 페이지 상태는 scroll 이벤트가 와야 바뀐다
    const at = () => Math.round(view.scrollLeft / view.clientWidth)
    const pages = () => [...view.children] as HTMLElement[]
    const ok = (k: number) => k >= 0 && k < pageCount
    const move = (els: HTMLElement[], axis: 'x' | 'y', px: number) => {
      for (const el of els) el.style.transform = px ? `translate${axis.toUpperCase()}(${px}px)` : ''
    }
    // 쓰는 동안 · 미끄러지는 동안은 scroll-snap 을 끈다 — 브라우저가 옮겨 그린(transform) 페이지 자리로 다시 붙여 한 장이 더 넘어간다
    const snap = (on: boolean) => (view.style.scrollSnapType = on ? '' : 'none')
    /** els 를 축 axis 로 from(px)에서 제자리로 — 다 미끄러지면(쓰는 중이 아니면) scroll-snap 을 다시 켠다 */
    const settle = (els: HTMLElement[], axis: 'x' | 'y', from: number) => {
      move(els, axis, 0)
      const reduce = !from || matchMedia('(prefers-reduced-motion: reduce)').matches
      const anims = reduce ? [] : els.map((el) => el.animate([{ transform: `translate${axis.toUpperCase()}(${from}px)` }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }))
      void Promise.all(anims.map((a) => a.finished.catch(() => undefined))).then(() => !s?.axis && snap(true))
    }

    const down = (e: TouchEvent) => {
      const t = e.touches[0]
      // 쉬는 중에 쓸어도 화면이 스크롤되지 않게 받기는 받고, 넘기지는 않는다
      s = e.touches.length === 1 ? { x: t.clientX, y: t.clientY, at: e.timeStamp, from: at(), resting: performance.now() < rest, d: 0, shown: 0, trail: [] } : null
    }
    const drag = (e: TouchEvent) => {
      if (!s) return
      const t = e.touches[0]
      const [dx, dy] = [t.clientX - s.x, t.clientY - s.y]
      if (!s.axis) {
        if (Math.hypot(dx, dy) < 8) return
        s.axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x'
        if (s.axis === 'y' && !ok(s.from - Math.sign(dy))) return void (s = null)
        snap(false)
      }
      e.preventDefault()
      const d = s.axis === 'x' ? dx : dy
      s.trail.push({ t: e.timeStamp, p: d })
      s.d = d
      // 페이지가 없는 쪽은 버티며 조금만 — 옆은 끝 페이지까지 따라오고(여러 페이지 넘기기), 위 · 아래는 한 페이지
      const [lo, hi] = s.axis === 'x' ? [(s.from - pageCount + 1) * view.clientWidth, s.from * view.clientWidth] : ok(s.from - Math.sign(d)) ? [-Infinity, Infinity] : [0, 0]
      s.shown = d > hi ? hi + (d - hi) / 4 : d < lo ? lo + (d - lo) / 4 : d
      move(s.axis === 'x' ? pages() : pages().slice(s.from, s.from + 1), s.axis, s.shown)
    }
    const up = (e: TouchEvent) => {
      if (!s?.axis) return void (s = null)
      const { axis, from, d, shown, resting } = s
      // 놓기 직전에 멈췄으면 0 — 던지기가 아니다
      const v = releaseSpeed(s.trail, e.timeStamp, VELOCITY_WINDOW)
      const multi = axis === 'x' && e.timeStamp - s.at >= HOLD_MULTI
      s = null
      const size = axis === 'x' ? view.clientWidth : view.clientHeight
      const flung = Math.abs(d) > FLING_PX && Math.abs(v) > FLING_SPEED
      const dir = flung ? -Math.sign(v) : Math.abs(d) > size / 2 ? -Math.sign(d) : 0
      const target = multi ? landing(from - shown / size, v, flung, pageCount - 1) : from + dir
      const to = resting || !ok(target) ? from : target
      if (to === from) {
        settle(axis === 'x' ? pages() : pages().slice(from, from + 1), axis, shown)
        return
      }
      move(pages(), axis, 0)
      view.scrollTo({ left: to * view.clientWidth, behavior: 'instant' })
      // 옆은 페이지들이 손을 뗀 자리에서 이어 미끄러지고, 위 · 아래는 새 페이지가 그쪽(위로 쓸면 아래)에서 들어온다
      if (axis === 'x') settle(pages(), 'x', (to - from) * size + shown)
      else settle(pages().slice(to, to + 1), 'y', (to - from) * size)
      rest = performance.now() + FLIP_REST
    }
    const cancel = () => {
      if (s?.axis) settle(pages(), s.axis, 0)
      s = null
    }
    // 휠 · 트랙패드 — 옆으로 민 한 번(이벤트가 WHEEL_GAP 넘게 끊길 때까지)에 한 페이지. 위 · 아래 휠은 화면 스크롤 그대로
    let wheel = { last: -Infinity, sum: 0, done: false }
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      if (e.timeStamp - wheel.last > WHEEL_GAP) wheel = { last: 0, sum: 0, done: false }
      wheel.last = e.timeStamp
      wheel.sum += e.deltaX
      if (wheel.done || Math.abs(wheel.sum) < WHEEL_PX) return
      wheel.done = true
      const to = at() + Math.sign(wheel.sum)
      if (ok(to)) view.scrollTo({ left: to * view.clientWidth, behavior: 'smooth' })
    }
    view.addEventListener('touchstart', down, { passive: true })
    view.addEventListener('touchmove', drag, { passive: false })
    view.addEventListener('touchend', up)
    view.addEventListener('touchcancel', cancel)
    view.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      view.removeEventListener('touchstart', down)
      view.removeEventListener('touchmove', drag)
      view.removeEventListener('touchend', up)
      view.removeEventListener('touchcancel', cancel)
      view.removeEventListener('wheel', onWheel)
    }
  }, [ref, pageCount])
}
