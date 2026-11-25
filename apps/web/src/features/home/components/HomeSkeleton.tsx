import { Skeleton } from '@/shared/ui'
import type { WidgetLayout } from '../hooks/useWidgetLayout'
import { STACK_CELLS, stackSizeOf } from '../lib/stackLayout'
import type { WidgetDef } from '../lib/widgetDef'

/**
 * 좁은 화면 홈의 자리표시 — 그 사람이 쌓아 둔 위젯 순서 · 크기(StackBoard 와 같은 칸)대로 빈 위젯을 놓는다.
 * 홈은 떠나도 숨겨 두는 하나뿐이라(App 의 Activity) 옆 탭에서 밀어 볼 때(SwipePeek)는 이것을 그린다
 */
export function HomeSkeleton({ layout, defs }: { layout: WidgetLayout; defs: WidgetDef[] }) {
  const byType = new Map(defs.map((d) => [d.type, d]))
  return (
    <div className="stack-wrap">
      <div className="widget-board">
        {layout.narrow.items.map((c) => {
          const def = byType.get(c.i)
          if (!def) return null
          const [w, h] = STACK_CELLS[stackSizeOf(def.stack ?? ['m'], layout.narrow.sizes[c.i])]
          return (
            <div key={c.i} style={{ gridColumn: `span ${w}`, gridRow: `span ${h}` }} className="glass flex min-w-0 flex-col gap-3 rounded-3xl p-4">
              {h > 1 && (
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-9 flex-none" />
                  {w > 1 && <Skeleton className="h-5 w-24 rounded-md" />}
                </div>
              )}
              <Skeleton className="min-h-0 flex-1" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
