import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { PHONE } from '@/shared/constants'
import { useMedia } from '@/shared/hooks'
import { useBackToClose, useScrollTrap, useSheetDrag } from './modalBehavior'

/**
 * 버튼 아래로 펼쳐지는 유리 패널. 누른 버튼(오른쪽 위)에서 자라나듯 나타난다 —
 * 어디서 왔는지 보이도록 transform-origin 을 버튼 쪽에 둔다.
 * 휴대폰에서는 모달 <dialog> 로 맨 위 층에 올려 아래 시트로 편다(styles/overlay.css 의 .popover-panel) — 편집 독처럼 transform 이 걸린
 * 부모 안에서도 화면 기준으로 놓이고, 뒤 화면은 눌리지 않는다(popover 의 막은 브라우저가 pointer-events: none 이라 누름이 뒤 위젯으로 샌다).
 * 모달 시트처럼 손잡이 · 아래로 끌어 닫기 · 뒤로 가기로 닫기가 된다.
 */
export function PopoverPanel({ label, onClose, className = '', children }: { label: string; onClose: () => void; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const sheet = useMedia(PHONE)
  useLayoutEffect(() => {
    if (sheet && !ref.current?.open) ref.current?.showModal()
  }, [sheet])
  const Tag = sheet ? 'dialog' : 'div'
  // 끌어 내려 닫으면 손 속도로 내려가는 transition 이 끝난 뒤에 지운다 — 바로 지우면 시트가 그 자리에서 사라진다
  useSheetDrag(ref, ref, sheet, () => {
    void Promise.allSettled(ref.current?.getAnimations().map((a) => a.finished) ?? []).then(onClose)
  })
  useBackToClose(sheet, onClose)
  useScrollTrap(ref, sheet)

  return (
    <Tag
      ref={ref as RefObject<HTMLDialogElement & HTMLDivElement>}
      role={sheet ? undefined : 'dialog'}
      aria-label={label}
      // Esc — 바로 닫지 않고 부모 상태로 닫는다(지우면서 닫힌다)
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      // 시트 뒤 어두운 막(::backdrop)을 누른 것도 이 요소로 온다 — 패널 밖이면 닫는다
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        if (sheet && e.target === e.currentTarget && e.clientY < r.top) onClose()
      }}
      className={`popover-panel glass-strong animate-materialize absolute top-full right-0 z-50 mt-2 origin-top-right overflow-hidden rounded-2xl text-fg ${className} max-sm:fixed max-sm:inset-x-3 max-sm:top-[84px] max-sm:mt-0 max-sm:w-auto max-sm:origin-top`}
    >
      {/* 시트 손잡이 — 여기서는 어느 방향으로 움직여도 시트를 끈다 */}
      {sheet && (
        <div aria-hidden="true" data-sheet-handle className="flex h-7 touch-none justify-center pt-2.5">
          <span className="h-1.5 w-10 rounded-full bg-fg/25" />
        </div>
      )}
      {children}
    </Tag>
  )
}

/** 상단 바 · 메뉴의 아이콘 버튼 */
export const ICON_BUTTON =
  'relative grid size-10 cursor-pointer place-items-center rounded-xl text-muted transition-[background-color,color,scale] duration-150 hover:bg-subtle hover:text-fg active:scale-95'
