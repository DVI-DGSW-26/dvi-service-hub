import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { DesktopBoard, GALLERY, HomePage, WidgetEditBar } from '@/features/home'
import { GooFilter, Sidebar, TopBar } from '@/features/shell'
import { KEYS, motionOff, readPref, writePref } from '@/shared/lib'
import { pageIn } from './pageIn'
import { Backdrop, Dock, Screens } from './Screens'
import { SkipLink } from './SkipLink'
import type { Hub } from './useHub'

/** 넓은 화면(64rem 이상) — 왼쪽 사이드바 · 칸 위젯 판(react-grid-layout) · 화면 아래 편집 독 */
export default function DesktopApp({ hub }: { hub: Hub }) {
  const { route, decor, adjusting, widgets, editing, home } = hub
  const [collapsed, setCollapsed] = useState(() => readPref(KEYS.sidebar) === 'collapsed')
  // 갤러리는 목업에서만 — 운영 · dev 는 편집 중에도 사이드바가 그대로다
  const gallery = editing && GALLERY

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
      <SkipLink />
      <Backdrop hub={hub} />
      {/* 편집 도구 · 완료는 화면 아래 독에 — 상단 바는 그 항목 고치기만 */}
      {editing && (
        <Dock hub={hub} side={gallery ? 408 : collapsed ? 104 : 276} />
      )}

      {/* 위젯 편집 중에는(목업) 사이드바 자리에 위젯 갤러리가 들어온다 */}
      {gallery ? <WidgetEditBar layout={widgets} defs={hub.visible} /> : <Sidebar page={route.page} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />}

      {/* 사이드바(왼쪽 12px + 너비) 만큼 비우고 나머지 폭을 모두 쓴다 */}
      <div
        ref={shellRef}
        // 홈은 넓고 높은 화면에서 화면 높이에 딱 맞춘다 — 위젯 한 페이지가 스크롤 없이 한 장
        className={`flex min-h-dvh flex-col pt-3 pr-4 pb-4 ${gallery ? 'pl-[408px]' : collapsed ? 'pl-[104px]' : 'pl-[276px]'} ${home ? 'board-fit:h-dvh' : ''}`}
      >
        {/* 편집 중에는 상단 바도 고칠 수 있고, 끝에 '완료'가 들어온다 */}
        <TopBar
          me={hub.me}
          meLoading={hub.meLoading}
          page={route.page}
          query={hub.query}
          onQueryChange={hub.onQueryChange}
          theme={hub.theme}
          onEditWidgets={home ? hub.startEditing : undefined}
          onCustomize={hub.customize}
          editing={editing}
        />

        <main
          key={route.page}
          id="main"
          tabIndex={-1}
          className={`flex-1 pt-5 outline-none ${pageIn(route.dir).className} ${home ? 'flex flex-col board-fit:min-h-0' : ''} ${adjusting === 'wallpaper' ? 'invisible' : ''}`}
          data-adjust={adjusting ?? undefined}
          style={pageIn(route.dir).style}
        >
          <Screens
            hub={hub}
            home={
              <HomePage me={hub.me} editing={editing}>
                <DesktopBoard layout={widgets} defs={hub.visible} ctx={hub.ctx} editing={editing} onEdit={hub.startEditing} decor={decor} />
              </HomePage>
            }
          />
        </main>

        <footer className={`px-1 pt-8 text-xs text-muted ${home ? 'board-fit:hidden' : ''}`}>© DVISION · DVI Portal</footer>
      </div>
      <GooFilter />
    </>
  )
}
