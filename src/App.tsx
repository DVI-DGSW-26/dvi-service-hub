import { useQuery } from '@tanstack/react-query'
import { Suspense, lazy, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { services } from './services'
import { GooFilter } from './components/layout/LiquidParts'
import { Sidebar } from './components/layout/Sidebar'
import { TabBar } from './components/layout/TabBar'
import { TopBar } from './components/layout/TopBar'
import { WidgetEditBar } from './components/widgets/WidgetGallery'
import { visibleWidgets } from './components/widgets/registry'
import { useFavorites } from './hooks/useFavorites'
import { hrefOf, useHashRoute } from './hooks/useHashRoute'
import { usePortalTheme } from './hooks/usePortalTheme'
import { useWidgetLayout } from './hooks/useWidgetLayout'
import { useI18n } from './i18n'
import { canSee, sortByFavorite } from './lib/access'
import { KEYS, motionOff, readPref, writePref } from './lib/theme'
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
  const [collapsed, setCollapsed] = useState(() => readPref(KEYS.sidebar) === 'collapsed')

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
  const visible = visibleWidgets(me)
  const widgets = useWidgetLayout(visible)
  // 홈을 떠나면 편집도 끝난다
  const [editingHome, setEditing] = useState(false)
  const editing = editingHome && home
  const stopEditing = () => setEditing(false)

  const shellRef = useRef<HTMLDivElement>(null)
  // 본문 여백은 한 번에 바꾸고, 밀려나는 모습은 transform 으로만 그린다(FLIP).
  // padding 을 애니메이션하면 300ms 동안 매 프레임 대시보드 전체를 다시 배치한다
  const toggleCollapsed = () => {
    const el = shellRef.current
    const from = el ? parseFloat(getComputedStyle(el).paddingLeft) : 0
    writePref(KEYS.sidebar, collapsed ? null : 'collapsed')
    flushSync(() => setCollapsed(!collapsed))
    const dx = el ? from - parseFloat(getComputedStyle(el).paddingLeft) : 0
    if (el && dx && !motionOff()) {
      el.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' })
    }
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

      {/* 위젯 편집 중에는 사이드바 자리에 위젯 갤러리가, 탭 바 자리에 편집 막대가 들어온다 */}
      {editing ? (
        <WidgetEditBar layout={widgets} defs={visible} onDone={stopEditing} />
      ) : (
        <Sidebar page={route.page} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      )}

      {/* 사이드바(왼쪽 12px + 너비) 만큼 비우고 나머지 폭을 모두 쓴다 */}
      <div
        ref={shellRef}
        // 홈은 넓고 높은 화면에서 화면 높이에 딱 맞춘다 — 위젯 한 페이지가 스크롤 없이 한 장
        className={`flex min-h-dvh flex-col px-3 pt-3 pb-24 sm:px-4 lg:pr-4 lg:pb-4 ${editing ? 'lg:pl-[408px]' : collapsed ? 'lg:pl-[104px]' : 'lg:pl-[276px]'} ${home ? 'board-fit:h-dvh' : ''}`}
      >
        {/* 편집 중에는 상단 바도 고칠 수 있고, 끝에 '완료'가 들어온다 */}
        <TopBar
          me={me}
          meLoading={meLoading}
          page={route.page}
          query={query}
          onQueryChange={onQueryChange}
          theme={theme}
          onEditWidgets={home ? () => setEditing(true) : undefined}
          editing={editing}
          onDone={stopEditing}
        />

        <main id="main" tabIndex={-1} className={`flex-1 pt-5 outline-none ${home ? 'flex flex-col board-fit:min-h-0' : ''}`}>
          <Suspense>
            {home && (
              <HomePage
                ctx={{ me, meLoading, services: mine, allServices: all, favorites, onToggleFavorite: toggleFavorite }}
                layout={widgets}
                defs={visible}
                editing={editing}
                onEdit={() => setEditing(true)}
              />
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

        <footer className={`px-1 pt-8 text-xs text-muted ${home ? 'board-fit:hidden' : ''}`}>© DVISION · DVI Portal</footer>
      </div>

      {!editing && <TabBar page={route.page} />}
      <GooFilter />
    </>
  )
}
