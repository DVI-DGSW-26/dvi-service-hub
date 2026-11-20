import { useLayoutEffect, useRef } from 'react'

/**
 * 칸 높이에 다 들어가지 않는 줄(목록의 자식)은 숨긴다 — 반쯤 잘린 줄이 보이지 않게. 칸이 커지면 보이는 줄이 저절로 는다(좁은 화면 고정 칸 위젯).
 * 목록은 높이가 정해져 있어야 한다(min-h-0 flex-1 overflow-hidden 등). on 이 아니면 아무것도 하지 않는다.
 * fill 이면 grid 목록의 남은 줄이 칸 높이를 나눠 채운다(숨긴 아래 빈 공간이 남지 않게) — 들어가는지는 줄의 제 높이로 잰다
 */
export function useClipRows<T extends HTMLElement>(on: boolean, fill = false) {
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const list = ref.current
    if (!list) return
    const rows = () => [...list.children] as HTMLElement[]
    const reset = () => {
      list.style.gridTemplateRows = ''
      for (const c of rows()) Object.assign(c.style, { visibility: '', display: '' })
    }
    reset()
    if (!on) return
    const fit = () => {
      reset()
      const bottom = list.getBoundingClientRect().bottom + 0.5
      const boxes = rows().map((c) => c.getBoundingClientRect())
      // fill 이면 빈자리를 남기지 않게 뺀다(display none) — 남은 줄 수만큼 1fr
      rows().forEach((c, k) => {
        if (boxes[k].bottom <= bottom) return
        if (fill) c.style.display = 'none'
        else c.style.visibility = 'hidden'
      })
      if (!fill) return
      const lines = new Set(boxes.filter((b) => b.bottom <= bottom).map((b) => Math.round(b.top))).size
      if (lines) list.style.gridTemplateRows = `repeat(${lines}, 1fr)`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(list)
    return () => ro.disconnect()
  })
  return ref
}
