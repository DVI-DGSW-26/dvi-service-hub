import { useLayoutEffect, useRef } from 'react'

/**
 * 칸 높이에 다 들어가지 않는 줄(목록의 자식)은 숨긴다 — 반쯤 잘린 줄이 보이지 않게. 칸이 커지면 보이는 줄이 저절로 는다(좁은 화면 고정 칸 위젯).
 * 목록은 높이가 정해져 있어야 한다(min-h-0 flex-1 overflow-hidden 등). on 이 아니면 아무것도 하지 않는다
 */
export function useClipRows<T extends HTMLElement>(on: boolean) {
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const list = ref.current
    if (!list) return
    const rows = () => [...list.children] as HTMLElement[]
    if (!on) {
      for (const c of rows()) c.style.visibility = ''
      return
    }
    const fit = () => {
      const bottom = list.getBoundingClientRect().bottom + 0.5
      for (const c of rows()) c.style.visibility = c.getBoundingClientRect().bottom > bottom ? 'hidden' : ''
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(list)
    return () => ro.disconnect()
  })
  return ref
}
