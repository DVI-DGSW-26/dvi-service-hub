import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { useI18n } from '../../i18n'
import { motionOff } from '../../lib/theme'

interface ModalProps {
  open: boolean
  onClose: () => void
  /** 제목 요소의 id — 화면낭독기가 모달 이름으로 읽는다 */
  labelledBy: string
  /** 넓은 모달 — 그림과 글을 나란히 */
  wide?: boolean
  className?: string
  children: ReactNode
}

const CLOSE_MS = 170
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
 * 브라우저가 맡는다. 닫을 때는 사라지는 애니메이션(portal.css 의 data-closing)이 끝난 뒤 닫는다.
 */
export function Modal({ open, onClose, labelledBy, wide = false, className = '', children }: ModalProps) {
  const { t } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)
  useScrollTrap(ref, open)

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
      // 애니메이션을 껐으면 사라지는 효과를 기다리지 않는다
      const t = window.setTimeout(
        () => {
          d.close()
          delete d.dataset.closing
        },
        motionOff() ? 0 : CLOSE_MS,
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
        className={`glass-strong relative flex max-h-[calc(100dvh-32px)] flex-col overflow-hidden rounded-3xl ${wide ? 'w-[min(1200px,calc(100vw-24px))]' : 'w-[min(760px,calc(100vw-24px))]'} ${className}`}
      >
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
