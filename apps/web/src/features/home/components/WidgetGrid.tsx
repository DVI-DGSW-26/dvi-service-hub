import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import type { Decor } from '@/features/decor'
import type { WidgetLayout } from '../hooks/useWidgetLayout'
import { colWidth, rowHeight, sizeFor, span, type Page } from '../lib/widgetLayout'
import { type StackSize } from '@/shared/widget'
import { FIT, ROW_H } from '../lib/constants'
import { BOARD } from '@/shared/constants'
import { BoardEmpty } from './BoardEmpty'
import { useLongPress, type PickUp } from '../hooks/useLongPress'
import { usePageNav } from '../hooks/usePageNav'
import { PageDots } from './PageDots'
import { type WidgetContext, type WidgetDef } from '../lib/widgetDef'
import { WidgetCell } from './WidgetCell'
import { StackBoard } from './StackBoard'
import { WideBoard } from './WideBoard'

interface WidgetGridProps {
  layout: WidgetLayout
  /** 이 사람에게 보이는 위젯 */
  defs: WidgetDef[]
  ctx: Omit<WidgetContext, 'size'>
  editing: boolean
  onEdit: () => void
  /** 좁은 화면 편집에서 위젯을 골랐는지(StackBoard) */
  onPick: (picking: boolean) => void
  /** 길게 눌러 편집을 켜고 위젯을 끌어 옮기고 놓으면 편집을 끝낸다(StackBoard · WideBoard) */
  onDone: () => void
  /** 편집 중 인사 카드 위의 그림 바꾸기(registry 의 decor) */
  decor: Decor
}

/**
 * 홈 위젯 판의 틀 — 판 크기를 재고(넓은 화면인지 · 화면에 맞추는지), 페이지 트랙 · 페이지 점 · 페이지 넘기기(usePageNav)와 위젯 하나 그리기(WidgetCell)를 맡는다.
 * 편집은 화면 폭에 따라 한쪽 판이 맡는다 — 넓은 화면은 WideBoard(칸 배치 · react-grid-layout), 좁은 화면은 StackBoard(4칸 격자에 순서 · 크기대로 쌓기).
 * 두 판은 배치를 따로 저장한다(useWideLayout · useStackLayout).
 * 넓고 높은 화면은 행 높이를 화면 높이로 나눠 한 페이지가 스크롤 없이 한 장, 그보다 낮으면 행 높이 ROW_H 로 스크롤된다.
 * 편집 중 Ctrl(⌘) + Z 로 되돌리고 Ctrl + Shift + Z · Ctrl + Y 로 다시 한다. 페이지는 빈 곳을 옆으로 밀거나(스와이프) 위젯에 초점이 없을 때 ← · → 로도 넘긴다.
 */
export function WidgetGrid({ layout, defs, ctx, editing, onEdit, onPick, onDone, decor }: WidgetGridProps) {
  const viewRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [edge, setEdge] = useState(0)
  // 누른 자리 — react-grid-layout 은 손이 몇 px 움직인 뒤에야 끌기 시작을 알려(그때 이벤트는 첫 움직임) 잡은 점이 그만큼 어긋난다(WideBoard)
  const downAt = useRef({ x: 0, y: 0 })
  const [area, setArea] = useState({ width: 0, height: 0, lg: false, fit: false })

  const byType = new Map(defs.map((d) => [d.type, d]))
  const { pages, page } = layout
  const pageCount = Math.max(1, pages.length)
  const total = pages.reduce((n, p) => n + p.length, 0)
  const rowH = area.fit ? rowHeight(area.height) : ROW_H
  const colW = colWidth(area.width)

  useLayoutEffect(() => {
    const view = viewRef.current
    if (!view) return
    const sync = () => {
      const a = { width: trackRef.current?.clientWidth ?? 0, height: view.clientHeight, lg: matchMedia(BOARD).matches, fit: matchMedia(FIT).matches }
      setArea(a)
      if (a.lg) layout.setCell({ w: colWidth(a.width), h: a.fit ? rowHeight(a.height) : ROW_H })
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(view)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 처음 한 번만 걸고, 크기는 ResizeObserver 가 알린다
  }, [])

  // 마우스로 길게 눌러 편집을 켰으면 그 위젯을 넓은 판이 이어 끈다
  const pickUp = useRef<PickUp | null>(null)
  const longPress = useLongPress(editing, onEdit, pickUp)
  const nav = usePageNav({ layout, pageCount, area, editing, dragging, viewRef, trackRef })

  /**
   * 위젯 하나 — 그릴 크기는 칸이 그려진 px 로 정한다(넓은 화면은 칸 폭 width, 좁은 화면은 판 폭).
   * 넓은 화면은 키보드 옮기기(onKeyDown)를, 좁은 화면은 고른 크기(stack)와 편집 중 얹을 손잡이(overlay)를 준다
   */
  const widget = (c: Page[number], index: number, list: Page, opts: { width?: number; stack?: StackSize; overlay?: ReactNode; onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void }) => {
    const def = byType.get(c.i)
    if (!def) return null
    const { stack, overlay } = opts
    const size = sizeFor(def.sizes, opts.width ?? area.width, span(c.h, rowH))
    return (
      <WidgetCell
        key={c.i}
        {...{ c, index, list, stack, overlay, def, size, editing, ctx, decor, longPress }}
        onKeyDown={opts.onKeyDown}
        onRemove={() => layout.remove(c.i)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3 lg:h-full">
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- 휠 · 스와이프로 페이지를 넘기는 틀. 키보드 ← · → 는 usePageNav 가 문서에서 받는다 */}
      <div
        ref={viewRef}
        onWheel={nav.onWheel}
        onMouseDown={nav.onMouseDown}
        onPointerDownCapture={(e) => void (downAt.current = { x: e.clientX, y: e.clientY })}
        onPointerDown={nav.onSwipeStart}
        onPointerMove={nav.onSwipeMove}
        onPointerUp={nav.onSwipeEnd}
        onPointerCancel={nav.onSwipeEnd}
        data-edge={edge || undefined}
        className="widget-view lg:min-h-0 lg:flex-1 lg:touch-pan-y"
      >
        <div ref={trackRef} className="widget-track" style={{ '--page': page } as CSSProperties}>
          {!total && !editing ? (
            <BoardEmpty onEdit={onEdit} />
          ) : (
            area.width > 0 &&
            (area.lg ? (
              <WideBoard
                {...{ layout, pageCount, colW, rowH, editing, viewRef }}
                downAtRef={downAt}
                pickUpRef={pickUp}
                onDone={onDone}
                draggingRef={dragging}
                width={area.width}
                onEdge={setEdge}
                renderWidget={widget}
              />
            ) : (
              // 좁은 화면 — 모든 페이지를 4칸 격자 판에, 좁은 화면 순서 · 크기대로. 편집도 그 자리에서
              <StackBoard layout={layout.narrow} defs={defs} editing={editing} onEdit={onEdit} onPick={onPick} onDone={onDone} renderWidget={widget} />
            ))
          )}
        </div>
      </div>

      {pageCount > 1 && <PageDots page={page} pageCount={pageCount} onPage={layout.setPage} />}
    </div>
  )
}
