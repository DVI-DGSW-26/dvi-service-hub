import { useState } from 'react'
import { KEYS, writePref } from '@/shared/lib'
import { type StackSize } from '@/shared/widget'
import { readJson } from '../lib/readJson'
import { parseStack, stack, type Stack } from '../lib/stackLayout'
import type { Page } from '../lib/widgetLayout'

/**
 * 좁은 화면(모바일) 위젯 배치 — 4칸 격자에 쌓는 순서와 위젯별 크기(lib/stackLayout.ts). 넓은 화면 칸 배치(useWideLayout)와 따로 저장한다.
 * 되돌리기에는 넣지 않는다(다시 드래그하거나 고르면 된다). 어떤 위젯이 있는지는 넓은 화면 페이지(pages)에서 받는다
 */
export function useStackLayout(pages: Page[]) {
  const [narrow, setNarrow] = useState(() => parseStack(readJson(KEYS.widgetsStack)))
  const items = stack(pages, narrow.order)
  const save = (next: Stack) => {
    setNarrow(next)
    writePref(KEYS.widgetsStack, JSON.stringify(next))
  }

  return {
    /** 한 줄로 쌓은 위젯(모든 페이지) */
    items,
    /** 고른 크기 — 그릴 수 있는지는 registry 의 stack 으로 본다(lib/stackLayout.ts 의 stackSizeOf) */
    sizes: narrow.sizes,
    /** 위젯을 to 번째로 — 넓은 화면 칸 배치는 그대로. 안 보이는 위젯의 순서는 뒤에 남긴다 */
    move: (type: string, to: number) => {
      const list = items.map((c) => c.i).filter((i) => i !== type)
      list.splice(Math.max(0, Math.min(list.length, to)), 0, type)
      save({ ...narrow, order: [...list, ...narrow.order.filter((i) => !list.includes(i))] })
    },
    resize: (type: string, size: StackSize) => save({ ...narrow, sizes: { ...narrow.sizes, [type]: size } }),
    /** 기본 배치로 — 순서 · 크기를 지운다 */
    reset: () => {
      setNarrow({ order: [], sizes: {} })
      writePref(KEYS.widgetsStack, null)
    },
  }
}

export type StackLayout = ReturnType<typeof useStackLayout>
