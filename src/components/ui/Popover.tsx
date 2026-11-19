import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { PHONE, useMedia } from '../../hooks/useMedia'

/**
 * 버튼 아래로 펼쳐지는 유리 패널. 누른 버튼(오른쪽 위)에서 자라나듯 나타난다 —
 * 어디서 왔는지 보이도록 transform-origin 을 버튼 쪽에 둔다.
 * 휴대폰에서는 맨 위 층(popover)에 올려 모달처럼 아래 시트로 편다(styles.css 의 .popover-panel) — 편집 독처럼 transform 이 걸린
 * 부모 안에서도 화면 기준으로 놓인다. popover 를 모르는 브라우저는 상단 바 아래 폭 가득(max-sm:) 으로 남는다.
 */
export function PopoverPanel({ label, onClose, className = '', children }: { label: string; onClose: () => void; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const sheet = useMedia(PHONE)
  useLayoutEffect(() => {
    if (sheet) ref.current?.showPopover?.()
  }, [sheet])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      popover={sheet ? 'manual' : undefined}
      // 시트 뒤 어두운 막(::backdrop)을 누른 것도 이 요소로 온다 — 패널 밖이면 닫는다
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        if (sheet && e.target === e.currentTarget && e.clientY < r.top) onClose()
      }}
      className={`popover-panel glass-strong animate-materialize absolute top-full right-0 z-50 mt-2 origin-top-right overflow-hidden rounded-2xl text-fg ${className} max-sm:fixed max-sm:inset-x-3 max-sm:top-[84px] max-sm:mt-0 max-sm:w-auto max-sm:origin-top`}
    >
      {children}
    </div>
  )
}

/** 상단 바 · 메뉴의 아이콘 버튼 */
export const ICON_BUTTON =
  'relative grid size-10 cursor-pointer place-items-center rounded-xl text-muted transition-[background-color,color,scale] duration-150 hover:bg-subtle hover:text-fg active:scale-95'
