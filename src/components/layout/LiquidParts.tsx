import type { RefObject } from 'react'
import { useI18n } from '../../i18n'
import { NAV_ITEMS } from './navItems'

const BLOB = 'absolute top-0 left-0 origin-center will-change-transform bg-accent-fill'

interface LiquidBlobsProps {
  dropRef: RefObject<HTMLDivElement | null>
  anchorRefs: readonly RefObject<HTMLDivElement | null>[]
  /** 방울 모서리 — 메뉴 한 칸의 모서리와 맞춘다 */
  rounded: string
}

/** 선택 표시 물방울 — 메뉴 글자 아래 한 겹에 goo 필터로 그린다 (useLiquidNav 가 매 프레임 움직인다) */
export function LiquidBlobs({ dropRef, anchorRefs, rounded }: LiquidBlobsProps) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 [filter:url(#portal-goo)_drop-shadow(0_6px_14px_oklch(0_0_0/0.22))]">
      {anchorRefs.map((ref, i) => (
        <div key={i} ref={ref} className={`${BLOB} ${rounded}`} />
      ))}
      <div ref={dropRef} className={`${BLOB} ${rounded} bg-[linear-gradient(to_bottom,oklch(1_0_0/0.2),transparent_70%)]`} />
    </div>
  )
}

/**
 * 가까운 방울끼리 이어 붙이는 필터: 흐리게 → 투명도를 날카롭게 → 원래 그림을 위에.
 * 사이드바 · 탭바가 같이 쓴다. 둘 중 하나는 늘 display:none 이라(화면 폭) 그 안에 두면 필터가 안 먹으니 앱에 한 번만 둔다.
 */
export function GooFilter() {
  return (
    <svg aria-hidden="true" className="pointer-events-none fixed size-0">
      <filter id="portal-goo" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
        <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
      </filter>
    </svg>
  )
}

/**
 * 메뉴 판 밖으로 들고 나간 링크 — 커서를 따라다닌다(마우스 끌어놓기).
 * 메뉴 판의 backdrop-filter 밖에 두어야 fixed 가 화면 기준이 된다.
 */
export function CarryChip({ chipRef, index }: { chipRef: RefObject<HTMLDivElement | null>; index: number }) {
  const { t } = useI18n()
  const carried = NAV_ITEMS[index]
  return (
    <div ref={chipRef} aria-hidden="true" className="group pointer-events-none fixed top-0 left-0 z-50">
      <div className="glass-strong flex scale-90 items-center gap-2 rounded-xl py-2 pr-3.5 pl-2.5 text-sm font-semibold opacity-0 transition-[opacity,scale] duration-150 group-data-[show]:scale-100 group-data-[show]:opacity-100">
        {carried && (
          <>
            <span className="grid size-7 place-items-center rounded-lg bg-accent-fill text-white">
              <carried.icon className="size-4" />
            </span>
            {t.layout.pages[carried.page]}
          </>
        )}
      </div>
    </div>
  )
}
