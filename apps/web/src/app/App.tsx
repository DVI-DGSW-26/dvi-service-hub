import { useQuery } from '@tanstack/react-query'
import { Suspense, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import { services, useFavorites, canSee, sortByFavorite, LazySystemsPage } from '@/features/systems'
import { GooFilter, Sidebar, EditTabBar, TabBar, TopBar } from '@/features/shell'
import { DecorAdjust, Wallpaper, useDecor } from '@/features/decor'
import { EditDock, WidgetEditBar, GALLERY, visibleWidgets, useWidgetLayout, HomePage } from '@/features/home'
import { hrefOf, useHashRoute, useMedia } from '@/shared/hooks'
import { BOARD, EASE } from '@/shared/constants'
import { usePortalTheme } from '@/features/theme'
import { useI18n } from '@/shared/i18n'
import { KEYS, readPref, writePref, motionOff } from '@/shared/lib'
import { LazyAccountPage, accountQueries } from '@/features/account'
// 홈만 첫 번들에 — 나머지 화면은 처음 갈 때 받는다(Lazy*)
import { LazyInfoPage } from '@/features/info'


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
  const decor = useDecor()
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
  // 좁은 화면 편집에서 위젯을 골라 테두리를 띄운 동안 — 아래 막대(편집 독 · 탭 바)가 손잡이를 가리지 않게 숨긴다
  const [picking, setPicking] = useState(false)
  // 테마 메뉴 · 설정 화면의 '홈 배경 · 그림 바꾸기' — 어느 화면에서든 홈으로 가서 편집을 연다
  const customize = () => {
    location.hash = hrefOf('home')
    setEditing(true)
  }
  // 좁은 화면은 '완료' 말고도 빈 곳(위젯 · 버튼 밖)을 누르면 끝난다 — 홈 화면 앱처럼. 위젯을 골라 둔 채 누르면 그 누름은 고르기만 푼다(StackBoard)
  const board = useMedia(BOARD)
  const pickedAtDown = useRef(false)
  const endOnEmpty = {
    onPointerDownCapture: () => void (pickedAtDown.current = picking),
    onClick: (e: MouseEvent) => {
      if (!editing || board || pickedAtDown.current || decor.adjusting) return
      if (!(e.target as Element).closest('[data-type], button, a, input, label, dialog, [role="toolbar"]')) setEditing(false)
    },
  }
  // 갤러리는 목업에서만 — 운영 · dev 는 편집 중에도 사이드바 · 탭 바가 그대로다
  const gallery = editing && GALLERY

  // Esc 로도 편집을 마친다(열린 창이 있으면 창부터, 배경 위치 조정 중이면 조정부터 끝난다)
  const adjusting = decor.adjusting
  useEffect(() => {
    if (!editing || adjusting) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('dialog[open]') && setEditing(false)
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [editing, adjusting])
  // 편집이 끝나면(완료 · 다른 화면으로) 위치 조정도 지금 자리로 마친다
  useEffect(() => {
    if (!editing && adjusting) decor.endAdjust(true)
  })

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
      el.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: 300, easing: EASE })
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

      {/* 홈 배경 그림(위젯 편집의 꾸미기). 배경 위치 조정 중에는 위젯을 숨기고, 인사 카드 그림 조정 중에는 다른 위젯을 흐린다(아래 main) */}
      {home && decor.wallpaper && <Wallpaper src={decor.wallpaper} pos={decor.pos.wallpaper} />}
      {editing && adjusting && <DecorAdjust decor={decor} />}
      {/* 편집 도구 · 완료는 화면 아래 독에 — 상단 바는 그 항목 고치기만 */}
      {/* 좁은 화면은 탭 바가 편집 막대가 되고(EditTabBar), 이 독은 그림 위치 조정 때만 */}
      {editing && !picking && (board || adjusting) && (
        <EditDock
          decor={decor}
          onTidy={widgets.tidy}
          onUndo={widgets.canUndo ? widgets.undo : undefined}
          onReset={GALLERY ? undefined : widgets.reset}
          onDone={stopEditing}
          side={gallery ? 408 : collapsed ? 104 : 276}
        />
      )}

      {/* 위젯 편집 중에는(목업) 사이드바 자리에 위젯 갤러리가, 탭 바 자리에 편집 막대가 들어온다 */}
      {gallery ? (
        <WidgetEditBar layout={widgets} defs={visible} />
      ) : (
        <Sidebar page={route.page} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      )}

      {/* 사이드바(왼쪽 12px + 너비) 만큼 비우고 나머지 폭을 모두 쓴다 */}
      <div
        ref={shellRef}
        // 홈은 넓고 높은 화면에서 화면 높이에 딱 맞춘다 — 위젯 한 페이지가 스크롤 없이 한 장
        className={`flex min-h-dvh flex-col px-3 pt-3 pb-24 sm:px-4 lg:pr-4 lg:pb-4 ${gallery ? 'lg:pl-[408px]' : collapsed ? 'lg:pl-[104px]' : 'lg:pl-[276px]'} ${home ? 'board-fit:h-dvh' : ''}`}
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
          onCustomize={customize}
          editing={editing}
        />

        {/* 화면을 옮기면 main 을 새로 그려 옮긴 방향에서 밀려 들어온다(styles/layout.css 의 .page-in) — 앱의 탭 넘김처럼 */}
        <main key={route.page} id="main" tabIndex={-1} className={`flex-1 pt-5 outline-none ${route.dir ? 'page-in' : ''} ${home ? 'flex flex-col board-fit:min-h-0' : ''} ${adjusting === 'wallpaper' ? 'invisible' : ''}`}
          data-adjust={adjusting ?? undefined}
          {...endOnEmpty}
          style={route.dir ? { '--dir': Math.sign(route.dir) } as CSSProperties : undefined}
        >
          <Suspense>
            {home && (
              <HomePage
                ctx={{ me, meLoading, services: mine, allServices: all, favorites, onToggleFavorite: toggleFavorite, hero: decor.hero ? { src: decor.hero, pos: decor.pos.hero } : null }}
                layout={widgets}
                defs={visible}
                editing={editing}
                onEdit={() => setEditing(true)}
                onPick={setPicking}
                onDone={stopEditing}
                decor={decor}
              />
            )}
            {route.page === 'systems' && (
              <LazySystemsPage
                me={me}
                loading={meLoading}
                services={mine}
                query={query}
                onQueryChange={setQuery}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
              />
            )}
            {route.page === 'info' && <LazyInfoPage categoryId={route.param} />}
            {route.page === 'account' && <LazyAccountPage me={me} loading={meLoading} services={mine} theme={theme} onCustomize={customize} />}
          </Suspense>
        </main>

        {/* 휴대폰은 앱처럼 바닥글 없이 — 탭 바가 화면 끝이다 */}
        <footer className={`px-1 pt-8 text-xs text-muted max-sm:hidden ${home ? 'board-fit:hidden' : ''}`}>© DVISION · DVI Portal</footer>
      </div>

      {!editing ? <TabBar page={route.page} /> : !board && !adjusting && !picking && <EditTabBar decor={decor} onReset={widgets.reset} onDone={stopEditing} />}
      <GooFilter />
    </>
  )
}
