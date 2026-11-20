import { Minus } from 'lucide-react'
import type { HTMLAttributes, KeyboardEvent, ReactNode, Ref } from 'react'
import { DecorMenu, type Decor } from '@/features/decor'
import { useI18n } from '@/shared/i18n'
import type { StackSize } from '@/shared/widget'
import type { LongPress } from '../hooks/useLongPress'
import { STACK_CELLS } from '../lib/stackLayout'
import type { Item, WidgetSize } from '../lib/widgetLayout'
import { GALLERY, text, type WidgetContext, type WidgetDef } from '../lib/widgetDef'

/**
 * react-grid-layout 이 칸마다 복제해 넣는 것(className · style · ref · 끌기 마우스 · 터치 핸들러 · 크기 손잡이 children)을 받아
 * 루트 div 에 그대로 넘긴다 — 빠지면 칸 자리를 못 잡고 끌 수도 없다
 */
interface WidgetCellProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onKeyDown'> {
  ref?: Ref<HTMLDivElement>
  c: Item
  index: number
  list: Item[]
  /** 좁은 화면에서 고른 크기 — 넓은 화면 칸 판에서는 없다 */
  stack?: StackSize
  /** 편집 중 위에 얹을 크기 손잡이(StackBoard) */
  overlay?: ReactNode
  def: WidgetDef
  /** 칸이 그려진 px 로 정한 그릴 크기 */
  size: WidgetSize
  editing: boolean
  ctx: Omit<WidgetContext, 'size'>
  decor: Decor
  longPress: LongPress
  onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void
  onRemove: () => void
}

/**
 * 위젯 하나 — 좁은 화면은 고른 크기(stack)의 칸 수만큼 차지한다(styles/widgets/stack.css 의 .stack-wrap).
 * 좁은 화면의 옮기기 · 키보드는 StackBoard 가 하고, 넓은 화면의 옮기기는 react-grid-layout 이 한다
 */
export function WidgetCell({ c, index, list, stack, overlay, def, size, editing, ctx, decor, longPress, onKeyDown, onRemove, className = '', style, children, ref, ...grid }: WidgetCellProps) {
  const { t, f } = useI18n()
  const name = text(def.title, t)
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- 길게 눌러 편집 켜기 · 끌기를 받는 목록 칸. 키보드는 편집 중 초점(tabIndex)과 onKeyDown 으로
    <div
      {...grid}
      ref={ref}
      role="listitem"
      data-size={size}
      data-stack={stack}
      data-type={c.i}
      // 좁은 화면 크기 바꾸기의 이어 그리기(StackBoard 의 morph) — 위젯마다 이름이 하나씩 있어야 한다
      style={
        stack
          ? ({
              ...style,
              gridColumn: `span ${STACK_CELLS[stack][0]}`,
              gridRow: `span ${STACK_CELLS[stack][1]}`,
              viewTransitionName: `w-${c.i.replace(/[^\w-]/g, '_')}`,
              viewTransitionClass: 'stack-widget',
            })
          : style
      }
      className={`${className} rounded-3xl ${editing || stack ? 'cursor-grab touch-manipulation select-none [-webkit-touch-callout:none]' : ''}`}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- 편집 중에는 위젯에 초점을 두고 화살표로 옮긴다
      tabIndex={editing ? 0 : undefined}
      aria-label={editing ? f(stack ? t.widgets.positionStack : GALLERY ? t.widgets.position : t.widgets.positionMove, { name, index: index + 1, total: list.length }) : undefined}
      // 좁은 화면의 길게 누르기(편집 켜고 위젯 들기)는 StackBoard 가 맡는다
      onPointerDown={stack ? undefined : longPress.onPointerDown}
      onPointerMove={longPress.onPressMove}
      onPointerUp={longPress.cancelPress}
      onPointerCancel={longPress.cancelPress}
      onKeyDown={onKeyDown}
      onClickCapture={longPress.onClickCapture}
      onContextMenu={(e) => {
        if (editing || stack || longPress.press.current) e.preventDefault()
      }}
    >
      <div className="widget-body relative h-full">
        <div inert={editing} className="h-full">
          {def.render({ ...ctx, size, stack })}
        </div>
        {/* 빼기는 다시 넣을 갤러리가 있을 때만(GALLERY) */}
        {editing && GALLERY && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={f(t.widgets.remove, { name })}
            className="absolute -top-2 -left-2 z-10 grid size-7 animate-materialize cursor-pointer place-items-center rounded-full bg-fg/75 text-bg shadow-[0_2px_8px_oklch(0_0_0/0.25)] ring-2 ring-bg transition-[scale] hover:scale-110 active:scale-90"
          >
            <Minus className="size-4" strokeWidth={3} aria-hidden="true" />
          </button>
        )}
        {/* 그림을 고칠 수 있는 위젯(인사 카드)은 그 위에서 바로 — 위젯 내용은 inert 라 그 밖에 둔다. no-drag: 메뉴 안을 눌러도 위젯이 끌리지 않게 */}
        {editing && def.decor && (
          <div className="no-drag absolute top-3 right-3 z-10">
            <DecorMenu
              kind={def.decor}
              decor={decor}
              direct
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-raised px-3.5 text-sm font-semibold text-fg shadow-[0_2px_8px_oklch(0_0_0/0.18)] ring-1 ring-line active:scale-95"
            />
          </div>
        )}
        {overlay}
      </div>
      {children}
    </div>
  )
}
