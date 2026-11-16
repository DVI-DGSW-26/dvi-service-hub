import type { ReactNode } from 'react'

/**
 * 버튼 아래로 펼쳐지는 유리 패널. 누른 버튼(오른쪽 위)에서 자라나듯 나타난다 —
 * 어디서 왔는지 보이도록 transform-origin 을 버튼 쪽에 둔다.
 * 휴대폰에서는 버튼이 화면 가운데쯤이라 버튼 기준으로 펼치면 왼쪽이 잘린다 — 상단 바(top-3 + h-16) 바로 아래에 폭 가득 편다.
 */
export function PopoverPanel({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div
      role="dialog"
      aria-label={label}
      className={`glass-strong animate-materialize absolute top-full right-0 z-50 mt-2 origin-top-right overflow-hidden rounded-2xl text-fg ${className} max-sm:fixed max-sm:inset-x-3 max-sm:top-[84px] max-sm:mt-0 max-sm:w-auto max-sm:origin-top`}
    >
      {children}
    </div>
  )
}

/** 상단 바 · 메뉴의 아이콘 버튼 */
export const ICON_BUTTON =
  'relative grid size-10 cursor-pointer place-items-center rounded-xl text-muted transition-[background-color,color,scale] duration-150 hover:bg-subtle hover:text-fg active:scale-95'
