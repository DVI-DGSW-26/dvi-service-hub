import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { StackSize } from '@dvi/core/widget'
import type { Decor } from '@/features/decor'
import type { WidgetLayout } from '../hooks/useWidgetLayout'
import { useLongPress } from '../hooks/useLongPress'
import { useUndoKeys } from '../hooks/useUndoKeys'
import { ROW_H } from '../lib/constants'
import type { WidgetContext, WidgetDef } from '../lib/widgetDef'
import { sizeFor, span, type Item } from '../lib/widgetLayout'
import { BoardEmpty } from './BoardEmpty'
import { StackBoard } from './StackBoard'
import { WidgetCell } from './WidgetCell'

interface MobileBoardProps {
  layout: WidgetLayout
  /** 이 사람에게 보이는 위젯 */
  defs: WidgetDef[]
  ctx: Omit<WidgetContext, 'size'>
  editing: boolean
  onEdit: () => void
  /** 편집에서 위젯을 골랐는지 — 셸이 아래 막대를 숨긴다 */
  onPick: (picking: boolean) => void
  /** 위젯을 끌어 옮기고 놓으면 편집을 끝낸다 */
  onDone: () => void
  /** 편집 중 인사 카드 위의 그림 바꾸기(registry 의 decor) */
  decor: Decor
}

/**
 * 좁은 화면 위젯 판 — 넓은 화면 칸 배치 없이 모든 페이지를 4칸 격자 판에 좁은 화면 순서 · 크기대로 쌓고,
 * 편집도 그 자리에서 한다(StackBoard — 길게 눌러 옮기기, 모서리 손잡이로 크기). 넓은 화면은 DesktopBoard
 */
export function MobileBoard({ layout, defs, ctx, editing, onEdit, onPick, onDone, decor }: MobileBoardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const longPress = useLongPress(editing, onEdit)
  useUndoKeys(editing, layout)

  const byType = new Map(defs.map((d) => [d.type, d]))
  const total = layout.pages.reduce((n, p) => n + p.length, 0)
  /** 위젯 하나 — 고른 크기(stack)의 칸 수만큼, 편집 중에는 크기 손잡이(overlay)를 얹는다 */
  const widget = (c: Item, index: number, list: Item[], stack: StackSize, overlay?: ReactNode) => {
    const def = byType.get(c.i)
    if (!def) return null
    const size = sizeFor(def.sizes, width, span(c.h, ROW_H))
    return <WidgetCell key={c.i} {...{ c, index, list, stack, overlay, def, size, editing, ctx, decor, longPress }} onRemove={() => layout.remove(c.i)} />
  }

  return (
    <div ref={ref}>
      {!total && !editing ? (
        <BoardEmpty onEdit={onEdit} />
      ) : (
        width > 0 && <StackBoard layout={layout} defs={defs} editing={editing} onEdit={onEdit} onPick={onPick} onDone={onDone} renderWidget={widget} />
      )}
    </div>
  )
}
