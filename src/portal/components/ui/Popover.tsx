import type { ReactNode } from 'react'

/**
 * 버튼 아래로 펼쳐지는 유리 패널. 누른 버튼(오른쪽 위)에서 자라나듯 나타난다 —
 * 어디서 왔는지 보이도록 transform-origin 을 버튼 쪽에 둔다.
 */
export function PopoverPanel({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div
      role="dialog"
      aria-label={label}
      className={`glass-strong animate-materialize absolute top-full right-0 z-50 mt-2 origin-top-right overflow-hidden rounded-2xl text-fg ${className}`}
    >
      {children}
    </div>
  )
}

/** 상단 바 · 메뉴의 아이콘 버튼 */
export const ICON_BUTTON =
  'relative grid size-10 cursor-pointer place-items-center rounded-xl text-muted transition-[background-color,color,scale] duration-150 hover:bg-subtle hover:text-fg active:scale-95'
