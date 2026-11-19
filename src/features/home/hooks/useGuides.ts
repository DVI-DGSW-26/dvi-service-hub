import { useRef } from 'react'
import type { Guide } from '../lib/widgetLayout'

/** 보고 있는 페이지의 기준선 판 — 끄는 동안 자주 바뀌어 React 로 다시 그리지 않고 직접 그린다 */
export function useGuides() {
  const guideRef = useRef<HTMLDivElement>(null)
  const drawn = useRef('')
  // 손이 움직일 때마다 불린다 — 선이 그대로면 다시 그리지 않는다(나타나는 애니메이션이 매번 다시 돌지 않게)
  const drawGuides = (list: Guide[]) => {
    const key = JSON.stringify(list)
    if (key === drawn.current) return
    drawn.current = key
    guideRef.current?.replaceChildren(
      ...list.map((g) => {
        const line = document.createElement('i')
        line.dataset.dir = g.vertical ? 'v' : 'h'
        for (const [k, v] of Object.entries({ at: g.at, from: g.from, to: g.to })) line.style.setProperty(`--${k}`, String(v))
        return line
      }),
    )
  }
  return { guideRef, drawGuides }
}
