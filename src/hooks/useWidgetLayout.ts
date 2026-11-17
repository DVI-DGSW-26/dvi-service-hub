import { useState } from 'react'
import type { WidgetDef } from '../components/widgets/registry'
import { KEYS, readPref, writePref } from '../lib/theme'
import { bestSpot, count, fitsBox, minSize, movePages, settle, MAX_WIDGETS, without, type Box, type Row, type Target } from '../lib/widgetLayout'

/** 처음 배치 — 위젯 이전의 고정 홈과 같은 한 화면 */
export const DEFAULT_WIDGETS: Row[][] = [
  [
    { h: 1, items: [{ type: 'hero', w: 2 }, { type: 'quick-links', w: 1 }] },
    { h: 1, items: [{ type: 'systems', w: 2 }, { type: 'today', w: 1 }] },
    { h: 1, items: [{ type: 'maintenance', w: 1 }, { type: 'news', w: 1 }, { type: 'calendar', w: 1 }] },
  ],
]

const ratio = (v: unknown) => typeof v === 'number' && v > 0 && Number.isFinite(v)
const isRow = (r: Row) => ratio(r?.h) && Array.isArray(r.items) && r.items.length > 0 && r.items.every((c) => typeof c?.type === 'string' && ratio(c.w))

/** 저장된 배치(페이지마다 줄 목록). 페이지 없이 줄 목록만 있던 형식은 한 페이지로. 하나라도 모양이 틀리면 처음 배치로 — 반쯤 살린 배치는 홈을 깨뜨린다 */
function load(): Row[][] {
  try {
    const saved: unknown = JSON.parse(readPref(KEYS.widgets) ?? 'null')
    if (!Array.isArray(saved)) return DEFAULT_WIDGETS
    const pages = (saved.every((p) => !Array.isArray(p)) ? [saved] : saved) as Row[][]
    return pages.every((p) => Array.isArray(p) && p.every(isRow)) ? pages : DEFAULT_WIDGETS
  } catch {
    return DEFAULT_WIDGETS
  }
}

/** 판 크기를 모를 때(아직 안 그림 · 좁은 화면) — 개수 상한만 본다 */
const OPEN: Box = { width: Infinity, height: Infinity, gap: 0 }

/**
 * 홈 위젯 배치 — 페이지마다 줄 목록이고, 줄마다 위젯이 폭을 나눠 갖는다 (계산은 lib/widgetLayout.ts). 한도(최소 크기 · 개수)는 페이지마다 본다.
 * 이 사람에게 안 보이는 위젯(권한 · 운영에 없는 목업)은 배치에서 빼고 그리되 저장은 그대로 둔다 — 권한이 돌아오면 마지막 페이지 맨 아래로 돌아온다.
 * shortcut: 이 브라우저에만 저장한다. 다른 기기에서도 같은 홈을 보려면 허브 서버에 사람별로 저장하는 API 가 필요하다.
 */
export function useWidgetLayout(defs: WidgetDef[]) {
  const [raw, setRaw] = useState(load)
  /** 보고 있는 페이지 — 끄는 중에는 아직 없는 새 페이지(페이지 수와 같은 번호)일 수 있다. 그리는 쪽이 맞춘다 */
  const [page, setPage] = useState(0)
  // 위젯 판(WidgetGrid)이 그린 뒤 알려 준다 — 화면에 맞추지 않는 크기면 높이는 Infinity
  const [box, setBox] = useState<Box>(OPEN)
  const byType = new Map(defs.map((d) => [d.type, d]))
  const hidden = (type: string) => !byType.has(type)
  const pages = raw.map((p) => p.map((r) => ({ ...r, items: r.items.filter((c) => !hidden(c.type)) })).filter((r) => r.items.length)).filter((p) => p.length)
  const cur = Math.max(0, Math.min(page, pages.length - 1))
  const rows = pages[cur] ?? []
  const mins = (type: string) => byType.get(type)?.min ?? minSize(byType.get(type)?.sizes ?? ['s'])
  const fits = (next: Row[]) => fitsBox(next, box, mins)

  /** 빈 페이지는 지우고(최소 아래로 내려간 위젯 · 줄은 고쳐서) 저장한다. type 을 주면 그 위젯이 있는 페이지를 보여준다 */
  const commit = (next: Row[][], type?: string) => {
    const kept = next.filter((p) => p.length).map((p) => settle(p, box, mins))
    // 안 보이는 위젯은 마지막 페이지 맨 아래 한 줄로 모아 둔다
    const lost = raw.flatMap((p) => p.flatMap((r) => r.items.filter((c) => hidden(c.type))))
    const all = lost.length ? [...kept.slice(0, -1), [...(kept.at(-1) ?? []), { h: 1, items: lost }]] : kept
    setRaw(all)
    writePref(KEYS.widgets, JSON.stringify(all))
    const at = kept.findIndex((p) => p.some((r) => r.items.some((c) => c.type === type)))
    setPage(Math.max(0, at >= 0 ? at : Math.min(cur, kept.length - 1)))
  }
  /** 페이지 p 의 target 으로 — 그 페이지에 들어가면 저장하고 true */
  const moveTo = (type: string, p: number, target: Target) => {
    const next = movePages(pages, type, p, target)
    return fits(next[p]) && (commit(next, type), true)
  }

  return {
    pages,
    page,
    setPage,
    /** 보고 있는 페이지의 줄 */
    rows,
    box,
    setBox,
    mins,
    fits,
    /** 끄는 동안 미리보기도 놓았을 때와 같게 */
    settle: (next: Row[]) => settle(next, box, mins),
    commit,
    /** 보고 있는 페이지에 더 넣을 수 없음(개수) */
    full: count(rows) >= MAX_WIDGETS,
    has: (type: string) => pages.some((p) => p.some((r) => r.items.some((c) => c.type === type))),
    /** 보고 있는 페이지에 누르기만 해서 추가할 자리 — 없으면 null */
    spot: (type: string) => bestSpot(rows, type, box, mins),
    /** 보고 있는 페이지 안에서 옮기기 · 넣기 */
    put: (type: string, target: Target) => moveTo(type, cur, target),
    /** 다른 페이지로 — 그 페이지에 자리가 있으면(없는 페이지면 새로 만들어) */
    toPage: (type: string, p: number) => {
      const spot = p < pages.length ? bestSpot(without(pages[p], type), type, box, mins) : { newRow: 0 }
      return !!spot && moveTo(type, p, spot)
    },
    remove: (type: string) => commit(pages.map((p) => without(p, type))),
    reset: () => {
      setRaw(DEFAULT_WIDGETS)
      setPage(0)
      writePref(KEYS.widgets, null)
    },
  }
}

export type WidgetLayout = ReturnType<typeof useWidgetLayout>
