import { useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { DecorAdjust, Wallpaper } from '@/features/decor'
import { EditDock, GALLERY, HomePage, MobileBoard } from '@/features/home'
import { EditTabBar, GooFilter, TabBar, TopBar } from '@/features/shell'
import { Screens } from './Screens'
import { SkipLink } from './SkipLink'
import type { Hub } from './useHub'

/** 좁은 화면(64rem 미만) — 아래 탭 바 · 4칸 격자 위젯 판 · 탭 바가 편집 막대가 된다 */
export default function MobileApp({ hub }: { hub: Hub }) {
  const { route, decor, adjusting, widgets, editing, home } = hub
  // 편집에서 위젯을 골라 테두리를 띄운 동안 — 아래 막대(편집 독 · 탭 바)가 손잡이를 가리지 않게 숨긴다
  const [picking, setPicking] = useState(false)
  // '완료' 말고도 빈 곳(위젯 · 버튼 밖)을 누르면 끝난다 — 홈 화면 앱처럼. 위젯을 골라 둔 채 누르면 그 누름은 고르기만 푼다(StackBoard)
  const pickedAtDown = useRef(false)
  const endOnEmpty = {
    onPointerDownCapture: () => void (pickedAtDown.current = picking),
    onClick: (e: MouseEvent) => {
      if (!editing || pickedAtDown.current || adjusting) return
      if (!(e.target as Element).closest('[data-type], button, a, input, label, dialog, [role="toolbar"]')) hub.stopEditing()
    },
  }

  return (
    <>
      <SkipLink />
      {home && decor.wallpaper && <Wallpaper src={decor.wallpaper} pos={decor.pos.wallpaper} />}
      {editing && adjusting && <DecorAdjust decor={decor} />}
      {/* 탭 바가 편집 막대가 되고(EditTabBar), 이 독은 그림 위치 조정 때만 */}
      {editing && !picking && adjusting && (
        <EditDock decor={decor} onTidy={widgets.tidy} onUndo={widgets.canUndo ? widgets.undo : undefined} onReset={GALLERY ? undefined : widgets.reset} onDone={hub.stopEditing} side={0} />
      )}

      <div className="flex min-h-dvh flex-col px-3 pt-3 pb-24 sm:px-4">
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

        {/* 화면을 옮기면 main 을 새로 그려 옮긴 방향에서 밀려 들어온다(styles/layout.css 의 .page-in) — 앱의 탭 넘김처럼 */}
        <main
          key={route.page}
          id="main"
          tabIndex={-1}
          className={`flex-1 pt-5 outline-none ${route.dir ? 'page-in' : ''} ${home ? 'flex flex-col' : ''} ${adjusting === 'wallpaper' ? 'invisible' : ''}`}
          data-adjust={adjusting ?? undefined}
          {...endOnEmpty}
          style={route.dir ? ({ '--dir': Math.sign(route.dir) } as CSSProperties) : undefined}
        >
          <Screens
            hub={hub}
            home={
              <HomePage me={hub.me} editing={editing}>
                <MobileBoard layout={widgets} defs={hub.visible} ctx={hub.ctx} editing={editing} onEdit={hub.startEditing} onPick={setPicking} onDone={hub.stopEditing} decor={decor} />
              </HomePage>
            }
          />
        </main>

        {/* 휴대폰은 앱처럼 바닥글 없이 — 탭 바가 화면 끝이다 */}
        <footer className="px-1 pt-8 text-xs text-muted max-sm:hidden">© DVISION · DVI Portal</footer>
      </div>

      {!editing ? <TabBar page={route.page} /> : !adjusting && !picking && <EditTabBar decor={decor} onReset={widgets.reset} onDone={hub.stopEditing} />}
      <GooFilter />
    </>
  )
}
