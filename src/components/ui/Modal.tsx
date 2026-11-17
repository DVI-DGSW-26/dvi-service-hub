import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { useI18n } from '../../i18n'
import { project, rubberband } from '../../lib/spring'
import { motionOff } from '../../lib/theme'

interface ModalProps {
  open: boolean
  onClose: () => void
  /** 제목 요소의 id — 화면낭독기가 모달 이름으로 읽는다 */
  labelledBy: string
  /** 넓은 모달 — 그림과 글을 나란히 */
  wide?: boolean
  /** 화면을 거의 다 채우는 모달 (캘린더 크게 보기) */
  full?: boolean
  className?: string
  children: ReactNode
}

const CLOSE_MS = 170
/** 끌어 내려 닫을 때 남은 거리를 내려가는 최대 시간 */
const SHEET_MS = 240
/** 휴대폰 — styles.css 의 시트 규칙과 같은 폭 */
const SHEET_QUERY = '(max-width: 639.98px)'

/**
 * 휴대폰 시트를 끌어 내려 닫기. 손잡이뿐 아니라 시트 어디서든 — 누른 곳이 맨 위까지 스크롤된 상태에서
 * 아래로 끌면 내용 대신 시트가 손가락과 1:1 로 내려온다(가로로 넘기는 목록 · 스크롤 중인 목록은 그대로).
 * 뒤의 어두운 막도 내려온 만큼 옅어진다(--sheet-drag). 놓을 때의 속도로 멈출 자리를 내다봐
 * 시트 높이의 1/3 을 넘으면 그 속도 그대로 내려가 닫히고, 아니면 제자리로 돌아간다.
 * 휴대폰은 손가락이라 터치 이벤트로 받는다 — 맨 위에서 아래로 끄는 첫 움직임을 취소해야 브라우저가 스크롤로 가져가지 않는다.
 */
function useSheetDrag(panel: RefObject<HTMLDivElement | null>, dialog: RefObject<HTMLDialogElement | null>, open: boolean, onClose: () => void) {
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
    const back = () => settle('0', 420, 'cubic-bezier(0.32, 0.72, 0, 1)')

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
      move(dy < 0 ? -rubberband(-dy, el.offsetHeight) : dy)
    }
    const onEnd = (e: TouchEvent) => {
      const g = s
      s = null
      if (!g || g.mode !== 'drag') return
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
function useBackToClose(open: boolean, onClose: () => void) {
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
    const mine = () => (history.state?.portalModals as string[] | undefined)?.includes(id)
    if (!mine()) history.pushState({ ...history.state, portalModals: [...(history.state?.portalModals ?? []), id] }, '')
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

const SCROLL_KEYS: Record<string, number> = { ArrowDown: 1, PageDown: 1, End: 1, ' ': 1, ArrowUp: -1, PageUp: -1, Home: -1 }

/** 누른 자리부터 모달 끝까지 올라가며, 이 방향으로 더 스크롤할 수 있는 상자가 있는지 */
function canScroll(target: EventTarget | null, root: HTMLElement, dir: number) {
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
function useScrollTrap(ref: RefObject<HTMLDialogElement | null>, open: boolean) {
  useEffect(() => {
    const d = ref.current
    if (!d || !open) return
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
      touchY = e.touches[0].clientY
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!canScroll(e.target, d, Math.sign(touchY - e.touches[0].clientY))) e.preventDefault()
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

/**
 * 네이티브 <dialog> 모달. 초점 가두기 · 뒤 화면 비활성 · 닫은 뒤 원래 버튼으로 초점 복귀는
 * 브라우저가 맡는다. 닫을 때는 사라지는 애니메이션(styles.css 의 data-closing)이 끝난 뒤 닫는다.
 * 휴대폰에서는 화면 아래에 붙어 올라오는 시트가 된다 — 엄지가 닿는 쪽이고, 손잡이를 끌어 내려 닫는다.
 */
export function Modal({ open, onClose, labelledBy, wide = false, full = false, className = '', children }: ModalProps) {
  const { t } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  useScrollTrap(ref, open)
  useSheetDrag(panelRef, ref, open, onClose)
  useBackToClose(open, onClose)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open) {
      // 닫히는 애니메이션 도중 다시 열면(close 타이머는 정리 함수가 취소했다) 마저 닫고 처음처럼 연다
      // — 닫힘 표시만 떼면 맺히는 애니메이션이 첫 프레임(투명)에 멈춘 채 남는다
      if ('closing' in d.dataset) {
        delete d.dataset.closing
        d.close()
      }
      if (!d.open) d.showModal()
    } else if (d.open) {
      d.dataset.closing = ''
      // 끌어 내려 닫으면 손 속도로 내려가는 중이라 그 시간만큼 기다린다. 애니메이션을 껐으면 기다리지 않는다
      const t = window.setTimeout(
        () => {
          d.close()
          delete d.dataset.closing
          delete d.dataset.dragged
          panelRef.current?.style.removeProperty('transform')
          panelRef.current?.style.removeProperty('transition')
          d.style.removeProperty('--sheet-drag')
          d.style.removeProperty('transition')
        },
        motionOff() ? 0 : 'dragged' in d.dataset ? SHEET_MS : CLOSE_MS,
      )
      return () => window.clearTimeout(t)
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      className="modal"
      // Esc: 바로 닫지 않고 애니메이션을 거쳐 닫는다
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      // 바깥(어두운 막)을 누르면 닫는다
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className={`glass-strong relative flex max-h-[calc(100dvh-32px)] flex-col overflow-hidden rounded-3xl max-sm:h-[85dvh] max-sm:max-h-none max-sm:w-full max-sm:rounded-b-none max-sm:pb-[env(safe-area-inset-bottom)] ${full ? 'h-[calc(100dvh-24px)] max-h-none w-[calc(100vw-24px)]' : wide ? 'w-[min(1200px,calc(100vw-24px))]' : 'w-[min(760px,calc(100vw-24px))]'} ${className}`}
      >
        {/*
          휴대폰 시트는 내용과 상관없이 늘 화면의 85% 높이다 — 손잡이 · 닫기 단추 · 아래 버튼 줄이 매번 같은 자리에 있고,
          공지를 넘겨도 시트가 들썩이지 않는다. 위쪽 15% 는 어두운 막이 보여 '뒤에 화면이 있다' 는 걸 알리고,
          한 손으로도 그 막을 눌러 닫을 수 있다. 짧은 내용은 본문 칸이 남는 높이를 채우고, 긴 내용은 그 안에서 스크롤한다.
        */}
        {/* 휴대폰 시트 손잡이 — 여기서는 어느 방향으로 움직여도 시트를 끈다 (닫기 단추는 그대로 둔다) */}
        <div
          aria-hidden="true"
          data-sheet-handle
          className="absolute inset-x-16 top-0 z-[5] flex h-8 touch-none justify-center pt-2 sm:hidden"
        >
          <span className="h-1.5 w-10 rounded-full bg-fg/25" />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.common.close}
          className="absolute top-3 right-3 z-10 grid size-11 cursor-pointer place-items-center rounded-full bg-surface text-fg shadow-[0_2px_8px_oklch(0_0_0/0.15)] ring-1 ring-line transition-[background-color,scale] duration-150 hover:bg-raised active:scale-90"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        {children}
      </div>
    </dialog>
  )
}
