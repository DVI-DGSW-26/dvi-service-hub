import { useEffect, useId, useRef,  type RefObject } from 'react'
import { project } from '@/shared/lib'
import { EASE } from '@/shared/constants'

/** 끌어 내려 닫을 때 남은 거리를 내려가는 최대 시간 */
export const SHEET_MS = 240

/** 휴대폰 — styles/overlay.css 의 시트 규칙과 같은 폭 */
export const SHEET_QUERY = '(max-width: 639.98px)'

/**
 * 휴대폰 시트를 끌어 내려 닫기. 손잡이뿐 아니라 시트 어디서든 — 누른 곳이 맨 위까지 스크롤된 상태에서
 * 아래로 끌면 내용 대신 시트가 손가락과 1:1 로 내려온다(가로로 넘기는 목록 · 스크롤 중인 목록은 그대로).
 * 뒤의 어두운 막도 내려온 만큼 옅어진다(--sheet-drag). 놓을 때의 속도로 멈출 자리를 내다봐
 * 시트 높이의 1/3 을 넘으면 그 속도 그대로 내려가 닫히고, 아니면 제자리로 돌아간다.
 * 휴대폰은 손가락이라 터치 이벤트로 받는다 — 맨 위에서 아래로 끄는 첫 움직임을 취소해야 브라우저가 스크롤로 가져가지 않는다.
 */
export function useSheetDrag(panel: RefObject<HTMLElement | null>, dialog: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })

  useEffect(() => {
    const el = panel.current
    const d = dialog.current
    if (!el || !d || !open) return
    let s: { x0: number; y0: number; last: number; t: number; v: number; mode: 'idle' | 'drag' | 'pass'; handle: boolean } | null = null

    const move = (y: number) => {
      el.style.transform = `translateY(${y}px)`
      d.style.setProperty('--sheet-drag', String(Math.max(0, y) / el.offsetHeight))
    }
    const settle = (y: string, ms: number, ease: string) => {
      el.style.transition = `transform ${ms}ms ${ease}`
      d.style.transition = `--sheet-drag ${ms}ms ${ease}`
      el.style.transform = `translateY(${y})`
      d.style.setProperty('--sheet-drag', y === '0' ? '0' : '1')
    }
    const back = () => settle('0', 420, EASE)

    const onStart = (e: TouchEvent) => {
      if (e.touches.length > 1 || !matchMedia(SHEET_QUERY).matches) {
        s = null
        return
      }
      const p = e.touches[0]
      const handle = !!(e.target as Element).closest('[data-sheet-handle]')
      s = { x0: p.clientX, y0: p.clientY, last: p.clientY, t: e.timeStamp, v: 0, mode: 'idle', handle }
    }
    const onMove = (e: TouchEvent) => {
      if (!s || s.mode === 'pass') return
      const p = e.touches[0]
      if (s.mode === 'idle') {
        const dx = p.clientX - s.x0
        const dy = p.clientY - s.y0
        // 조금 움직인 뒤에 방향을 정한다 — 누르기만 한 탭 · 살짝 떨린 손은 그대로 둔다
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        const down = dy > 0 && Math.abs(dy) > Math.abs(dx)
        s.mode = s.handle || (down && !canScroll(e.target, d, -1)) ? 'drag' : 'pass'
        if (s.mode === 'pass') return
        // 끌기 시작한 자리를 0 으로 — 방향을 정하느라 움직인 몇 px 만큼 튀지 않게
        s.y0 = p.clientY
        el.style.transition = 'none'
        d.style.transition = 'none'
      }
      e.preventDefault()
      const dt = e.timeStamp - s.t
      // 최근 움직임에 무게를 둔 속도 — 놓는 순간의 손 빠르기
      if (dt > 0) s.v = 0.8 * (((p.clientY - s.last) / dt) * 1000) + 0.2 * s.v
      s.last = p.clientY
      s.t = e.timeStamp
      const dy = p.clientY - s.y0
      // 위로는 올라가지 않는다 — 바닥에 붙은 시트라 올리면 아래가 뜬 게 보인다
      move(Math.max(0, dy))
    }
    const onEnd = (e: TouchEvent) => {
      const g = s
      s = null
      if (g?.mode !== 'drag') return
      // 끝에 멈췄다 놓으면 속도는 0
      const v = e.timeStamp - g.t > 80 ? 0 : g.v
      const dy = Math.max(0, g.last - g.y0)
      const h = el.offsetHeight
      if (dy + project(v, 0.998) > h / 3) { // 시트는 스크롤처럼 길게 미끄러진다
        // 손 속도를 이어받아 남은 거리를 내려간다 (느리게 놓아도 SHEET_MS 안에)
        const ms = Math.min(SHEET_MS, Math.max(120, ((h - dy) / Math.max(v, 1)) * 1000))
        d.dataset.dragged = ''
        settle('100%', ms, 'cubic-bezier(0.2, 0.6, 0.4, 1)')
        close.current()
      } else back()
    }
    const onCancel = () => {
      if (s?.mode === 'drag') back()
      s = null
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onCancel)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onCancel)
    }
  }, [panel, dialog, open])
}

/**
 * 뒤로 가기(휴대폰 뒤로 단추 · 브라우저 뒤로)로 닫기. 열 때 방문 기록을 하나 쌓고, 뒤로 가서 그 기록이 빠지면 닫는다.
 * 닫기 단추 · Esc · 바깥 누름으로 닫으면 쌓아 둔 기록을 되돌린다. 모달 위에 모달이 뜨면 기록도 차례로 쌓여 하나씩 닫힌다.
 * 주소(#/...)는 바꾸지 않으니 화면 이동(hashchange)은 일어나지 않는다.
 */
export function useBackToClose(open: boolean, onClose: () => void) {
  const id = useId()
  const close = useRef(onClose)
  // 지금 열려 있는지 — 정리 뒤 곧바로 다시 붙는 경우(개발 모드 StrictMode)를 가려낸다
  const active = useRef(false)
  useEffect(() => {
    close.current = onClose
  })

  useEffect(() => {
    if (!open) return
    active.current = true
    const modals = () => (history.state as { portalModals?: string[] } | null)?.portalModals
    const mine = () => modals()?.includes(id)
    if (!mine()) history.pushState({ ...history.state, portalModals: [...(modals() ?? []), id] }, '')
    const onPop = () => {
      if (!mine()) close.current()
    }
    addEventListener('popstate', onPop)
    return () => {
      active.current = false
      removeEventListener('popstate', onPop)
      // 한 박자 뒤에 — 그새 다시 열렸으면(StrictMode 의 정리 → 재실행) 기록을 그대로 둔다.
      // 뒤로 가기로 닫혔으면 기록은 이미 빠졌다
      window.setTimeout(() => {
        if (!active.current && mine()) history.back()
      })
    }
  }, [open, id])
}

export const SCROLL_KEYS: Record<string, number> = { ArrowDown: 1, PageDown: 1, End: 1, ' ': 1, ArrowUp: -1, PageUp: -1, Home: -1 }

/** 누른 자리부터 모달 끝까지 올라가며, 이 방향으로 더 스크롤할 수 있는 상자가 있는지 */
export function canScroll(target: EventTarget | null, root: HTMLElement, dir: number) {
  for (let el = target as HTMLElement | null; el && el !== root; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el)
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
      if (dir < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true
    }
  }
  return false
}

/**
 * 모달이 떠 있는 동안 뒤 화면 스크롤을 막는다. overflow:hidden 은 스크롤바를 없애 화면이 밀리므로 쓰지 않고,
 * 모달 안에서 더 굴릴 곳이 없는 휠 · 터치 · 키 입력만 취소한다.
 */
export function useScrollTrap(ref: RefObject<HTMLElement | null>, open: boolean) {
  useEffect(() => {
    const d = ref.current
    if (!d || !open) return
    let touchX = 0
    let touchY = 0
    // 취소할 수 없는 입력(트랙패드 관성 등)으로 밀려도 열 때 자리로 되돌린다
    const { scrollX: x, scrollY: y } = window
    const onScroll = () => {
      if (window.scrollX !== x || window.scrollY !== y) window.scrollTo(x, y)
    }
    const onWheel = (e: WheelEvent) => {
      if (!canScroll(e.target, d, Math.sign(e.deltaY))) e.preventDefault()
    }
    const onTouchStart = (e: TouchEvent) => {
      touchX = e.touches[0].clientX
      touchY = e.touches[0].clientY
    }
    const onTouchMove = (e: TouchEvent) => {
      const { clientX, clientY } = e.touches[0]
      // 가로로 넘기는 목록(조직도 팀 · 오늘 일정 날짜)은 그대로 — 뒤 화면은 가로로 스크롤되지 않는다(styles/base.css 의 overflow-x: clip)
      if (Math.abs(clientX - touchX) > Math.abs(clientY - touchY)) return
      if (!canScroll(e.target, d, Math.sign(touchY - clientY))) e.preventDefault()
    }
    const onKey = (e: KeyboardEvent) => {
      const dir = SCROLL_KEYS[e.key]
      const el = e.target as HTMLElement
      if (!dir || el.closest('input, textarea, select, [contenteditable]')) return
      if (e.key === ' ' && el.closest('button, a')) return // 스페이스는 버튼 누름
      if (!canScroll(el, d, dir)) e.preventDefault()
    }
    d.addEventListener('wheel', onWheel, { passive: false })
    d.addEventListener('touchstart', onTouchStart, { passive: true })
    d.addEventListener('touchmove', onTouchMove, { passive: false })
    d.addEventListener('keydown', onKey)
    addEventListener('scroll', onScroll)
    return () => {
      removeEventListener('scroll', onScroll)
      d.removeEventListener('wheel', onWheel)
      d.removeEventListener('touchstart', onTouchStart)
      d.removeEventListener('touchmove', onTouchMove)
      d.removeEventListener('keydown', onKey)
    }
  }, [ref, open])
}
