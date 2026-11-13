import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useLiquidNav } from '../../hooks/useLiquidNav'
import { hrefOf, type Page } from '../../hooks/useHashRoute'
import { useI18n } from '../../i18n'
import { CarryChip, LiquidBlobs } from './LiquidParts'
import { NAV_ITEMS } from './navItems'

interface SidebarProps {
  page: Page
  collapsed: boolean
  onToggleCollapsed: () => void
}

/** 접기 · 펼치기의 폭 변화와 글자가 같은 곡선을 탄다 (iOS 시트 곡선) */
const EASE = 'duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]'
/** 접힐 때는 글자가 먼저 사라지고, 펼칠 때는 폭이 어느 정도 열린 뒤 나타난다 */
const fade = (collapsed: boolean) => `whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'opacity-0' : 'opacity-100 delay-100'}`

/**
 * 로고 + 이름. compact 는 이름을 아예 빼고(좁은 화면 상단 바), collapsed 는 이름을 흐려 감춘다(접힌 사이드바 —
 * 폭이 줄어드는 동안 잘려 나가도록 자리는 남긴다).
 */
export function Brand({ compact = false, collapsed = false }: { compact?: boolean; collapsed?: boolean }) {
  const { t } = useI18n()
  return (
    <a href={hrefOf('home')} className="flex min-w-0 items-center gap-3 rounded-xl">
      <span className="grid size-10 flex-none place-items-center rounded-xl bg-white shadow-[0_2px_8px_oklch(0_0_0/0.12)] ring-1 ring-black/5">
        <img src="/favicon.svg" alt="" width={30} height={30} />
      </span>
      {!compact && (
        <span className={`leading-tight ${fade(collapsed)}`}>
          <span className="block text-[17px] font-extrabold tracking-[-0.02em]">DVI Portal</span>
          <span className="block text-xs text-muted">{t.layout.brandTagline}</span>
        </span>
      )}
    </a>
  )
}

/**
 * 넓은 화면 왼쪽에 떠 있는 유리 사이드바. 접으면 아이콘만 남는다.
 * 메뉴를 누른 채 위아래로 끌면 선택 표시가 물방울처럼 떨어져 나와 따라오고, 닿는 메뉴로 화면이 바뀐다.
 * 사이드바 밖으로 끌고 나가면 평소 링크처럼 탭 바 · 북마크 등에 놓을 수 있다.
 */
export function Sidebar({ page, collapsed, onToggleCollapsed }: SidebarProps) {
  const { t } = useI18n()
  const active = NAV_ITEMS.findIndex((n) => n.page === page)
  const { listRef, dropRef, chipRef, anchorRefs, lit, dragging, carry, onPointerDown, onDragStart } = useLiquidNav({
    active,
    onCommit: (i) => {
      location.hash = hrefOf(NAV_ITEMS[i].page)
    },
  })

  return (
    <>
      <aside
        data-liquid-root
        className={`glass-chrome fixed inset-y-3 left-3 z-30 hidden flex-col rounded-3xl transition-[width] lg:flex ${EASE} ${collapsed ? 'w-[76px]' : 'w-[248px]'}`}
      >
        {/* 아이콘은 접든 펴든 같은 자리(접힌 폭 76px 의 가운데)에 두고, 폭만 줄며 이름이 잘려 나간다 */}
        <div className="overflow-hidden px-[18px] py-5">
          <Brand collapsed={collapsed} />
        </div>

        <nav aria-label={t.layout.mainNav} className={`px-3 ${dragging ? 'cursor-grabbing' : ''}`}>
          <div className="relative">
            <LiquidBlobs dropRef={dropRef} anchorRefs={anchorRefs} rounded="rounded-xl" />

            <ul ref={listRef} onPointerDown={onPointerDown} onDragStart={onDragStart} className="relative space-y-1 touch-none select-none">
              {NAV_ITEMS.map(({ page: p, icon: I }, i) => {
                const label = t.layout.pages[p]
                return (
                  <li key={p}>
                    <a
                      href={hrefOf(p)}
                      aria-current={p === page ? 'page' : undefined}
                      title={collapsed ? label : undefined}
                      className={`flex items-center gap-3 overflow-hidden rounded-xl px-4 py-3 text-base font-semibold transition-[background-color,color,scale] duration-150 ${
                        dragging ? '' : 'active:scale-[0.97]'
                      } ${
                        lit === i ? 'text-white' : `text-muted ${dragging ? '' : 'hover:bg-subtle hover:text-fg'}`
                      }`}
                    >
                      <I className="size-5 flex-none" aria-hidden="true" />
                      {/* 접혀도 글자는 남겨 둔다 — 화면낭독기가 메뉴 이름으로 읽는다 */}
                      <span className={fade(collapsed)}>{label}</span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>

        <div className="flex-1" />

        <div className="p-3">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? t.layout.sidebar.expand : t.layout.sidebar.collapse}
            aria-expanded={!collapsed}
            title={collapsed ? t.layout.sidebar.expandShort : undefined}
            className="flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl px-4 py-2.5 text-sm font-medium text-muted transition-[background-color,color] hover:bg-subtle hover:text-fg"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5 flex-none" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-5 flex-none" aria-hidden="true" />
            )}
            <span className={fade(collapsed)} aria-hidden="true">
              {t.layout.sidebar.collapseShort}
            </span>
          </button>
        </div>
      </aside>

      <CarryChip chipRef={chipRef} index={carry} />
    </>
  )
}
