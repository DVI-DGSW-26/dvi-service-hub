import type { WidgetDef } from '../lib/widgetDef'
import { useStackLayout } from './useStackLayout'
import { useWideLayout } from './useWideLayout'

/**
 * 홈 위젯 배치 — 넓은 화면 칸 배치(useWideLayout)와 좁은 화면 쌓기(useStackLayout)를 묶는다. 둘은 따로 저장하고, 기본 배치로 돌릴 때만 함께 바뀐다.
 * 넓은 화면 것은 그대로 펼쳐 두고(App · 갤러리 · WideBoard), 좁은 화면 것은 narrow 로(StackBoard)
 */
export function useWidgetLayout(defs: WidgetDef[]) {
  const wide = useWideLayout(defs)
  const narrow = useStackLayout(wide.pages)
  return {
    ...wide,
    narrow,
    reset: () => {
      wide.reset()
      narrow.reset()
    },
  }
}

export type WidgetLayout = ReturnType<typeof useWidgetLayout>
