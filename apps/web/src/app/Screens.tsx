import { Suspense, type ReactNode } from 'react'
import { LazyAccountPage } from '@/features/account'
import { DecorAdjust, Wallpaper } from '@/features/decor'
import { EditDock, GALLERY } from '@/features/home'
import { LazyInfoPage } from '@/features/info'
import { LazySystemsPage } from '@/features/systems'
import type { Hub } from './useHub'

/** 홈 배경 그림(위젯 편집의 꾸미기)과 그 위치 조정 — 두 셸이 같다 */
export function Backdrop({ hub: { home, editing, decor, adjusting } }: { hub: Hub }) {
  return (
    <>
      {home && decor.wallpaper && <Wallpaper src={decor.wallpaper} pos={decor.pos.wallpaper} />}
      {editing && adjusting && <DecorAdjust decor={decor} />}
    </>
  )
}

/** 편집 독(편집 도구 · 완료) — side 는 사이드바 폭(가운데 맞추기) */
export function Dock({ hub: { decor, widgets, stopEditing }, side }: { hub: Hub; side: number }) {
  return <EditDock decor={decor} onTidy={widgets.tidy} onUndo={widgets.canUndo ? widgets.undo : undefined} onReset={GALLERY ? undefined : widgets.reset} onDone={stopEditing} side={side} />
}

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
