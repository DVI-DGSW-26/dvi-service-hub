import { useQuery } from '@tanstack/react-query'
import { Suspense, lazy, useState } from 'react'
import { services } from './services'
import { GooFilter } from './components/layout/LiquidParts'
import { Sidebar } from './components/layout/Sidebar'
import { TabBar } from './components/layout/TabBar'
import { TopBar } from './components/layout/TopBar'
import { useFavorites } from './hooks/useFavorites'
import { hrefOf, useHashRoute } from './hooks/useHashRoute'
import { usePortalTheme } from './hooks/usePortalTheme'
import { useI18n } from './i18n'
import { canSee, sortByFavorite } from './lib/access'
import { readPref, writePref } from './lib/theme'
import { HomePage } from './pages/HomePage'
import { accountQueries } from './queries/account'

// 홈만 첫 번들에 — 나머지 화면은 처음 갈 때 받는다
const SystemsPage = lazy(() => import('./pages/SystemsPage').then((m) => ({ default: m.SystemsPage })))
const InfoPage = lazy(() => import('./pages/InfoPage').then((m) => ({ default: m.InfoPage })))
const AccountPage = lazy(() => import('./pages/AccountPage').then((m) => ({ default: m.AccountPage })))

export default function App() {
  const { t } = useI18n()
  const route = useHashRoute()
  const theme = usePortalTheme()
  // 받는 중이면 스켈레톤 · 받은 뒤 null 이면 로그인 정보 없음
  const meQuery = useQuery(accountQueries.me())
  const me = meQuery.data ?? null
  const meLoading = meQuery.isPending
  const [query, setQuery] = useState('')
  const { favorites, toggleFavorite } = useFavorites()
  const [collapsed, setCollapsed] = useState(() => readPref('portal-sidebar') === 'collapsed')

  // 권한으로 거르고 즐겨찾기를 앞으로 — 홈과 업무시스템 화면이 같은 목록을 쓴다
  const mine = sortByFavorite(services.filter((s) => canSee(s, me)), favorites)
  // 권한과 상관없이 전부 — 홈 업무시스템의 '전체' 보기
  const all = sortByFavorite(services, favorites)

  // 상단 검색칸은 어느 화면에서든 업무시스템 화면으로 데려가 결과를 보여준다
  const onQueryChange = (q: string) => {
    setQuery(q)
    if (route.page !== 'systems') location.hash = hrefOf('systems')
  }

  const home = route.page === 'home'

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      writePref('portal-sidebar', c ? null : 'collapsed')
      return !c
    })
  }

  return (
    <>
      {/* 해시는 화면 이동에 쓰므로 #main 링크 대신 버튼으로 초점만 옮긴다 */}
      <button
        type="button"
        onClick={() => document.getElementById('main')?.focus()}
        className="sr-only z-50 rounded-lg bg-accent-fill px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t.layout.skipToContent}
      </button>

      <Sidebar page={route.page} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />

      {/* 사이드바(왼쪽 12px + 너비) 만큼 비우고 나머지 폭을 모두 쓴다 */}
      {/* 홈은 넓은 화면에서 화면 높이에 딱 맞춘다(fit) — 스크롤 없이 한눈에 */}
      <div
        className={`flex min-h-dvh flex-col px-3 pt-3 pb-24 sm:px-4 lg:pr-4 lg:pb-4 lg:transition-[padding-left] lg:duration-300 lg:ease-[cubic-bezier(0.32,0.72,0,1)] ${collapsed ? 'lg:pl-[104px]' : 'lg:pl-[276px]'} ${home ? 'fit:h-dvh' : ''}`}
      >
        <TopBar me={me} meLoading={meLoading} page={route.page} query={query} onQueryChange={onQueryChange} theme={theme} />

        <main id="main" tabIndex={-1} className={`flex-1 pt-5 outline-none ${home ? 'fit:min-h-0 fit:pt-4' : ''}`}>
          <Suspense>
            {home && (
              <HomePage me={me} meLoading={meLoading} services={mine} allServices={all} favorites={favorites} onToggleFavorite={toggleFavorite} />
            )}
            {route.page === 'systems' && (
              <SystemsPage
                me={me}
                loading={meLoading}
                services={mine}
                query={query}
                onQueryChange={setQuery}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
              />
            )}
            {route.page === 'info' && <InfoPage categoryId={route.param} />}
            {route.page === 'account' && <AccountPage me={me} loading={meLoading} services={mine} theme={theme} />}
          </Suspense>
        </main>

        <footer className={`px-1 pt-8 text-xs text-muted ${home ? 'fit:hidden' : ''}`}>© DVISION · DVI Portal</footer>
      </div>

      <TabBar page={route.page} />
      <GooFilter />
    </>
  )
}
