import { Search } from 'lucide-react'
import { hrefOf, type Page } from '../../hooks/useHashRoute'
import type { PortalTheme } from '../../hooks/usePortalTheme'
import { useI18n } from '../../i18n'
import type { Me } from '../../types/portal'
import { ICON_BUTTON } from '../ui/Popover'
import { Skeleton } from '../ui/Skeleton'
import { NotificationMenu } from './NotificationMenu'
import { SearchBox } from './SearchBox'
import { Brand } from './Sidebar'
import { ThemeMenu } from './ThemeMenu'
import { UserMenu } from './UserMenu'

interface TopBarProps {
  me: Me | null
  meLoading: boolean
  page: Page
  query: string
  onQueryChange: (q: string) => void
  theme: PortalTheme
}

/** 본문 위에 떠 있는 유리 상단 바. 본문이 그 아래로 흘러 지나간다. */
export function TopBar({ me, meLoading, page, query, onQueryChange, theme }: TopBarProps) {
  const { t } = useI18n()
  return (
    <header className="glass-chrome sticky top-3 z-20 flex h-16 items-center gap-3 rounded-2xl pr-2 pl-3 sm:pl-4">
      <div className="lg:hidden">
        <Brand compact />
      </div>
      {/* 지금 어디에 있는지 */}
      <p className="min-w-0 truncate leading-tight">
        <span className="hidden text-xs text-muted sm:block">DVI Portal</span>
        <span className="block text-[15px] font-bold tracking-[-0.01em] sm:text-base">{t.layout.pages[page]}</span>
      </p>

      <div className="ml-auto flex items-center gap-1">
        <SearchBox value={query} onChange={onQueryChange} hotkey className="mr-1.5 hidden w-64 md:block xl:w-96" />
        <a href={hrefOf('systems')} aria-label={t.layout.search.label} className={`${ICON_BUTTON} md:hidden`}>
          <Search className="size-5" aria-hidden="true" />
        </a>
        <NotificationMenu />
        <ThemeMenu theme={theme} />
        {(me || meLoading) && <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden="true" />}
        {me ? (
          <UserMenu me={me} />
        ) : (
          meLoading && (
            // 사용자 버튼과 같은 크기로 자리만 잡아 둔다
            <span className="flex items-center gap-2.5 py-1 pr-2 pl-1" role="status" aria-label={t.layout.user.loading}>
              <Skeleton className="size-9 rounded-full" />
              <span className="hidden md:block">
                <Skeleton className="h-3.5 w-14 rounded-md" />
                <Skeleton className="mt-1.5 h-3 w-20 rounded-md" />
              </span>
              <span className="w-4" />
            </span>
          )
        )}
      </div>
    </header>
  )
}
