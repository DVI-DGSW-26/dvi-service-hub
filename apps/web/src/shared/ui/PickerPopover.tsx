import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties,  type ReactNode, type RefObject } from 'react'
interface PickerPopoverProps {
  open: boolean
  /** 펼친 버튼 — 그 아래(자리가 없으면 위)에 붙는다 */
  anchor: RefObject<HTMLElement | null>
  onClose: () => void
  label: string
  /** 펼친 버튼과 같은 너비로 (고르기 칸) */
  matchWidth?: boolean
  /** Esc 로 닫은 뒤 초점이 돌아갈 곳. 없으면 anchor */
  returnFocus?: RefObject<HTMLElement | null>
  className?: string
  children: ReactNode
}

/**
 * 날짜 · 시각 고르기 판. 모달 안 스크롤 상자에 잘리지 않도록 화면 기준(fixed)으로 띄운다.
 * 바깥을 누르거나 뒤가 스크롤되면 닫힌다. Esc 는 판만 닫고 모달은 그대로 둔다(기본 동작을 막아 dialog 의 cancel 이 일지 않게).
 */
export function PickerPopover({ open, anchor, onClose, label, matchWidth = false, returnFocus, className = '', children }: PickerPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<CSSProperties>()

  // 첫 그림은 숨긴 채 크기를 재고, 칠하기 전에 자리를 잡는다
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 닫으면 다음에 열 때 다시 재도록 자리를 지운다
    if (!open) { setPos(undefined); return; }
    const a = anchor.current?.getBoundingClientRect()
    const el = ref.current
    if (!a || !el) return
    // 너비를 먼저 맞춰야 높이를 제대로 잰다
    if (matchWidth) el.style.width = `${a.width}px`
    const below = innerHeight - a.bottom - 12 >= el.offsetHeight
    setPos({
      left: Math.max(8, Math.min(a.left, innerWidth - el.offsetWidth - 8)),
      top: below ? a.bottom + 6 : Math.max(8, a.top - el.offsetHeight - 6),
      ...(matchWidth && { width: a.width }),
    })
  }, [open, anchor, matchWidth])

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 판 밖(false)이면 단추 쪽도 봐야 한다
    const inside = (t: EventTarget | null) => ref.current?.contains(t as Node) || anchor.current?.contains(t as Node)
    const onPointer = (e: PointerEvent) => !inside(e.target) && onClose()
    const onScroll = (e: Event) => !ref.current?.contains(e.target as Node) && onClose()
    document.addEventListener('pointerdown', onPointer)
    addEventListener('scroll', onScroll, true)
    addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      removeEventListener('scroll', onScroll, true)
      removeEventListener('resize', onClose)
    }
  }, [open, anchor, onClose])

  if (!open) return null
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- 안의 칸에서 올라온 Esc 를 판이 받아 판만 닫는다
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        e.preventDefault()
        e.stopPropagation()
        onClose()
        ;(returnFocus ?? anchor).current?.focus()
      }}
      // 재는 동안은 투명하게만 — visibility: hidden 이면 펼치자마자 안쪽 칸에 초점을 줄 수 없다
      style={{ position: 'fixed', ...(pos ?? { top: 0, left: 0, opacity: 0, pointerEvents: 'none' }) }}
      className={`glass-strong animate-materialize z-50 rounded-2xl p-3 text-fg ${className}`}
    >
      {children}
    </div>
  )
}
