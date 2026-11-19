import { useState } from 'react'
import { COLS, ROWS } from '../lib/constants'
import type { WidgetDef } from '../lib/widgetDef'
import { KEYS, readPref, writePref } from '@/shared/lib'
import { cellsFor, fromHalf, fromRows, minSize, parsePages, placeAt, placeOn, strip, tidy, valid, without, type Page } from '../lib/widgetLayout'
import { parseStack, stack, type Stack } from '../lib/stackLayout'
import { type StackSize } from '@dvi/core/widget'

/** 처음 배치 — 위젯 이전의 고정 홈과 같은 한 화면(24 × 12 칸) */
export const DEFAULT_WIDGETS: Page[] = [
  [
    { i: 'hero', x: 0, y: 0, w: 16, h: 4 },
    { i: 'quick-links', x: 16, y: 0, w: 8, h: 4 },
    { i: 'systems', x: 0, y: 4, w: 16, h: 4 },
    { i: 'today', x: 16, y: 4, w: 8, h: 4 },
    { i: 'maintenance', x: 0, y: 8, w: 8, h: 4 },
    { i: 'news', x: 8, y: 8, w: 8, h: 4 },
    { i: 'calendar', x: 16, y: 8, w: 8, h: 4 },
  ],
]

const read = (key: string): unknown => {
  try {
    return JSON.parse(readPref(key) ?? 'null')
  } catch {
    return null
  }
}

/** 저장된 배치. 예전 키의 12 × 6 칸 · 줄 비율 형식은 지금 칸으로 옮긴다(고치면 새 키에 저장된다). 모양이 틀리면 처음 배치로 */
function load(): Page[] {
  const old = read(KEYS.widgetsOld)
  return parsePages(read(KEYS.widgets)) ?? fromHalf(old) ?? fromRows(old) ?? DEFAULT_WIDGETS
}

/** 되돌리기로 기억하는 배치 수 */
const HISTORY = 50

/** 판을 아직 못 쟀을 때의 칸 크기(px) — 화면에 맞춘 기준 화면(1880 × 900)쯤 */
const NOMINAL = { w: 46, h: 52 }

/**
 * 홈 위젯 배치 — 페이지마다 칸 정수 자리에 놓인 그대로(lib/widgetLayout.ts). 끌기 · 크기 조절 손놀림은 위젯 판의 react-grid-layout 이 한다.
 * 이 사람에게 안 보이는 위젯(권한 · 운영에 없는 목업)은 배치에서 빼고 그리되 저장은 남긴다 — 고칠 때 마지막 페이지 빈칸으로 옮겨 둔다.
 * shortcut: 이 브라우저에만 저장한다. 다른 기기에서도 같은 홈을 보려면 허브 서버에 사람별로 저장하는 API 가 필요하다.
 */
export function useWidgetLayout(defs: WidgetDef[]) {
  const [raw, setRaw] = useState(load)
  // 되돌리기 · 다시 하기 — 바꾸기 전 배치를 쌓는다(이 탭에서만, 최근 HISTORY 번)
  const [undos, setUndos] = useState<Page[][]>([])
  const [redos, setRedos] = useState<Page[][]>([])
  const [page, setPage] = useState(0)
  // 좁은 화면 배치(순서 · 크기) — 되돌리기에는 넣지 않는다(다시 드래그하거나 고르면 된다)
  const [narrow, setNarrow] = useState(() => parseStack(read(KEYS.widgetsStack)))
  // 위젯 판이 그린 뒤 알려 주는 칸 한 개 크기(px) — 최소 크기를 칸 수로 바꿀 때
  const [cell, setCell] = useState(NOMINAL)
  const byType = new Map(defs.map((d) => [d.type, d]))
  const pages = raw.map((p) => p.filter((c) => byType.has(c.i))).filter((p) => p.length)
  const cur = Math.max(0, Math.min(page, pages.length - 1))
  const items = pages[cur] ?? []
  const stacked = stack(pages, narrow.order)
  const saveNarrow = (next: Stack) => {
    setNarrow(next)
    writePref(KEYS.widgetsStack, JSON.stringify(next))
  }

  /** 위젯의 최소 크기(칸) — 새로 넣을 때도 이 크기 */
  const minCells = (type: string) => {
    const d = byType.get(type)
    const px = d?.min ?? minSize(d?.sizes ?? ['s'])
    return { w: cellsFor(px.w, cell.w, COLS), h: cellsFor(px.h, cell.h, ROWS) }
  }

  /** 배치를 바꾸고 저장한다 — 바꾸기 전 배치는 되돌리기에 쌓는다 */
  const save = (all: Page[]) => {
    setUndos((u) => [...u.slice(1 - HISTORY), raw])
    setRedos([])
    setRaw(all)
    writePref(KEYS.widgets, JSON.stringify(all))
  }
  /** 되돌리기 · 다시 하기 — from 의 마지막 배치로, 지금 배치는 to 에 쌓는다 */
  const step = (from: Page[][], setFrom: typeof setUndos, setTo: typeof setUndos) => {
    const prev = from.at(-1)
    if (!prev) return
    setFrom(from.slice(0, -1))
    setTo((t) => [...t, raw])
    setRaw(prev)
    writePref(KEYS.widgets, JSON.stringify(prev))
  }

  /** 빈 페이지는 지우고 저장한다. type 을 주면 그 위젯이 있는 페이지를 보여준다 */
  const commit = (next: Page[], type?: string) => {
    let all = next.filter((p) => p.length)
    // 안 보이는 위젯은 마지막 페이지(자리가 없으면 새 페이지)로 돌려 둔다
    for (const c of raw.flat().filter((c) => !byType.has(c.i))) all = placeOn(all, c.i, Math.max(0, all.length - 1), c) ?? placeOn(all, c.i, all.length, c) ?? all
    save(all)
    const at = next.findIndex((p) => p.some((c) => c.i === type))
    setPage(Math.max(0, at >= 0 ? at : Math.min(cur, next.length - 1)))
  }
  /** 보고 있는 페이지만 바꾼다 — 기준(겹침 · 판 밖 · 위젯 수)에 안 맞으면 받지 않고 false */
  const commitPage = (p: Page, type?: string) => {
    if (!valid(p)) return false
    // 위젯이 하나도 없으면 pages 가 비어 있다 — 그래도 보고 있는 페이지(0)에 넣는다
    const next = [...pages]
    next[cur] = strip(p)
    commit(next, type)
    return true
  }

  return {
    pages,
    page: cur,
    setPage,
    /** 보고 있는 페이지의 위젯 자리 */
    items,
    setCell,
    minCells,
    commit,
    commitPage,
    has: (type: string) => pages.some((p) => p.some((c) => c.i === type)),
    /** 보고 있는 페이지의 첫 빈칸에, 자리가 없으면 새 페이지에 넣는다 */
    add: (type: string) => {
      const next = placeOn(pages, type, cur, minCells(type)) ?? placeOn(pages, type, pages.length, minCells(type))
      if (next) commit(next, type)
    },
    /** 다른 페이지로 — at 을 주면 그 칸에(덮인 위젯은 비킨다), 안 되거나 없으면 첫 빈칸에. 자리가 없으면 false(없는 페이지면 새로 만들어) */
    toPage: (type: string, p: number, at?: { x: number; y: number }) => {
      const next = (at && placeAt(pages, type, p, at.x, at.y)) || placeOn(pages, type, p, minCells(type))
      return !!next && (commit(next, type), true)
    },
    remove: (type: string) => commit(without(pages, type)),
    /** 좁은 화면에서 한 줄로 쌓은 위젯(모든 페이지) */
    stack: stacked,
    /** 좁은 화면에서 위젯을 to 번째로 — 넓은 화면 칸 배치는 그대로. 안 보이는 위젯의 순서는 뒤에 남긴다 */
    moveInStack: (type: string, to: number) => {
      const list = stacked.map((c) => c.i).filter((i) => i !== type)
      list.splice(Math.max(0, Math.min(list.length, to)), 0, type)
      saveNarrow({ ...narrow, order: [...list, ...narrow.order.filter((i) => !list.includes(i))] })
    },
    /** 좁은 화면에서 고른 크기 — 그릴 수 있는지는 registry 의 stack 으로 본다(lib/widgetLayout.ts 의 stackSizeOf) */
    stackSizes: narrow.sizes,
    resizeInStack: (type: string, size: StackSize) => saveNarrow({ ...narrow, sizes: { ...narrow.sizes, [type]: size } }),
    /** 보고 있는 페이지의 빈칸 정리 — 위 · 왼쪽으로 당겨 붙인다(크기 그대로) */
    tidy: () => commitPage(tidy(items)),
    /** 기본 배치로 — 되돌리기로 돌아올 수 있다 */
    reset: () => {
      save(DEFAULT_WIDGETS)
      setPage(0)
      writePref(KEYS.widgetsOld, null)
      setNarrow({ order: [], sizes: {} })
      writePref(KEYS.widgetsStack, null)
    },
    canUndo: undos.length > 0,
    undo: () => step(undos, setUndos, setRedos),
    redo: () => step(redos, setRedos, setUndos),
  }
}

export type WidgetLayout = ReturnType<typeof useWidgetLayout>
