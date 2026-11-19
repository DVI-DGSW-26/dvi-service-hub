import { Suspense, type ReactNode } from 'react'
import { LazyAccountPage } from '@/features/account'
import { LazyInfoPage } from '@/features/info'
import { LazySystemsPage } from '@/features/systems'
import type { Hub } from './useHub'

/** 본문 화면 — 홈(셸이 고른 위젯 판)만 첫 번들에, 나머지는 처음 갈 때 받는다(Lazy*) */
export function Screens({ hub, home }: { hub: Hub; home: ReactNode }) {
  const { route, me, meLoading, mine, query, setQuery, favorites, toggleFavorite, theme, customize } = hub
  return (
    <Suspense>
      {hub.home && home}
      {route.page === 'systems' && (
        <LazySystemsPage me={me} loading={meLoading} services={mine} query={query} onQueryChange={setQuery} favorites={favorites} onToggleFavorite={toggleFavorite} />
      )}
      {route.page === 'info' && <LazyInfoPage categoryId={route.param} />}
      {route.page === 'account' && <LazyAccountPage me={me} loading={meLoading} services={mine} theme={theme} onCustomize={customize} />}
    </Suspense>
  )
}
