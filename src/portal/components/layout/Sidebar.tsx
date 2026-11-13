import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useLiquidNav } from '../../hooks/useLiquidNav'
import { hrefOf, type Page } from '../../hooks/useHashRoute'
import { NAV_ITEMS } from './navItems'

interface SidebarProps {
  page: Page
  collapsed: boolean
  onToggleCollapsed: () => void
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a href={hrefOf('home')} className="flex min-w-0 items-center gap-3 rounded-xl">
      <span className="grid size-10 flex-none place-items-center rounded-xl bg-white shadow-[0_2px_8px_oklch(0_0_0/0.12)] ring-1 ring-black/5">
        <img src="/favicon.svg" alt="" width={30} height={30} />
      </span>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="block text-[17px] font-extrabold tracking-[-0.02em]">DVI Portal</span>
          <span className="block text-xs text-muted">사내 통합 포털</span>
        </span>
      )}
    </a>
  )
}

const BLOB = 'absolute top-0 left-0 origin-center rounded-xl will-change-transform'

/**
 * 넓은 화면 왼쪽에 떠 있는 유리 사이드바. 접으면 아이콘만 남는다.
 * 메뉴를 누른 채 위아래로 끌면 선택 표시가 물방울처럼 떨어져 나와 따라오고, 닿는 메뉴로 화면이 바뀐다.
 * 사이드바 밖으로 끌고 나가면 평소 링크처럼 탭 바 · 북마크 등에 놓을 수 있다.
 */
export function Sidebar({ page, collapsed, onToggleCollapsed }: SidebarProps) {
  const active = NAV_ITEMS.findIndex((n) => n.page === page)
  const { listRef, dropRef, chipRef, anchorRefs, lit, dragging, carry, onPointerDown, onDragStart } = useLiquidNav({
    active,
    onCommit: (i) => {
      location.hash = hrefOf(NAV_ITEMS[i].page)
    },
  })

  const carried = NAV_ITEMS[carry]

  return (
    <>
      <aside
        className={`glass-chrome fixed inset-y-3 left-3 z-30 hidden flex-col rounded-3xl lg:flex ${collapsed ? 'w-[76px]' : 'w-[248px]'}`}
      >
        <div className={`pt-5 pb-5 ${collapsed ? 'flex justify-center' : 'px-5'}`}>
          <Brand compact={collapsed} />
        </div>

        <nav aria-label="주 메뉴" className={`px-3 ${dragging ? 'cursor-grabbing' : ''}`}>
          <div className="relative">
            {/* 선택 표시 물방울 — 메뉴 글자 아래 한 겹에 goo 필터로 그린다 */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 [filter:url(#portal-goo)_drop-shadow(0_6px_14px_oklch(0_0_0/0.22))]">
              {anchorRefs.map((ref, i) => (
                <div key={i} ref={ref} className={`${BLOB} bg-accent-fill`} />
              ))}
              <div ref={dropRef} className={`${BLOB} bg-accent-fill bg-[linear-gradient(to_bottom,oklch(1_0_0/0.2),transparent_70%)]`} />
            </div>

            <ul ref={listRef} onPointerDown={onPointerDown} onDragStart={onDragStart} className="relative space-y-1 touch-none select-none">
              {NAV_ITEMS.map(({ page: p, label, icon: I }, i) => (
                <li key={p}>
                  <a
                    href={hrefOf(p)}
                    aria-current={p === page ? 'page' : undefined}
                    aria-label={collapsed ? label : undefined}
                    title={collapsed ? label : undefined}
                    className={`flex items-center gap-3 rounded-xl py-3 text-base font-semibold transition-[background-color,color,scale] duration-150 ${
                      dragging ? '' : 'active:scale-[0.97]'
                    } ${collapsed ? 'justify-center' : 'px-3'} ${
                      lit === i ? 'text-white' : `text-muted ${dragging ? '' : 'hover:bg-subtle hover:text-fg'}`
                    }`}
                  >
                    <I className="size-5 flex-none" aria-hidden="true" />
                    {!collapsed && label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* 가까운 방울끼리 이어 붙이는 필터: 흐리게 → 투명도를 날카롭게 → 원래 그림을 위에 */}
        <svg aria-hidden="true" className="absolute size-0">
          <filter id="portal-goo" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </svg>

        <div className="flex-1" />

        <div className="p-3">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
            className={`flex w-full cursor-pointer items-center gap-3 rounded-xl py-2.5 text-sm font-medium text-muted transition-[background-color,color] hover:bg-subtle hover:text-fg ${
              collapsed ? 'justify-center' : 'px-3'
            }`}
          >
            {collapsed ? <PanelLeftOpen className="size-5" aria-hidden="true" /> : <PanelLeftClose className="size-5" aria-hidden="true" />}
            {!collapsed && '접기'}
          </button>
        </div>
      </aside>

      {/* 사이드바 밖으로 들고 나간 링크 — 커서를 따라다닌다 (사이드바의 backdrop-filter 밖에 두어야 fixed 가 화면 기준) */}
      <div ref={chipRef} aria-hidden="true" className="group pointer-events-none fixed top-0 left-0 z-50">
        <div className="glass-strong flex scale-90 items-center gap-2 rounded-xl py-2 pr-3.5 pl-2.5 text-sm font-semibold opacity-0 transition-[opacity,scale] duration-150 group-data-[show]:scale-100 group-data-[show]:opacity-100">
          {carried && (
            <>
              <span className="grid size-7 place-items-center rounded-lg bg-accent-fill text-white">
                <carried.icon className="size-4" />
              </span>
              {carried.label}
            </>
          )}
        </div>
      </div>
    </>
  )
}
