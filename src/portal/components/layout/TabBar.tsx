import { hrefOf, type Page } from '../../hooks/useHashRoute'
import { useLiquidNav } from '../../hooks/useLiquidNav'
import { useI18n } from '../../i18n'
import { CarryChip, LiquidBlobs } from './LiquidParts'
import { NAV_ITEMS } from './navItems'

/**
 * 좁은 화면 하단에 떠 있는 유리 탭바 — 엄지로 닿는 곳에 주 메뉴를 둔다.
 * 사이드바와 같은 물방울 선택 표시: 탭을 누른 채 좌우로 끌면 방울이 떨어져 나와 따라오고,
 * 닿는 탭으로 화면이 바뀐다. 튕기듯 놓으면 그 속도로 멈출 자리에 가장 가까운 탭으로 간다.
 */
export function TabBar({ page }: { page: Page }) {
  const { t } = useI18n()
  const active = NAV_ITEMS.findIndex((n) => n.page === page)
  const { listRef, dropRef, chipRef, anchorRefs, lit, dragging, carry, onPointerDown, onDragStart } = useLiquidNav({
    axis: 'x',
    active,
    onCommit: (i) => {
      location.hash = hrefOf(NAV_ITEMS[i].page)
    },
  })

  return (
    <>
      <nav
        data-liquid-root
        aria-label={t.layout.mainNav}
        className="glass-chrome fixed inset-x-3 bottom-3 z-30 rounded-[22px] p-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] lg:hidden"
      >
        <div className="relative">
          <LiquidBlobs dropRef={dropRef} anchorRefs={anchorRefs} rounded="rounded-2xl" />

          {/* touch-none: 좌우로 끄는 동안 브라우저가 화면을 밀거나 뒤로 가지 않게 */}
          <ul ref={listRef} onPointerDown={onPointerDown} onDragStart={onDragStart} className="relative grid grid-cols-4 touch-none select-none">
            {NAV_ITEMS.map(({ page: p, icon: I }, i) => {
              const on = lit === i
              return (
                <li key={p}>
                  <a
                    href={hrefOf(p)}
                    aria-current={p === page ? 'page' : undefined}
                    className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold transition-[color,scale] duration-150 ${
                      dragging ? 'cursor-grabbing' : 'active:scale-95'
                    } ${on ? 'text-white' : 'text-muted'}`}
                  >
                    <I className="size-[22px]" strokeWidth={on ? 2.4 : 2} aria-hidden="true" />
                    {t.layout.pages[p]}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      <CarryChip chipRef={chipRef} index={carry} />
    </>
  )
}
