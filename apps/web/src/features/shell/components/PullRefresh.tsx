import { RotateCw } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { queryClient } from '@/shared/api'

/** 손가락이 이만큼(px) 당기면 놓을 때 새로 고친다 — 표시는 손의 반만큼 내려온다 */
const PULL = 72

/** 손가락 아래에 이미 내려 둔 스크롤 칸이 있는지 — 그 칸의 맨 위로 가는 당김은 새로 고침이 아니다 */
function scrolledInside(target: EventTarget | null) {
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    if (el.scrollTop > 0) return true
  }
  return false
}

/**
 * 좁은 화면 당겨서 새로 고침 — 앱(WebView)에는 브라우저의 당겨서 새로 고침이 없고, 웹도 html 의 overscroll-behavior: none 이 막는다.
 * 화면 맨 위에서 아래로 당기면 상단 바 아래로 표시가 따라 내려오고, PULL 넘게 당겼다 놓으면 받아 둔 데이터를 모두 다시 받는다.
 * 페이지를 다시 불러오지 않는다 — 다시 불러오는 동안은 화면이 멈춰 돌던 표시도 멈췄다
 * 열린 창 · 옆으로 밀기(useSwipeTabs) · 안의 스크롤 칸 · 그 터치를 직접 받는 곳(preventDefault — 업무시스템 페이지 등)에서는 하지 않는다.
 * 리스너는 passive — 맨 위에서 아래로 당기는 것은 원래 스크롤되지 않아 막을 것이 없다
 */
export function PullRefresh({ enabled }: { enabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const iconRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const el = ref.current
    const icon = iconRef.current
    if (!enabled || !el || !icon) return
    let start: { x: number; y: number } | null = null
    let pulled = 0
    // 다시 받는 동안은 새 당김을 받지 않는다
    let busy = false

    const show = (px: number, settle = false) => {
      el.style.transition = settle ? 'translate 200ms ease, opacity 200ms ease' : ''
      el.style.translate = `-50% ${px}px`
      el.style.opacity = String(Math.min(1, px / (PULL / 2)))
      icon.style.rotate = `${px * 6}deg`
    }
    const reset = () => {
      start = null
      if (pulled) show(0, true)
      pulled = 0
    }

    const down = (e: TouchEvent) => {
      const t = e.touches[0]
      const free = !busy && e.touches.length === 1 && scrollY <= 0 && !document.querySelector('dialog[open]') && !scrolledInside(e.target)
      start = free ? { x: t.clientX, y: t.clientY } : null
      pulled = 0
    }
    const move = (e: TouchEvent) => {
      if (!start) return
      const t = e.touches[0]
      const [dx, dy] = [t.clientX - start.x, t.clientY - start.y]
      // 위로 · 옆으로 움직이거나, 다른 곳이 이 터치를 가져갔으면(preventDefault) 그만
      if (e.defaultPrevented || dy <= 0 || Math.abs(dx) > dy || scrollY > 0) {
        reset()
        return
      }
      pulled = Math.min(dy / 2, PULL)
      show(pulled)
    }
    const up = () => {
      if (!start) return
      if (pulled * 2 < PULL) {
        reset()
        return
      }
      start = null
      pulled = 0
      busy = true
      show(PULL / 2, true)
      icon.style.rotate = ''
      icon.classList.add('animate-spin')
      // 바로 받아져도 한 바퀴는 돌고 올라간다 — 깜빡이면 새로 받았는지 모른다
      void Promise.allSettled([queryClient.invalidateQueries(), new Promise((r) => setTimeout(r, 600))]).then(() => {
        icon.classList.remove('animate-spin')
        busy = false
        pulled = PULL
        reset()
      })
    }

    addEventListener('touchstart', down, { passive: true })
    addEventListener('touchmove', move, { passive: true })
    addEventListener('touchend', up)
    addEventListener('touchcancel', reset)
    return () => {
      removeEventListener('touchstart', down)
      removeEventListener('touchmove', move)
      removeEventListener('touchend', up)
      removeEventListener('touchcancel', reset)
    }
  }, [enabled])

  return (
    // 상단 바 바로 아래에서 내려온다 — 평소에는 투명. z-50 · 강조색 바탕: 반투명 bg-raised 는 다크 테마의 어두운 인사 카드 위에서 거의 안 보였다
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed top-[calc(4.5rem+env(safe-area-inset-top))] left-1/2 z-50 grid size-10 -translate-x-1/2 place-items-center rounded-full bg-accent-fill text-white opacity-0 shadow-[0_4px_14px_oklch(0_0_0/0.35)] ring-1 ring-white/20 lg:hidden"
    >
      <RotateCw ref={iconRef} className="size-5" strokeWidth={2.4} />
    </div>
  )
}
