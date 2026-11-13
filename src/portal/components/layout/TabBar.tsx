import { hrefOf, type Page } from '../../hooks/useHashRoute'
import { useI18n } from '../../i18n'
import { NAV_ITEMS } from './navItems'

/** 좁은 화면 하단에 떠 있는 유리 탭바 — 엄지로 닿는 곳에 주 메뉴를 둔다 */
export function TabBar({ page }: { page: Page }) {
  const { t } = useI18n()
  return (
    <nav
      aria-label={t.layout.mainNav}
      className="glass-chrome fixed inset-x-3 bottom-3 z-30 rounded-2xl pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ page: p, icon: I }) => {
          const active = p === page
          return (
            <li key={p}>
              <a
                href={hrefOf(p)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-semibold transition-[color,scale] duration-150 active:scale-95 ${
                  active ? 'text-accent' : 'text-muted'
                }`}
              >
                <I className="size-[22px]" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                {t.layout.pages[p]}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
