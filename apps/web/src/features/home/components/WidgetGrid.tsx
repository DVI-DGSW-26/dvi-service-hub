import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type KeyboardEvent } from 'react'
import GridLayout, { type Compactor, type Layout, type LayoutItem } from 'react-grid-layout'
import { calcGridItemPosition, setTransform } from 'react-grid-layout/core'
import type { Decor } from '@/features/decor'
import type { WidgetLayout } from '../hooks/useWidgetLayout'
import { useI18n } from '@/shared/i18n'
import { colWidth, grow, guides, nudge, place, reach, rowHeight, sizeFor, span, type Page, type Side } from '../lib/widgetLayout'
import { type StackSize } from '@dvi/core/widget'
import { BOARD, COLS, EDGE, FIT, FLIP_HOLD, GAP, ROW_H, ROWS, SLIDE } from '../lib/constants'
import { useGuides } from '../hooks/useGuides'
import { useResumeDrag } from '../hooks/useResumeDrag'
import { readTranslate } from '../lib/readTranslate'
import { BoardEmpty } from './BoardEmpty'
import { useLongPress } from '../hooks/useLongPress'
import { usePageNav } from '../hooks/usePageNav'
import { PageDots } from './PageDots'
import { GALLERY, galleryDrag, type WidgetContext, type WidgetDef } from '../lib/widgetDef'
import { WidgetCell } from './WidgetCell'
import { StackBoard } from './StackBoard'

interface WidgetGridProps {
  layout: WidgetLayout
  /** 이 사람에게 보이는 위젯 */
  defs: WidgetDef[]
  ctx: Omit<WidgetContext, 'size'>
  editing: boolean
  onEdit: () => void
  /** 좁은 화면 편집에서 위젯을 골랐는지(StackBoard) */
  onPick: (picking: boolean) => void
  /** 좁은 화면에서 위젯을 끌어 옮기고 놓으면 편집을 끝낸다(StackBoard) */
  onDone: () => void
  /** 편집 중 인사 카드 위의 그림 바꾸기(registry 의 decor) */
  decor: Decor
}

// react-grid-layout 은 이것들을 같은 객체인지로 비교한다 — 렌더마다 새로 만들면 위젯이 모두 다시 그려진다
const MARGIN = [GAP, GAP] as const
const PADDING = [0, 0] as const
// 왼쪽 위 모서리는 빼기(−) 단추 자리라 뺀다
const HANDLES = ['n', 'e', 's', 'w', 'ne', 'se', 'sw'] as const
/** 갤러리에서 끌어 오는 동안 판에 놓이는 자리표시 */
const DROP = '__drop__'

/** 갤러리 자리표시를 뺀 위젯들 */
const clean = (l: Layout): Page => l.filter((c) => c.i !== DROP)

const point = (e: Event) => ('touches' in e ? ((e as TouchEvent).changedTouches[0] ?? { clientX: 0, clientY: 0 }) : (e as MouseEvent))

/**
 * 홈 위젯 판. 페이지마다 COLS × ROWS 칸에 위젯을 놓인 그대로 둔다(lib/widgetLayout.ts 의 기준 — 손댄 위젯과 그 자리 위젯만 움직인다). 끌기 · 크기 조절 손놀림은 react-grid-layout 이 한다.
 * 넓고 높은 화면은 행 높이를 화면 높이로 나눠 한 페이지가 스크롤 없이 한 장, 그보다 낮으면 행 높이 ROW_H 로 스크롤된다.
 * 페이지들은 옆으로 이어 붙이고 보고 있는 페이지만큼 옮겨 보여준다. 끄는 위젯을 화면 왼쪽 · 오른쪽 끝에 놓으면 옆 페이지(오른쪽 끝 페이지면 새 페이지)의 빈칸으로.
 * 놓을 수 없는 자리(비킬 곳이 없는 꽉 찬 판 등)에 놓으면 마지막으로 놓을 수 있던 자리로, 그런 자리가 없었으면 원래 자리로 돌아간다.
 * 키보드는 위젯에 초점을 두고 화살표로 옮기고(이웃과 바꾸기 포함) Shift + 화살표로 크기, PageUp · PageDown 으로 페이지, Delete 로 뺀다(갤러리가 있을 때만).
 * 편집 중 Ctrl(⌘) + Z 로 되돌리고 Ctrl + Shift + Z · Ctrl + Y 로 다시 한다. 페이지는 빈 곳을 옆으로 밀거나(스와이프) 위젯에 초점이 없을 때 ← · → 로도 넘긴다.
 * 크기를 바꾸는 동안 잡은 변이 다른 위젯의 같은 쪽 변과 나란하면 기준선을 긋는다(피그마처럼).
 * 좁은 화면은 넓은 화면 칸 배치 없이 4칸 격자 판에 좁은 화면 순서 · 크기대로 쌓고, 편집도 그 자리에서 한다(StackBoard — 길게 눌러 옮기기, 모서리 손잡이로 크기).
 */
export function WidgetGrid({ layout, defs, ctx, editing, onEdit, onPick, onDone, decor }: WidgetGridProps) {
  const { t, f } = useI18n()
  const viewRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const edgeRef = useRef(0)
  const [edge, setEdge] = useState(0)
  /** 끝에 대고 기다리는 중인 페이지 넘기기 · 마지막 손 위치 · 넘긴 뒤 새 페이지에서 이어 끌 위젯 */
  const flip = useRef(0)
  const hand = useRef({ x: 0, y: 0, touch: false })
  const resume = useRef<string | null>(null)
  const { guideRef, drawGuides } = useGuides()
  /** 끌거나 크기를 바꾸는 위젯, 그때의 배치(base) · 마지막으로 놓을 수 있던 배치(last) · 크기 조절이면 잡은 변(sides) */
  const active = useRef<{ i: string; drag: boolean; base: LayoutItem[]; last: LayoutItem[]; sides: Side[] } | null>(null)
  // 우리 규칙(lib/widgetLayout.ts 의 place)을 react-grid-layout 의 compactor 로 — 끄는 동안 미리보기가 놓은 결과와 같다.
  // allowOverlap 이면 react-grid-layout 은 손 아래 칸에 위젯을 옮기기만 하고 겹친 위젯을 밀지 않는다. 비키는 것은 place 가 끌기 시작한 배치에서 매번 다시 정한다.
  // 놓을 수 없는 자리면 마지막으로 놓을 수 있던 배치를 돌려준다(놓일 자리가 거기 머문다). 끌지 않을 때는 손대지 않는다.
  // 한 번만 만든다(같은 객체여야 다시 계산하지 않는다)
  const [compactor] = useState<Compactor>(() => ({
    type: 'vertical',
    allowOverlap: true,
    compact: (l) => {
      const a = active.current
      const me = a && l.find((c) => c.i === a.i)
      if (!a || !me) return l
      a.last = place(a.base, { ...me }, a.drag) ?? a.last
      // 기준선은 크기를 맞출 때만, 잡은 변만 — 옮길 때는 자리표시로 충분하다
      if (!a.drag) drawGuides(guides(a.last, a.i, a.sides))
      // react-grid-layout 이 돌려받은 배치를 고쳐 쓴다(moveElement) — 늘 새 객체로
      return a.last.map((c) => ({ ...c }))
    },
  }))
  // 받지 않은 끌기 · 크기 조절을 되돌린다 — react-grid-layout 은 바뀐 배치를 안에 들고 있어 다시 만들어야 한다.
  // 그 페이지 판 하나만(key) — 다 다시 만들면 모든 위젯이 새로 마운트돼 페이지가 넘어가는 동안 버벅인다
  const [revs, setRevs] = useState<Record<number, number>>({})
  const rebuild = (p: number) => setRevs((r) => ({ ...r, [p]: (r[p] ?? 0) + 1 }))
  const [area, setArea] = useState({ width: 0, height: 0, lg: false, fit: false })

  const byType = new Map(defs.map((d) => [d.type, d]))
  const { pages, page } = layout
  const pageCount = Math.max(1, pages.length)
  const total = pages.reduce((n, p) => n + p.length, 0)
  const rowH = area.fit ? rowHeight(area.height) : ROW_H
  const colW = colWidth(area.width)
  // 넓은 화면은 보고 있는 페이지와 그 양옆만 위젯을 그린다 — 메모리 · 데이터 구독이 위젯 전체가 아니라 보이는 만큼만.
  // 페이지가 미끄러지는 동안은 그려 둔 것을 그대로 두고(떠나는 페이지가 비지 않게), 다 넘어간 뒤에 새 양옆을 그린다(미끄러지는 중에 위젯을 새로 그리면 버벅인다)
  const [near, setNear] = useState({ page, pages: [page] })
  if (near.page !== page) setNear({ page, pages: [...near.pages, page] })
  useEffect(() => {
    const id = window.setTimeout(() => setNear({ page, pages: [page - 1, page, page + 1] }), SLIDE)
    return () => clearTimeout(id)
  }, [page])

  useLayoutEffect(() => {
    const view = viewRef.current!
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

  const focus = (type?: string) => type && requestAnimationFrame(() => viewRef.current?.querySelector<HTMLElement>(`[data-type="${type}"]`)?.focus())

  /** 끌기 · 크기 조절을 시작할 때 손 위치 · 위젯 자리와 크기(px) */
  /** ox · oy — 잡은 점이 위젯 왼쪽 위에서 떨어진 거리(px). 옆 페이지에서 이어 끌 때 같은 점을 다시 잡는다 */
  const grab = useRef({ x: 0, y: 0, left: 0, top: 0, width: 0, height: 0, ox: 0, oy: 0 })
  // 누른 자리 — react-grid-layout 은 손이 몇 px 움직인 뒤에야 끌기 시작을 알려(그때 이벤트는 첫 움직임) 잡은 점이 그만큼 어긋난다
  const downAt = useRef({ x: 0, y: 0 })
  const start = (drag: boolean) => (l: Layout, item: LayoutItem | null, _n?: unknown, _p?: unknown, e?: Event, node?: HTMLElement | null) => {
    const base = l.map((c) => ({ ...c }))
    // 크기 조절의 node 는 손잡이다 — 이름(react-resizable-handle-se 등)의 n · e · s · w 가 잡은 변
    const axis = drag ? '' : (/handle-(\w+)/.exec(node?.className ?? '')?.[1] ?? '')
    const sides = [...axis].map((k) => ({ n: 't', e: 'r', s: 'b', w: 'l' })[k] as Side)
    active.current = item ? { i: item.i, drag, base, last: base, sides } : null
    const el = drag ? node : node?.closest<HTMLElement>('.react-grid-item')
    if (!e || !el) return
    const [left, top] = readTranslate(el)
    const { clientX: x, clientY: y } = drag ? { clientX: downAt.current.x, clientY: downAt.current.y } : point(e)
    const box = el.getBoundingClientRect()
    grab.current = { x, y, left, top, width: el.offsetWidth, height: el.offsetHeight, ox: x - box.left, oy: y - box.top }
  }
  const onDrag = (_l: Layout, _o: unknown, _n: unknown, _p: unknown, e: Event, node: HTMLElement | null) => {
    dragging.current = true
    // 끄는 위젯을 손에 붙인다 — react-grid-layout 은 위젯의 칸 자리가 바뀔 때만 다시 그리는데, 놓을 수 없는 자리에서는 칸 자리가
    // 마지막으로 놓을 수 있던 자리에 머문다(그대로 두면 위젯이 멈춰 있다 한꺼번에 따라온다)
    const p = point(e)
    hand.current = { x: p.clientX, y: p.clientY, touch: 'touches' in e }
    const g = grab.current
    if (node) node.style.transform = `translate(${g.left + p.clientX - g.x}px, ${g.top + p.clientY - g.y}px)`
    const v = viewRef.current!.getBoundingClientRect()
    const x = p.clientX
    const dir = x > v.right - EDGE ? 1 : x < v.left + EDGE && page > 0 ? -1 : 0
    // 끝에 FLIP_HOLD 동안 대고 있으면 놓지 않아도 옆 페이지로 넘긴다(반자동) — 혼자 있는 위젯을 마지막 페이지 뒤로 보내는 것은 같은 판이라 빼고
    const i = active.current?.i
    if (dir !== edgeRef.current) {
      clearTimeout(flip.current)
      const alone = page + dir >= pageCount && layout.items.length === 1
      if (dir && i && !alone) flip.current = window.setTimeout(() => carry(i, dir), FLIP_HOLD)
    }
    edgeRef.current = dir
    setEdge(dir)
  }
  /** 끄는 위젯의 왼쪽 위 모서리가 지금 놓일 칸 — 옆 페이지 판도 같은 자리 · 크기라 그대로 쓴다 */
  const cellAt = (x: number, y: number) => {
    const g = grab.current
    return { x: Math.round((g.left + x - g.x) / (colW + GAP)), y: Math.round((g.top + y - g.y) / (rowH + GAP)) }
  }
  /**
   * 끄는 중에 옆 페이지로 — 마우스는 손을 뗀 것처럼 옛 판의 끌기를 끝내(react-grid-layout 이 스스로 정리) 끝에 놓을 때처럼 옆 페이지
   * 손 아래 칸에 옮기고, 새 판이 들어오면 거기서 다시 눌러 이어 끈다. 터치는 떼기를 만들 수 없어 옮긴 뒤 옛 판만 다시 만든다(거기 놓인다)
   */
  const carry = (i: string, dir: number) => {
    const { x, y, touch } = hand.current
    if (!touch) {
      resume.current = i
      return void document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y, button: 0 }))
    }
    const ok = layout.toPage(i, page + dir, cellAt(x, y))
    edgeRef.current = 0
    setEdge(0)
    if (!ok) return
    dragging.current = false
    active.current = null
    rebuild(page)
  }
  useResumeDrag({ resume, hand, grab, downAt, viewRef })
  /**
   * 손에 붙였던 위젯을 놓인 칸 자리 · 크기로 — react-grid-layout 은 칸 자리 · 크기가 그대로면 다시 그리지 않아,
   * 놓을 수 없던 자리에서 놓으면 손에 붙인 transform · 크기가 남아 이웃을 덮는다(편집을 마쳐야 돌아왔다)
   */
  const settle = (el: Element | null | undefined, l: Layout, i: string) => {
    const c = l.find((x) => x.i === i)
    const at = { margin: MARGIN, containerPadding: PADDING, containerWidth: area.width, cols: COLS, rowHeight: rowH, maxRows: ROWS }
    if (el instanceof HTMLElement && c) Object.assign(el.style, setTransform(calcGridItemPosition(at, c.x, c.y, c.w, c.h)))
  }
  const onDragStop = (l: Layout, _o: unknown, item: { i: string } | null, _p: unknown, e: Event, node: HTMLElement | null) => {
    dragging.current = false
    drawGuides([])
    const dir = edgeRef.current
    clearTimeout(flip.current)
    edgeRef.current = 0
    setEdge(0)
    active.current = null
    if (!item) return
    // 옆 페이지의 손 아래 칸으로(안 되면 첫 빈칸) — 들어갈 자리가 없으면 되돌린다
    if (dir) {
      if (layout.toPage(item.i, page + dir, cellAt(point(e).clientX, point(e).clientY))) return
      resume.current = null
      rebuild(page); return;
    }
    if (!layout.commitPage(clean(l), item.i)) { rebuild(page); return; }
    settle(node, l, item.i)
  }
  // 크기도 손에 붙인다 — 끌기와 같은 까닭(react-grid-layout 은 칸 수가 바뀔 때만 다시 그리고, 이웃이 비킬 곳이 없으면 칸 수가 머문다).
  // 다만 이웃은 덮지 않는다 — 받아들여질 배치에서 이웃 · 판 끝에 닿으면 거기서 살짝만 버티고 멈춘다. 놓으면 자리표시 크기로 내려앉는다
  const onResize = (_l: Layout, _o: unknown, item: LayoutItem | null, ph: LayoutItem | null, e: Event, node: HTMLElement | null) => {
    const el = node?.closest<HTMLElement>('.react-grid-item')
    const a = active.current
    if (!el || !item || !a) return
    const next = place(a.base, { ...item }, false) ?? a.last
    // 자리표시는 react-grid-layout 이 손이 바란 자리 · 크기로 그린다 — 받아들여질 것(place, 안 되면 마지막으로 되던 것)으로 바꿔 둔다
    const ok = next.find((c) => c.i === item.i)
    if (ph && ok) Object.assign(ph, { x: ok.x, y: ok.y, w: ok.w, h: ok.h })
    const p = point(e)
    const g = grab.current
    const dx = p.clientX - g.x
    const dy = p.clientY - g.y
    const min = layout.minCells(item.i)
    const room = reach(next, item.i)
    const cw = colW + GAP
    const rh = rowH + GAP
    // 닿은 끝 너머로는 고무줄처럼 조금만(틈의 절반까지)
    const rubber = (over: number) => Math.min(GAP / 2, over / 4)
    const upTo = (want: number, edge: number) => (want <= edge ? want : edge + rubber(want - edge))
    const downTo = (want: number, edge: number) => (want >= edge ? want : edge - rubber(edge - want))
    let [l, t, r, b] = [g.left, g.top, g.left + g.width, g.top + g.height]
    // 손잡이 쪽 — n · e · s · w 와 모서리
    const axis = /handle-(\w+)/.exec(node!.className)?.[1] ?? ''
    if (axis.includes('e')) r = Math.max(l + span(min.w, colW), upTo(r + dx, room.x1 * cw - GAP))
    if (axis.includes('w')) l = Math.min(r - span(min.w, colW), downTo(l + dx, room.x0 * cw))
    if (axis.includes('s')) b = Math.max(t + span(min.h, rowH), upTo(b + dy, room.y1 * rh - GAP))
    if (axis.includes('n')) t = Math.min(b - span(min.h, rowH), downTo(t + dy, room.y0 * rh))
    const style = { transform: `translate(${l}px, ${t}px)`, width: `${r - l}px`, height: `${b - t}px` }
    // react-grid-layout 이 이 뒤에 다시 그리면(칸 수가 바뀔 때) 손이 바란 크기로 덮으므로 그린 뒤에 한 번 더 — 그새 놓았으면 그만
    const apply = () => active.current === a && Object.assign(el.style, style)
    apply()
    requestAnimationFrame(apply)
  }
  const onResizeStop = (l: Layout, _o: unknown, item: { i: string } | null, _p: unknown, _e: Event, node: HTMLElement | null) => {
    active.current = null
    drawGuides([])
    if (!item || !layout.commitPage(clean(l), item.i)) { rebuild(page); return; }
    settle(node?.closest('.react-grid-item'), l, item.i)
  }
  // 갤러리에서 끌어 온 위젯 — 놓은 자리에(덮인 위젯은 비킨다), 놓을 수 없으면 첫 빈칸 · 새 페이지로
  const onDrop = (l: Layout, item: { x: number; y: number; w: number; h: number } | undefined) => {
    const type = galleryDrag.type
    if (!item || !type) return
    const next = place(clean(l), { i: type, x: item.x, y: item.y, w: item.w, h: item.h })
    if (!(next && layout.commitPage(next, type))) layout.add(type)
  }

  const longPress = useLongPress(editing, onEdit)
  const nav = usePageNav({ layout, pageCount, area, editing, dragging, viewRef, trackRef })

  const onKeyDown = (e: KeyboardEvent<HTMLElement>, type: string, next?: string) => {
    if (e.target !== e.currentTarget) return
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    const jump = { PageUp: -1, PageDown: 1 }[e.key]
    if (d) {
      e.preventDefault()
      const items = layout.items
      // 크기를 키우면 이웃이 줄어들 수 있다 — 이웃의 최소 크기를 붙여 넘긴다
      const sized = items.map((c) => ({ ...c, minW: layout.minCells(c.i).w, minH: layout.minCells(c.i).h }))
      const moved = e.shiftKey ? grow(sized, type, d[0], d[1], layout.minCells(type)) : nudge(items, type, d[0], d[1])
      if (moved) layout.commitPage(moved, type)
      focus(type)
    } else if (jump) {
      e.preventDefault()
      if (page + jump >= 0) layout.toPage(type, page + jump)
      focus(type)
    } else if (GALLERY && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault()
      layout.remove(type)
      focus(next)
    }
  }



  /** 위젯 하나 — 그릴 크기는 칸이 그려진 px 로 정한다. 좁은 화면은 고른 크기(stack)와 편집 중 얹을 손잡이(overlay)도 받는다(StackBoard) */
  const widget = (c: Page[number], index: number, list: Page, stack?: StackSize, overlay?: ReactNode) => {
    const def = byType.get(c.i)
    if (!def) return null
    const size = sizeFor(def.sizes, area.lg ? span(c.w, colW) : area.width, span(c.h, rowH))
    return (
      <WidgetCell
        key={c.i}
        {...{ c, index, list, stack, overlay, def, size, editing, ctx, decor, longPress }}
        onKeyDown={editing && !stack ? (e) => onKeyDown(e, c.i, (list[index + 1] ?? list[index - 1])?.i) : undefined}
        onRemove={() => layout.remove(c.i)}
      />
    )
  }

  /** 넓은 화면의 한 페이지 — 칸 판 */
  const board = (items: Page, p: number) => {
    const order = [...items].sort((a, b) => a.y - b.y || a.x - b.x)
    const label = pageCount > 1 ? f(t.widgets.page, { page: p + 1, total: pageCount }) : editing ? t.widgets.editHint : undefined
    if (!near.pages.includes(p)) return <div key={p} className="widget-page invisible" />
    const minOf = (i: string) => layout.minCells(i)
    return (
      <div
        key={p}
        role="list"
        aria-label={label}
        // 넓은 화면에서 다른 페이지는 초점 · 화면낭독에서 뺀다. 숨기는 것은 페이지가 미끄러져 나간 뒤 — 들어오는 쪽은 바로 보인다
        className={`widget-page relative ${p !== page ? 'invisible transition-[visibility]' : ''}`}
        style={p !== page ? { transitionDelay: `${SLIDE}ms` } : undefined}
      >
      <GridLayout
        key={revs[p] ?? 0}
        className="widget-board"
        style={{ height: span(ROWS, rowH) }}
        autoSize={false}
        width={area.width}
        layout={items.map((c) => ({ ...c, minW: minOf(c.i).w, minH: minOf(c.i).h }))}
        gridConfig={{ cols: COLS, rowHeight: rowH, margin: MARGIN, containerPadding: PADDING, maxRows: ROWS }}
        dragConfig={{ enabled: editing, cancel: 'button, .no-drag' }}
        resizeConfig={{ enabled: editing, handles: HANDLES }}
        dropConfig={{
          enabled: GALLERY && editing && p === page,
          defaultItem: { w: 8, h: 4 },
          onDragOver: () => (galleryDrag.type ? minOf(galleryDrag.type) : false),
        }}
        droppingItem={{ i: DROP, x: 0, y: 0, w: 8, h: 4 }}
        compactor={compactor}
        onDragStart={start(true)}
        onDrag={onDrag}
        onDragStop={onDragStop}
        onResizeStart={start(false)}
        onResize={onResize}
        onResizeStop={onResizeStop}
        onDrop={onDrop}
      >
        {order.map((c, i) => widget(c, i, order))}
      </GridLayout>
      {/* 기준선 — 칸 한 개 + 틈(px)을 변수로 주고 선마다 칸 좌표(--at · --from · --to)를 붙인다 */}
      {p === page && (
        <div ref={guideRef} aria-hidden="true" className="widget-guides" style={{ '--cw': `${colW + GAP}px`, '--rh': `${rowH + GAP}px` } as CSSProperties} />
      )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 lg:h-full">
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
              Array.from({ length: pageCount }, (_, p) => board(pages[p] ?? [], p))
            ) : (
              // 좁은 화면 — 모든 페이지를 4칸 격자 판에, 좁은 화면 순서 · 크기대로. 편집도 그 자리에서
              <StackBoard layout={layout} defs={defs} editing={editing} onEdit={onEdit} onPick={onPick} onDone={onDone} renderWidget={widget} />
            ))
          )}
        </div>
      </div>

      {pageCount > 1 && <PageDots page={page} pageCount={pageCount} onPage={layout.setPage} />}
    </div>
  )
}
