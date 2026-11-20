import { useLayoutEffect, useRef, useState } from 'react'
import { useSwipePages } from './useSwipePages'

/**
 * 카드를 칸에 다 들어가는 만큼씩 페이지로 나눈다 — 손가락으로 옆 · 위아래로 쓸거나(useSwipePages), 트랙패드(CSS scroll-snap) · 아래 점으로 넘긴다.
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

  useSwipePages(ref, pageCount)

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
