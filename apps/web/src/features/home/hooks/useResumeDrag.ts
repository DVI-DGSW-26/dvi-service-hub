import { useEffect, type RefObject } from 'react'
import { SLIDE } from '../lib/constants'
import { readTranslate } from '../lib/readTranslate'
import { reducedMotion } from '@/shared/lib'

interface ResumeDragRefs {
  /** 옆 페이지로 넘긴 뒤 새 판에서 이어 끌 위젯 — 읽고 비운다 */
  resume: RefObject<string | null>
  /** 마지막 손 위치 */
  hand: RefObject<{ x: number; y: number; touch: boolean }>
  /** 잡은 점이 위젯 왼쪽 위에서 떨어진 거리(ox · oy) */
  grab: RefObject<{ ox: number; oy: number }>
  /** 누른 자리 — 다시 누를 때 여기에 적는다 */
  downAt: RefObject<{ x: number; y: number }>
  viewRef: RefObject<HTMLDivElement | null>
}

/**
 * 끄는 중에 옆 페이지로 넘겼으면(마우스) 새 판에서 같은 위젯을 다시 눌러 이어 끈다.
 * 새 페이지가 다 미끄러져 들어온 뒤에, 그때의 손 자리에서 — 미끄러지는 중에 누르면 react-grid-layout 이 움직이는 판 기준으로 재어
 * 판이 온 만큼 위젯이 튄다. 바로 누르면 끌기가 시작만 되고 따라오지 않았다(동작 줄이기면 미끄러짐이 없어 조금 일찍 이어진다)
 */
export function useResumeDrag({ resume: resumeRef, hand, grab, downAt, viewRef }: ResumeDragRefs) {
  // 렌더마다 본다 — resume 은 넘긴 렌더에만 차 있다
  useEffect(() => {
    const r = resumeRef.current
    resumeRef.current = null
    if (!r) return
    const slide = reducedMotion() ? 50 : SLIDE
    // 새 판의 위젯을 처음 잡은 점이 손 아래 오게 옮겨 둔다
    const stick = () => {
      const el = viewRef.current?.querySelector<HTMLElement>(`.widget-page:not(.invisible) [data-type="${r}"]`)
      if (!el) return null
      const box = el.getBoundingClientRect()
      const [left, top] = readTranslate(el)
      el.style.transition = 'none'
      el.style.transform = `translate(${left + hand.current.x - box.left - grab.current.ox}px, ${top + hand.current.y - box.top - grab.current.oy}px)`
      return el
    }
    // 옛 끌기가 끝나 onDrag 가 손을 못 따라가니 그동안은 직접 따라간다. 그새 놓았으면(터치 포함) 이어 끌지 않는다 — 위젯은 손 아래 칸에 놓여 있다
    let up = false
    const follow = (e: PointerEvent) => {
      hand.current = { ...hand.current, x: e.clientX, y: e.clientY }
      if (!hand.current.touch) stick()
    }
    const lift = () => void (up = true)
    document.addEventListener('pointermove', follow)
    document.addEventListener('pointerup', lift)
    window.setTimeout(() => {
      document.removeEventListener('pointermove', follow)
      document.removeEventListener('pointerup', lift)
      if (up || hand.current.touch) return
      // 위젯을 손 아래(처음 잡은 점)로 옮겨 두고 손 자리에서 누른다 — 위젯과 손이 떨어진 채 누르면 첫 움직임이 크게 튀는데,
      // react-grid-layout 은 다시 그리기 전에 온 움직임을 버리면서도 기준점은 옮겨 그 거리만큼 위젯이 손에서 영영 떨어진다
      const el = stick()
      downAt.current = { x: hand.current.x, y: hand.current.y }
      el?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: hand.current.x, clientY: hand.current.y, button: 0, buttons: 1 }))
      if (el) el.style.transition = ''
    }, slide)
  })
}
