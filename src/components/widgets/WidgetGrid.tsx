import { Minus } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react'
import type { WidgetLayout } from '../../hooks/useWidgetLayout'
import { useI18n } from '../../i18n'
import { motionOff } from '../../lib/theme'
import { COLS, ROWS, grow, movePages, packed, sizeFor, spans, split, step, unitOf, type Row, type Target } from '../../lib/widgetLayout'
import { galleryDrag, text, type WidgetContext, type WidgetDef } from './registry'

interface WidgetGridProps {
  layout: WidgetLayout
  /** 이 사람에게 보이는 위젯 */
  defs: WidgetDef[]
  ctx: Omit<WidgetContext, 'size'>
  editing: boolean
  onEdit: () => void
}

/** 끄는 동안(옮기기 · 갤러리에서 추가 · 경계 조절)의 배치. ok 가 false 면 지금 자리는 안 들어가고 배치는 마지막으로 들어가던 것 */
interface Preview {
  pages: Row[][]
  ok: boolean
  /** 옮기거나 갤러리에서 끌어 오는 위젯 — 있으면 오른쪽 끝에 새 페이지를 하나 더 둔다 */
  moving?: string
  /** 갤러리에서 끌어 오는 중 */
  adding?: boolean
}

/** 경계 — 위젯 사이(col) · 줄 사이(row) · 다 채우지 않는 줄의 오른쪽 끝(end-col) · 다 채우지 않는 페이지의 마지막 줄 아래(end-row) */
type Edge = 'col' | 'row' | 'end-col' | 'end-row'
const across = (k: Edge) => k === 'col' || k === 'end-col'

/** 끌기 시작할 때 잰 위젯 자리(페이지 · 줄 · 위젯) — 놓을 곳은 늘 이것으로 정한다(미리보기가 움직여도 손 아래 판정이 흔들리지 않게) */
type Geo = { type: string; x: number; y: number; w: number; h: number }[][][]

interface Drag {
  type: string
  base: Row[][]
  geo: Geo
  /** 끌기 시작한 페이지 · 지금 보고 있는 페이지 */
  from: number
  page: number
  x0: number
  y0: number
  /** 위젯 왼쪽 위에서 누른 점까지 */
  dx: number
  dy: number
  x: number
  y: number
  active: boolean
  key: string
  valid: Row[][] | null
  timer?: number
  off: () => void
}

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'
const TOUCH_HOLD = 250
const EDIT_HOLD = 550
/** 넓은 화면 — 줄 배치 · 끌기 · 페이지는 여기서만. 좁은 화면은 한 줄로 쌓는다 */
const BOARD = '(min-width: 64rem)'
/** 화면 높이에 맞추는 크기 — styles.css 의 board-fit 과 같다 */
const FIT = '(min-width: 1880px) and (min-height: 900px)'
/** 화면에 맞추지 않을 때(줄 높이가 내용만큼) 줄 높이 비율 1 을 몇 px 로 보고 그릴 크기를 정할지 */
const NOMINAL_H = 300
/** 경계를 키보드로 한 번에 옮기는 만큼(px) */
const KEY_STEP = 32
/** 화면 가장자리 이만큼 안에 머물면 옆 페이지로(오른쪽 끝이면 새 페이지) */
const EDGE = 64
const EDGE_HOLD = 600

/** 판 좌표의 한 점이 가리키는 놓을 곳 — 줄 위 · 아래 1/5 은 새 줄, 가운데는 그 줄에서 왼쪽에 있는 (다른) 위젯 수 번째 */
function targetAt(geo: Geo[number], type: string, x: number, y: number, gap: number): Target {
  const bands = geo.map((r) => ({ top: Math.min(...r.map((c) => c.y)), bottom: Math.max(...r.map((c) => c.y + c.h)) }))
  const row = bands.findIndex((b) => y < b.bottom + gap / 2)
  if (row < 0) return { newRow: geo.length }
  const { top, bottom } = bands[row]
  const rel = (y - top) / (bottom - top)
  if (rel < 0.2) return { newRow: row }
  if (rel > 0.8) return { newRow: row + 1 }
  return { row, index: geo[row].filter((c) => c.type !== type && c.x + c.w / 2 < x).length }
}

/**
 * 홈 위젯 판. 페이지마다 줄로 나눠 쓰고(lib/widgetLayout.ts), 넓고 높은 화면은 줄들이 화면 높이를 나눠 갖는다(스크롤 없음).
 * 페이지들은 옆으로 이어 붙이고 보고 있는 페이지만큼 옮겨 보여준다.
 * 편집 중: 위젯을 끌어 줄 위 · 아래(새 줄)나 줄 안에 넣으면 그 줄 위젯들이 좁아지며 자리가 생긴다 — 최소 크기 아래로는 안 들어간다.
 * 끄는 채로 가장자리에 머물면 옆 페이지로, 오른쪽 끝 페이지에서 더 가면 새 페이지가 생긴다. 갤러리 위젯도 같은 방식으로 끌어 놓는다.
 * 위젯 사이 · 줄 사이 경계를 끌면 비율이 바뀐다. Esc 는 끌기를 취소한다.
 * 키보드는 위젯에 초점을 두고 화살표로 옮기고 PageUp · PageDown 으로 페이지를 옮기고 Delete 로 뺀다. 경계는 초점을 두고 화살표로.
 * 한 페이지의 위젯은 한 부모 아래 형제라(flex-wrap) 줄을 옮겨도 다시 만들어지지 않는다 — 끄는 위젯을 놓치지 않고 미끄러짐(FLIP)도 이어진다.
 */
export function WidgetGrid({ layout, defs, ctx, editing, onEdit }: WidgetGridProps) {
  const { t, f } = useI18n()
  const viewRef = useRef<HTMLDivElement>(null)
  const boards = useRef<(HTMLDivElement | null)[]>([])
  const els = useRef(new Map<string, HTMLElement>())
  const pos = useRef(new Map<string, { x: number; y: number; parent: Element | null }>())
  const drag = useRef<Drag | null>(null)
  const adding = useRef<{ geo: Geo; key: string; page: number } | null>(null)
  const edge = useRef<{ dir: number; timer?: number }>({ dir: 0 })
  const press = useRef<{ timer: number; x: number; y: number } | null>(null)
  const pressed = useRef(false)
  const focusAfter = useRef<string | null>(null)
  const wheel = useRef({ sum: 0, at: 0 })
  const [preview, setPreview] = useState<Preview | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [area, setArea] = useState({ width: 0, height: 0, gap: 0, lg: false, fit: false })

  const byType = new Map(defs.map((d) => [d.type, d]))
  const pages = preview?.pages ?? layout.pages
  // 옮기는 중에는 오른쪽 끝에 빈 새 페이지를 하나 둔다 — 마지막 페이지가 옮기는 위젯뿐이면 더 만들지 않는다
  const extra = !!preview?.moving && !!pages.at(-1)?.some((r) => r.items.some((c) => c.type !== preview.moving))
  const pageCount = Math.max(1, pages.length + (extra ? 1 : 0))
  const page = Math.max(0, Math.min(layout.page, pageCount - 1))
  const total = layout.pages.reduce((n, p) => n + p.reduce((m, r) => m + r.items.length, 0), 0)

  // 창에 건 끌기 처리기가 지난 렌더 값을 보지 않게
  const live = useRef({ layout, page, pageCount })
  useLayoutEffect(() => {
    live.current = { layout, page, pageCount }
  })

  const geometry = (): Geo =>
    live.current.layout.pages.map((rows) =>
      rows.map((r) =>
        r.items.map(({ type }) => {
          const el = els.current.get(type)!
          return { type, x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }
        }),
      ),
    )

  /** 끄는 위젯 내용을 손가락 아래에 — 칸은 놓일 자리에 남아 점선으로 보인다. 칸이 다른 페이지에 있어도 그 페이지 판 기준으로 옮긴다 */
  const follow = (d: Drag) => {
    const el = els.current.get(d.type)
    const inner = el?.firstElementChild as HTMLElement | null
    const parent = el?.offsetParent
    if (!el || !inner || !parent) return
    const b = parent.getBoundingClientRect()
    inner.style.transform = `translate(${d.x - d.dx - b.left - el.offsetLeft}px, ${d.y - d.dy - b.top - el.offsetTop}px)`
  }

  /**
   * 손이 가리키는 놓을 곳으로 미리보기를 바꾼다 — 안 들어가면 마지막으로 들어가던 배치를 둔다. 들어간 배치를 돌려준다.
   * 좌표는 움직이지 않는 바깥 틀(view) 기준 — 페이지가 미끄러지는 동안에도 보고 있는 페이지의 자리로 판정한다.
   */
  const hover = (type: string, base: Row[][], geo: Geo, p: number, clientX: number, clientY: number, last: { key: string }, extra: Partial<Preview> = {}) => {
    const view = viewRef.current!
    const v = view.getBoundingClientRect()
    const target = targetAt(geo[p] ?? [], type, clientX - v.left - view.clientLeft - parseFloat(getComputedStyle(view).paddingLeft), clientY - v.top, area.gap)
    const key = `${p}:${JSON.stringify(target)}`
    if (key === last.key) return undefined
    last.key = key
    const next = movePages(base, type, p, target)
    const ok = live.current.layout.fits(next[p])
    if (ok) next[p] = live.current.layout.settle(next[p])
    setPreview((prev) => ({ pages: ok ? next : (prev?.pages ?? base), ok, moving: type, ...extra }))
    return ok ? next : undefined
  }

  /** 가장자리에 머물면 옆 페이지로 — 머무는 동안 EDGE_HOLD 마다 한 장씩 */
  const atEdge = (x: number, flip: (to: number) => void) => {
    const v = viewRef.current!.getBoundingClientRect()
    const dir = x > v.right - EDGE ? 1 : x < v.left + EDGE ? -1 : 0
    const to = live.current.page + dir
    const e = edge.current
    if (!dir || to < 0 || to >= live.current.pageCount) return stopEdge()
    if (e.dir === dir) return
    clearTimeout(e.timer)
    edge.current = {
      dir,
      timer: window.setTimeout(() => {
        edge.current = { dir: 0 }
        flip(to)
      }, EDGE_HOLD),
    }
  }
  const stopEdge = () => {
    clearTimeout(edge.current.timer)
    edge.current = { dir: 0 }
  }

  const measure = () => {
    pos.current = new Map([...els.current].map(([type, el]) => [type, { x: el.offsetLeft, y: el.offsetTop, parent: el.offsetParent }]))
  }

  // 배치가 바뀌면 다른 위젯을 원래 자리에서 새 자리로 미끄러뜨린다(같은 페이지 안에서만). 끄는 위젯은 손가락을 따라간다
  const shape = pages.map((rows) => rows.map((r) => `${r.h}:${r.items.map((c) => `${c.type}${c.w}`)}`).join('|')).join('/')
  useLayoutEffect(() => {
    const d = drag.current
    for (const [type, el] of els.current) {
      const prev = pos.current.get(type)
      if (!prev || prev.parent !== el.offsetParent || type === d?.type || motionOff()) continue
      const dx = prev.x - el.offsetLeft
      const dy = prev.y - el.offsetTop
      if (dx || dy) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 300, easing: EASE })
    }
    measure()
    if (d?.active) follow(d)
    if (focusAfter.current) {
      els.current.get(focusAfter.current)?.focus()
      focusAfter.current = null
    }
  }, [shape, page])

  useEffect(() => {
    const view = viewRef.current!
    // 판 크기 — 그릴 크기를 정하고, 넓은 화면이면 배치가 들어가는지 볼 때 쓴다(useWidgetLayout). 페이지는 모두 같은 크기다
    const sync = () => {
      const gap = parseFloat(getComputedStyle(boards.current[0] ?? view).columnGap) || 0
      // 폭은 페이지 판으로 — 바깥 틀은 − 단추가 잘리지 않게 좌우로 조금 넓다
      const a = { width: boards.current[0]?.clientWidth ?? view.clientWidth, height: view.clientHeight, gap, lg: matchMedia(BOARD).matches, fit: matchMedia(FIT).matches }
      setArea(a)
      live.current.layout.setBox(a.lg ? { width: a.width, height: a.fit ? a.height : Infinity, gap } : { width: Infinity, height: Infinity, gap: 0 })
      measure()
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(view)
    // 끄는 중에는 화면이 스크롤되지 않게 — passive 가 아니어야 막을 수 있다
    const onTouchMove = (e: TouchEvent) => drag.current?.active && e.preventDefault()
    view.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      ro.disconnect()
      view.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  useEffect(() => {
    if (!editing) endDrag(false)
  }, [editing])

  const activate = (d: Drag) => {
    d.active = true
    setDragging(d.type)
    navigator.vibrate?.(8)
    follow(d)
    d.valid = hover(d.type, d.base, d.geo, d.page, d.x, d.y, d) ?? d.valid
  }

  /** commit: 놓기(들어가던 마지막 자리로) · 아니면 취소(끌기 시작한 페이지로 돌아간다) */
  const endDrag = (commit = true) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    clearTimeout(d.timer)
    stopEdge()
    d.off()
    if (!d.active) return
    const inner = els.current.get(d.type)?.firstElementChild as HTMLElement | null
    const from = inner?.style.transform ?? ''
    if (inner) inner.style.transform = ''
    setDragging(null)
    setPreview(null)
    if (commit && d.valid) live.current.layout.commit(d.valid, d.type)
    else live.current.layout.setPage(d.from)
    if (inner && !motionOff()) inner.animate([{ transform: from }, { transform: 'none' }], { duration: 260, easing: EASE })
  }

  const onDragMove = (e: globalThis.PointerEvent) => {
    const d = drag.current
    if (!d) return
    d.x = e.clientX
    d.y = e.clientY
    if (!d.active) {
      if (Math.hypot(d.x - d.x0, d.y - d.y0) < 6) return
      if (e.pointerType === 'touch') return endDrag(false)
      activate(d)
    }
    follow(d)
    d.valid = hover(d.type, d.base, d.geo, d.page, d.x, d.y, d) ?? d.valid
    atEdge(d.x, (to) => {
      if (drag.current !== d) return
      d.page = to
      d.key = ''
      live.current.layout.setPage(to)
      requestAnimationFrame(() => drag.current === d && ((d.valid = hover(d.type, d.base, d.geo, d.page, d.x, d.y, d) ?? d.valid), follow(d)))
    })
  }

  const onEsc = (e: globalThis.KeyboardEvent) => {
    if (e.key !== 'Escape' || !drag.current) return
    e.stopImmediatePropagation()
    endDrag(false)
  }

  const onPointerDown = (e: PointerEvent<HTMLElement>, type: string) => {
    if (e.button !== 0) return
    if (!editing) {
      // 터치로 길게 누르면 편집 시작. 마우스는 상단 바의 '위젯 편집' 단추로
      if (e.pointerType !== 'touch') return
      press.current = {
        x: e.clientX,
        y: e.clientY,
        timer: window.setTimeout(() => {
          press.current = null
          pressed.current = true
          navigator.vibrate?.(10)
          onEdit()
        }, EDIT_HOLD),
      }
      return
    }
    if ((e.target as Element).closest('button, [role="separator"]') || !matchMedia(BOARD).matches) return
    endDrag(false)
    const r = e.currentTarget.getBoundingClientRect()
    addEventListener('pointermove', onDragMove)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', cancel)
    addEventListener('keydown', onEsc, true)
    const off = () => {
      removeEventListener('pointermove', onDragMove)
      removeEventListener('pointerup', up)
      removeEventListener('pointercancel', cancel)
      removeEventListener('keydown', onEsc, true)
    }
    const d: Drag = {
      type,
      base: layout.pages,
      geo: geometry(),
      from: page,
      page,
      x0: e.clientX,
      y0: e.clientY,
      x: e.clientX,
      y: e.clientY,
      dx: e.clientX - r.left,
      dy: e.clientY - r.top,
      active: false,
      key: '',
      valid: null,
      off,
    }
    if (e.pointerType === 'touch') d.timer = window.setTimeout(() => activate(d), TOUCH_HOLD)
    drag.current = d
  }
  const up = () => endDrag(true)
  const cancel = () => endDrag(false)

  const onPressMove = (e: PointerEvent<HTMLElement>) => {
    const p = press.current
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) cancelPress()
  }
  const cancelPress = () => {
    clearTimeout(press.current?.timer)
    press.current = null
  }

  // 갤러리에서 끌어 오기 — 브라우저 끌어 놓기. 갤러리가 무엇을 끄는지 galleryDrag 에 적는다
  const onViewDragOver = (e: DragEvent) => {
    const type = galleryDrag.type
    if (!editing || !type) return
    e.preventDefault()
    const a = (adding.current ??= { geo: geometry(), key: '', page })
    hover(type, layout.pages, a.geo, a.page, e.clientX, e.clientY, a, { adding: true })
    atEdge(e.clientX, (to) => {
      if (adding.current !== a) return
      a.page = to
      a.key = ''
      live.current.layout.setPage(to)
    })
    e.dataTransfer.dropEffect = preview?.ok === false ? 'none' : 'copy'
  }
  const stopAdding = () => {
    adding.current = null
    stopEdge()
    setPreview(null)
  }
  const onViewDrop = (e: DragEvent) => {
    if (!adding.current) return
    e.preventDefault()
    if (preview?.adding && preview.ok) layout.commit(preview.pages, galleryDrag.type)
    stopAdding()
  }

  /** 그려진 위젯 크기(px) */
  const sizes = () => new Map([...els.current].map(([type, el]) => [type, { w: el.offsetWidth, h: el.offsetHeight }]))

  /**
   * 경계 옮기기(보고 있는 페이지). col 이면 줄 ri 의 위젯 ci 와 그 오른쪽 위젯 폭, row 면 줄 ri-1 과 ri 높이,
   * end-col 이면 줄 ri 의 마지막 위젯 ci 폭(남은 칸까지), end-row 면 마지막 줄 ri 높이(남은 줄까지)
   */
  const resizeTo = (kind: Edge, ri: number, ci: number, d: number, base = layout.rows, px = sizes()) => {
    const next = base.map((r) => ({ ...r, items: r.items.map((c) => ({ ...c })) }))
    const g = area.gap
    const colUnit = unitOf(area.width, g, COLS)
    const rowUnit = unitOf(area.height, g, ROWS)
    const minH = (r: Row) => Math.max(...r.items.map((c) => layout.mins(c.type).h))
    const ws = (r: Row) => r.items.map((c) => c.w)
    const hs = next.map((r) => r.h)
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
    if (kind === 'col') {
      const [a, b] = [next[ri].items[ci], next[ri].items[ci + 1]]
      const unit = packed(ws(next[ri]), COLS) ? 0 : colUnit
      ;[a.w, b.w] = split(a.w, b.w, px.get(a.type)!.w, px.get(b.type)!.w, d, layout.mins(a.type).w, layout.mins(b.type).w, unit, g)
    } else if (kind === 'row') {
      const [a, b] = [next[ri - 1], next[ri]]
      const unit = packed(hs, ROWS) ? 0 : rowUnit
      ;[a.h, b.h] = split(a.h, b.h, px.get(a.items[0].type)!.h, px.get(b.items[0].type)!.h, d, minH(a), minH(b), unit, g)
    } else if (kind === 'end-col') {
      const a = next[ri].items[ci]
      a.w = grow(px.get(a.type)!.w, d, layout.mins(a.type).w, (COLS - (sum(ws(next[ri])) - a.w)) * colUnit - g, colUnit, g)
    } else {
      const a = next[ri]
      a.h = grow(px.get(a.items[0].type)!.h, d, minH(a), (ROWS - (sum(hs) - a.h)) * rowUnit - g, rowUnit, g)
    }
    return layout.pages.map((p, i) => (i === page ? next : p))
  }
  const onHandleDown = (e: PointerEvent<HTMLElement>, kind: Edge, ri: number, ci: number) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const base = layout.rows
    // 끄는 동안 크기가 바뀌므로 시작 배치 · 시작할 때 그려진 크기로 계산한다 — 아니면 경계가 손보다 빨리 달아난다
    const px = sizes()
    const start = across(kind) ? e.clientX : e.clientY
    let last = layout.pages
    const move = (ev: globalThis.PointerEvent) => {
      last = resizeTo(kind, ri, ci, (across(kind) ? ev.clientX : ev.clientY) - start, base, px)
      setPreview({ pages: last, ok: true })
    }
    const stop = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', stop)
      el.removeEventListener('pointercancel', stop)
      setPreview(null)
      layout.commit(last)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', stop)
    el.addEventListener('pointercancel', stop)
  }
  const onHandleKey = (e: KeyboardEvent<HTMLElement>, kind: Edge, ri: number, ci: number) => {
    const dir = (across(kind) ? { ArrowLeft: -1, ArrowRight: 1 } : { ArrowUp: -1, ArrowDown: 1 })[e.key as 'ArrowLeft']
    if (!dir) return
    e.preventDefault()
    e.stopPropagation()
    layout.commit(resizeTo(kind, ri, ci, dir * KEY_STEP))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLElement>, type: string, next?: string) => {
    if (e.target !== e.currentTarget) return
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    const jump = { PageUp: -1, PageDown: 1 }[e.key]
    if (d) {
      e.preventDefault()
      const target = step(layout.rows, type, d[0], d[1])
      focusAfter.current = type
      if (target) layout.put(type, target)
    } else if (jump) {
      e.preventDefault()
      focusAfter.current = type
      if (page + jump >= 0) layout.toPage(type, page + jump)
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      focusAfter.current = next ?? null
      layout.remove(type)
    }
  }

  // 트랙패드 · 가로 휠로 페이지 넘기기 — 한 번 넘기면 잠깐 쉰다(관성 스크롤이 여러 장을 넘기지 않게)
  const onWheel = (e: WheelEvent) => {
    if (pageCount < 2 || drag.current || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
    const w = wheel.current
    if (performance.now() - w.at < 600) return
    w.sum += e.deltaX
    if (Math.abs(w.sum) < 60) return
    const next = page + Math.sign(w.sum)
    w.sum = 0
    w.at = performance.now()
    if (next >= 0 && next < pageCount) layout.setPage(next)
  }

  /** 한 페이지의 위젯들 */
  const renderPage = (rows: Row[]) => {
    const flat = rows.flatMap((r) => r.items)
    const hs = rows.map((r) => r.h)
    const sumH = hs.reduce((a, b) => a + b, 0)
    const fullH = packed(hs, ROWS)
    const heights = spans(hs, area.height, area.gap, ROWS)
    // 한 배열로 펼친다 — 줄마다 배열이면 React 가 줄을 옮긴 위젯을 새로 만든다
    return rows.flatMap((r, ri) => {
      const ws = r.items.map((c) => c.w)
      const sumW = ws.reduce((a, b) => a + b, 0)
      const fullW = packed(ws, COLS)
      const widths = spans(ws, area.width, area.gap, COLS)
      const rowMin = Math.max(...r.items.map((c) => layout.mins(c.type).h))
      const hPx = area.fit ? heights[ri] : NOMINAL_H * r.h
      return r.items.map((c, ci) => {
        const def = byType.get(c.type)
        if (!def) return null
        const i = flat.indexOf(c)
        const name = text(def.title, t)
        const wPx = area.lg ? widths[ci] : area.width
        const size = sizeFor(def.sizes, wPx, hPx)
        // lib/widgetLayout.ts 의 spans 를 CSS 로 — 칸 수를 넘는 줄 · 페이지는 비율대로 꽉, 아니면 w 칸 + 그 사이 틈.
        // 0.5px 덜 — 소수점 오차로 줄 끝 위젯이 다음 줄로 넘어가지 않게(꽉 채우는 줄은 남는 만큼을 flex-grow 가 채운다)
        const style = {
          '--basis': fullW
            ? `calc((100% - ${r.items.length - 1} * var(--gap)) * ${c.w / sumW} - 0.5px)`
            : `calc((100% - ${COLS - 1} * var(--gap)) / ${COLS} * ${c.w} + ${c.w - 1} * var(--gap) - 0.5px)`,
          '--grow': sumW >= COLS - 1e-6 ? 1 : 0,
          '--h': fullH
            ? `calc((100% - ${rows.length - 1} * var(--gap)) * ${r.h / sumH})`
            : `calc((100% - ${ROWS - 1} * var(--gap)) / ${ROWS} * ${r.h} + ${r.h - 1} * var(--gap))`,
          '--min-h': `${rowMin}px`,
          '--min-w': `${layout.mins(c.type).w}px`,
        } as CSSProperties
        const right = r.items[ci + 1]
        return (
          <div
            key={c.type}
            role="listitem"
            ref={(el) => {
              if (el) els.current.set(c.type, el)
              return () => void els.current.delete(c.type)
            }}
            data-size={size}
            data-type={c.type}
            data-dragging={dragging === c.type ? '' : undefined}
            data-adding={preview?.adding && preview.moving === c.type ? '' : undefined}
            data-invalid={preview && !preview.ok ? '' : undefined}
            style={style}
            className={`relative rounded-3xl ${editing ? 'cursor-grab touch-manipulation select-none [-webkit-touch-callout:none]' : ''}`}
            tabIndex={editing ? 0 : undefined}
            aria-label={editing ? f(t.widgets.position, { name, index: i + 1, total: flat.length }) : undefined}
            onPointerDown={(e) => onPointerDown(e, c.type)}
            onPointerMove={onPressMove}
            onPointerUp={cancelPress}
            onPointerCancel={cancelPress}
            onKeyDown={editing ? (e) => onKeyDown(e, c.type, (flat[i + 1] ?? flat[i - 1])?.type) : undefined}
            // 길게 눌러 편집을 시작했으면 손을 뗄 때의 누르기(링크 열기 등)는 버린다
            onClickCapture={(e) => {
              if (!pressed.current) return
              pressed.current = false
              e.preventDefault()
              e.stopPropagation()
            }}
            onContextMenu={(e) => (editing || press.current) && e.preventDefault()}
          >
            {/* 끌기는 안쪽에 — 바깥의 transform 은 미끄러짐이 쓴다 */}
            <div className="widget-body relative h-full">
              <div inert={editing} className="h-full">
                {def.render({ ...ctx, size })}
              </div>
              {editing && (
                <button
                  type="button"
                  onClick={() => layout.remove(c.type)}
                  aria-label={f(t.widgets.remove, { name })}
                  className="absolute -top-2 -left-2 z-10 grid size-7 animate-materialize cursor-pointer place-items-center rounded-full bg-fg/75 text-bg shadow-[0_2px_8px_oklch(0_0_0/0.25)] ring-2 ring-bg transition-[scale] hover:scale-110 active:scale-90"
                >
                  <Minus className="size-4" strokeWidth={3} aria-hidden="true" />
                </button>
              )}
            </div>
            {editing && right && (
              <Handle
                kind="col"
                label={f(t.widgets.resizeCol, { a: name, b: text(byType.get(right.type)?.title ?? '', t) })}
                value={Math.round((c.w / (c.w + right.w)) * 100)}
                onPointerDown={(e) => onHandleDown(e, 'col', ri, ci)}
                onKeyDown={(e) => onHandleKey(e, 'col', ri, ci)}
              />
            )}
            {/* 다 채우지 않는 줄의 오른쪽 끝 — 남은 칸까지 키운다 */}
            {editing && !right && sumW < COLS - 1e-6 && (
              <Handle
                kind="end-col"
                label={f(t.widgets.resizeEnd, { name })}
                value={Math.round((sumW / COLS) * 100)}
                onPointerDown={(e) => onHandleDown(e, 'end-col', ri, ci)}
                onKeyDown={(e) => onHandleKey(e, 'end-col', ri, ci)}
              />
            )}
            {/* 줄 경계는 화면 높이를 나눠 쓸 때만 — 아니면 줄 높이는 내용이 정한다. 키보드 초점은 줄의 첫 위젯 것 하나만 */}
            {editing && area.fit && ri > 0 && (
              <Handle
                kind="row"
                label={f(t.widgets.resizeRow, { row: ri })}
                value={Math.round((rows[ri - 1].h / (rows[ri - 1].h + r.h)) * 100)}
                focusable={ci === 0}
                onPointerDown={(e) => onHandleDown(e, 'row', ri, ci)}
                onKeyDown={(e) => onHandleKey(e, 'row', ri, ci)}
              />
            )}
            {editing && area.fit && ri === rows.length - 1 && sumH < ROWS - 1e-6 && (
              <Handle
                kind="end-row"
                label={f(t.widgets.resizeRow, { row: ri + 1 })}
                value={Math.round((sumH / ROWS) * 100)}
                focusable={ci === 0}
                onPointerDown={(e) => onHandleDown(e, 'end-row', ri, ci)}
                onKeyDown={(e) => onHandleKey(e, 'end-row', ri, ci)}
              />
            )}
          </div>
        )
      })
    })
  }

  return (
    <div className="flex flex-col gap-3 lg:h-full">
      <div
        ref={viewRef}
        onWheel={onWheel}
        onDragOver={onViewDragOver}
        onDragLeave={(e) => adding.current && !viewRef.current?.contains(e.relatedTarget as Node) && stopAdding()}
        onDrop={onViewDrop}
        className="widget-view lg:min-h-0 lg:flex-1"
      >
        <div className="widget-track" style={{ '--page': page } as CSSProperties}>
          {Array.from({ length: pageCount }, (_, p) => (
            <div
              key={p}
              ref={(el) => {
                boards.current[p] = el
              }}
              role="list"
              aria-label={pageCount > 1 ? f(t.widgets.page, { page: p + 1, total: pageCount }) : editing ? t.widgets.editHint : undefined}
              // 넓은 화면에서 다른 페이지는 초점 · 화면낭독에서 뺀다. 숨기는 것은 페이지가 미끄러져 나간 뒤 — 들어오는 쪽은 바로 보인다
              // (전환을 숨길 때만 건다 — 보일 때도 걸면 그동안 숨김이라 옮겨 온 위젯이 초점을 못 받는다)
              className={`widget-board ${p !== page ? 'lg:invisible lg:transition-[visibility] lg:delay-[450ms]' : ''}`}
            >
              {p === 0 && !total && !preview ? (
                <div className="glass grid w-full place-items-center rounded-3xl px-6 py-20 text-center sm:col-span-2 lg:h-full">
                  <div>
                    <p className="font-semibold">{t.widgets.empty}</p>
                    <p className="mt-1 text-sm text-muted">{t.widgets.emptyHint}</p>
                    {!editing && (
                      <button type="button" onClick={onEdit} className="mt-4 h-11 cursor-pointer rounded-xl bg-accent-fill px-5 text-[15px] font-semibold text-white active:scale-95">
                        {t.widgets.edit}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                renderPage(pages[p] ?? [])
              )}
            </div>
          ))}
        </div>
      </div>

      {pageCount > 1 && (
        <div className="hidden flex-none justify-center gap-1 lg:flex" role="group" aria-label={t.widgets.pages}>
          {Array.from({ length: pageCount }, (_, p) => (
            <button
              key={p}
              type="button"
              onClick={() => layout.setPage(p)}
              aria-label={f(t.widgets.page, { page: p + 1, total: pageCount })}
              aria-current={p === page ? 'page' : undefined}
              className="grid size-6 cursor-pointer place-items-center"
            >
              <span className={`block size-2 rounded-full transition-[background-color,scale] ${p === page ? 'scale-125 bg-fg' : 'bg-fg/25 hover:bg-fg/45'}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** 경계 손잡이 — col · end-col 은 오른쪽 변, row 는 윗변, end-row 는 아랫변. 화면낭독기에는 앞쪽(끝 경계는 채운 만큼)의 비율(%)로 알린다 */
function Handle({
  kind,
  label,
  value,
  focusable = true,
  onPointerDown,
  onKeyDown,
}: {
  kind: Edge
  label: string
  value: number
  focusable?: boolean
  onPointerDown: (e: PointerEvent<HTMLElement>) => void
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void
}) {
  return (
    <div
      role="separator"
      aria-orientation={across(kind) ? 'vertical' : 'horizontal'}
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-hidden={focusable ? undefined : true}
      tabIndex={focusable ? 0 : -1}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={`group absolute z-20 hidden touch-none place-items-center outline-none lg:grid ${
        across(kind)
          ? 'inset-y-6 -right-[calc(var(--gap)/2_+_8px)] w-4 cursor-col-resize'
          : `inset-x-6 h-4 cursor-row-resize ${kind === 'row' ? '-top-[calc(var(--gap)/2_+_8px)]' : '-bottom-[calc(var(--gap)/2_+_8px)]'}`
      }`}
    >
      <span
        className={`rounded-full bg-fg/25 transition-colors group-hover:bg-accent group-focus-visible:bg-accent group-focus-visible:ring-4 group-focus-visible:ring-accent/30 group-active:bg-accent ${
          across(kind) ? 'h-12 w-1' : 'h-1 w-12'
        }`}
      />
    </div>
  )
}
