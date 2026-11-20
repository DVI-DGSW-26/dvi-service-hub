import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/** 위 · 아래로 이만큼(px) 넘게 쓸고 놓으면 넘긴다 */
const FLIP_PX = 40
/** 넘긴 뒤 이만큼(ms)은 다음 쓸기를 받지 않는다 — 크게 쓸어도 한 페이지씩 */
const FLIP_REST = 300

/**
 * 카드를 칸에 다 들어가는 만큼씩 페이지로 나눈다 — 옆으로 밀거나(터치 · 트랙패드, CSS scroll-snap) 아래 점을 눌러 넘긴다.
 * 터치는 위 · 아래로 쓸어도 넘긴다(결과는 같다) — 그쪽에 페이지가 없으면 화면이 스크롤된다.
 * 한 페이지는 열 수 × 들어가는 줄 수. 줄 수는 카드의 제 높이로 재고, 그 줄들이 칸 높이를 나눠 채운다(카드 크기는 모두 같다).
 * fixed 면 한 페이지 장수가 정해져 있다(재지 않는다 — 줄은 페이지 grid 의 class 가 정한다).
 * ref 는 옆으로 넘기는 틀 — 자식마다 grid 페이지 하나(높이가 정해져 있어야 한다)
 */
export function useCardPages<T extends HTMLElement>(count: number, fixed?: number) {
  const ref = useRef<T>(null)
  const [measured, setPerPage] = useState(count)
  const perPage = fixed ?? measured
  const [scrolled, setPage] = useState(0)
  useLayoutEffect(() => {
    const view = ref.current
    if (!view || fixed) return
    const fit = () => {
      const grids = [...view.children] as HTMLElement[]
      const first = grids[0] as HTMLElement | undefined
      if (!first?.firstElementChild) return
      // 줄을 제 높이로 풀어 가장 큰 카드 높이를 잰다 — 페이지가 달라도 카드 크기는 모두 같게(폭은 페이지마다 같다)
      for (const g of grids) g.style.gridTemplateRows = ''
      const cardH = Math.max(...grids.flatMap((g) => [...g.children].map((c) => c.getBoundingClientRect().height)))
      const style = getComputedStyle(first)
      const gap = parseFloat(style.rowGap) || 0
      const cols = style.gridTemplateColumns.split(' ').length
      const height = first.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      const lines = Math.max(1, Math.floor((height + gap) / (cardH + gap)))
      for (const g of grids) g.style.gridTemplateRows = `repeat(${lines}, minmax(0, 1fr))`
      setPerPage(cols * lines)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(view)
    return () => ro.disconnect()
    // 카드 수 · 페이지 나눔이 바뀔 때와 틀 크기가 바뀔 때만 — 넘기는 중(page)에 다시 재면 줄을 풀었다 묶는 사이 부드러운 넘기기가 멈춘다
  }, [count, perPage, fixed])
  const pageCount = Math.max(1, Math.ceil(count / perPage))
  const page = Math.min(scrolled, pageCount - 1)
  const go = (p: number) => ref.current?.scrollTo({ left: p * ref.current.clientWidth, behavior: 'smooth' })

  // 위 · 아래로 쓸기 — 처음 8px 로 방향을 정하고(브라우저가 스크롤을 시작하기 전), 세로면서 그쪽에 페이지가 있을 때만 스크롤을 막는다.
  // 페이지가 손을 따라 위 · 아래로 움직이고, 놓으면 다음 페이지가 아래에서(이전 페이지는 위에서) 올라온다 — 넘어간 결과는 옆으로 쓴 것과 같다.
  // 한 번 쓸면 한 페이지, 넘긴 뒤 잠깐(FLIP_REST)은 다음 쓸기를 받지 않는다. React 의 터치 핸들러는 passive 라 막을 수 없어 직접 건다
  useEffect(() => {
    const view = ref.current
    if (!view || pageCount < 2) return
    let s: { x: number; y: number; dy: number; from: number; resting: boolean; axis?: 'x' | 'y' } | null = null
    let rest = 0
    // 지금 페이지는 스크롤 자리에서 — page 는 scroll 이벤트가 와야 바뀐다
    const at = () => Math.round(view.scrollLeft / view.clientWidth)
    const pageEl = (k: number) => view.children[k] as HTMLElement | undefined
    const ok = (k: number) => k >= 0 && k < pageCount
    const slide = (el: HTMLElement | undefined, from: number) => {
      if (!el) return
      el.style.transform = ''
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) el.animate([{ transform: `translateY(${from}px)` }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' })
    }
    const down = (e: TouchEvent) => {
      const t = e.touches[0]
      // 쉬는 중에 쓸어도 화면이 스크롤되지 않게 받기는 받고, 넘기지는 않는다
      s = e.touches.length === 1 ? { x: t.clientX, y: t.clientY, dy: 0, from: at(), resting: performance.now() < rest } : null
    }
    const move = (e: TouchEvent) => {
      if (!s) return
      const t = e.touches[0]
      const [dx, dy] = [t.clientX - s.x, t.clientY - s.y]
      if (!s.axis) {
        if (Math.hypot(dx, dy) < 8) return
        s.axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x'
        // 옆으로 쓸기는 브라우저(scroll-snap)가, 그쪽에 페이지가 없으면 화면 스크롤이 맡는다
        if (s.axis === 'x' || !ok(s.from - Math.sign(dy))) return void (s = null)
      }
      e.preventDefault()
      s.dy = dy
      const el = pageEl(s.from)
      // 페이지가 없는 쪽으로 되돌리면 버티며 조금만
      if (el) el.style.transform = `translateY(${ok(s.from - Math.sign(dy)) ? dy : dy / 4}px)`
    }
    const up = () => {
      if (!s) return
      const { from, dy, resting } = s
      const to = from - Math.sign(dy)
      s = null
      if (resting || Math.abs(dy) < FLIP_PX || !ok(to)) {
        slide(pageEl(from), dy)
        return
      }
      slide(pageEl(from), 0)
      view.scrollTo({ left: to * view.clientWidth, behavior: 'instant' })
      slide(pageEl(to), -Math.sign(dy) * view.clientHeight)
      rest = performance.now() + FLIP_REST
    }
    const cancel = () => {
      if (s) slide(pageEl(s.from), s.dy)
      s = null
    }
    view.addEventListener('touchstart', down, { passive: true })
    view.addEventListener('touchmove', move, { passive: false })
    view.addEventListener('touchend', up)
    view.addEventListener('touchcancel', cancel)
    return () => {
      view.removeEventListener('touchstart', down)
      view.removeEventListener('touchmove', move)
      view.removeEventListener('touchend', up)
      view.removeEventListener('touchcancel', cancel)
    }
  }, [pageCount])

  return {
    ref,
    perPage,
    page,
    pageCount,
    onScroll: () => {
      const v = ref.current
      if (v) setPage(Math.round(v.scrollLeft / v.clientWidth))
    },
    go,
  }
}
