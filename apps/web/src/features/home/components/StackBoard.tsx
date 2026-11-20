import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import type { StackLayout } from '../hooks/useStackLayout'
import { useI18n } from '@/shared/i18n'
import { motionOff } from '@/shared/lib'
import { type Item } from '../lib/widgetLayout'
import { STACK_CELLS, stackSizeOf, nearest } from '../lib/stackLayout'
import { type StackSize } from '@/shared/widget'
import { text, type WidgetDef } from '../lib/widgetDef'
interface StackBoardProps {
  layout: StackLayout
  defs: WidgetDef[]
  editing: boolean
  /** 홈 편집을 켠다 — 쉴 때 위젯을 길게 누르면 상단 바의 홈 편집과 같은 편집으로 들어간다 */
  onEdit: () => void
  /** 위젯을 골랐는지 — App 이 아래 막대(편집 독 · 탭 바)를 숨긴다 */
  onPick: (picking: boolean) => void
  /** 끌어 옮긴 위젯을 놓았다 — 놓기를 완료로 보고 편집을 끝낸다 */
  onDone: () => void
  /** 위젯 하나 — WidgetGrid 의 것을 그대로 쓴다. stack 은 고른 크기, overlay 는 고른 위젯 위에 얹는 테두리 · 손잡이 */
  renderWidget: (c: Item, index: number, list: Item[], opts: { stack: StackSize; overlay?: ReactNode }) => ReactNode
}

/** 이만큼(ms) 누르고 있으면 위젯이 들린다(쉴 때는 편집이 켜지며) — 그 전에 움직이면 스크롤(터치) · 글자 고르기(마우스) */
const HOLD = 350
/** 끄는 위젯이 화면 위 · 아래 끝 이만큼(px) 안에 오면 화면이 따라 스크롤된다 — 끝에 가까울수록 빠르게, 맨 끝에서 초당 SCROLL_MAX(px) */
const EDGE = 100
const SCROLL_MAX = 1100
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'
/** 테두리 손잡이 자리 — 변 한가운데, 테두리 선 위에(누르는 칸 44px) */
const HANDLE = {
  l: 'top-1/2 -left-[22px] -translate-y-1/2 cursor-ew-resize',
  r: 'top-1/2 -right-[22px] -translate-y-1/2 cursor-ew-resize',
  t: 'left-1/2 -top-[22px] -translate-x-1/2 cursor-ns-resize',
  b: 'left-1/2 -bottom-[22px] -translate-x-1/2 cursor-ns-resize',
}
type Side = keyof typeof HANDLE

/** 크기를 바꾼다 — 칸이 늘고 주는 모습을 이어 그린다(View Transition, styles/widgets/stack.css 의 ::view-transition-*). 모르는 브라우저 · 애니메이션 끄기는 바로 */
function morph(change: () => void) {
  if (motionOff() || !document.startViewTransition) { change(); return; }
  document.startViewTransition(() => flushSync(change))
}

/**
 * 좁은 화면의 위젯 판 — 4칸 격자에 좁은 화면 순서 · 크기(1×1 ~ 4×4, lib/widgetLayout.ts 의 STACK_CELLS)대로 쌓는다. 편집은 홈 화면 그 자리에서(삼성 One UI 처럼).
 * 쉴 때: 누르면 위젯 기능(링크 등)이 그대로 돈다. 길게 누르면 홈 편집이 켜지고(상단 바의 홈 편집과 같은 상태) 그 위젯이 골라진다.
 * 편집 중: 위젯을 누르면 그 위젯에만 테두리 · 변 손잡이, 다시 누르거나 바깥 · Esc 면 꺼진다. 좌우 손잡이는 가로 칸 수, 위아래는 세로 칸 수
 *   (그 위젯이 그릴 수 있는 것만, 바뀌면 바로 저장). 반 칸을 넘을 때마다 위젯이 늘거나 줄며 짧게 진동하고, 테두리는 늘 위젯 크기 그대로 함께 바뀐다.
 *   고른 동안 아래 막대는 숨는다.
 * 옮기기: 길게 누른 채 움직이면 위젯이 손을 따라 뜨고(테두리는 숨김), 놓일 칸에 점선 자리가 보인다. 손이 다른 위젯의 앞쪽 반이면 그 앞, 뒤쪽 반이면 뒤
 *   — 4칸보다 좁은 위젯은 좌우 반, 4칸 폭은 위아래 반. 이미 그 자리면 그대로라 크기가 달라도 오가지 않는다. 비키는 위젯은 미끄러지고, 끝에 대면 스크롤된다.
 *   놓으면 그걸 완료로 보고 편집이 끝난다.
 * 키보드는 편집 중 위젯에 초점을 두고 화살표로 옮기고, Enter 로 골라 손잡이로 간다. 넓은 화면 칸 배치는 건드리지 않는다.
 */
export function StackBoard({ layout, defs, editing, onEdit, onPick, onDone, renderWidget }: StackBoardProps) {
  const { t, f } = useI18n()
  const boardRef = useRef<HTMLDivElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const byType = new Map(defs.map((d) => [d.type, d]))
  // 끄는 동안의 순서 — 놓기 전에는 저장하지 않는다. 화면 끝 자동 스크롤(requestAnimationFrame)은 처음 렌더의 함수를 계속 불러 ref 에도 둔다
  const [preview, setPreview] = useState<string[] | null>(null)
  const order = useRef<string[] | null>(null)
  const show = (next: string[] | null) => {
    order.current = next
    setPreview(next)
  }
  const ids = preview ?? layout.items.map((c) => c.i)
  const items = ids.map((i) => layout.items.find((c) => c.i === i)!).filter((c) => c && byType.has(c.i))
  const sizeOf = (i: string) => stackSizeOf(byType.get(i)?.stack ?? ['m'], layout.sizes[i])

  const el = (i: string) => boardRef.current?.querySelector<HTMLElement>(`:scope > [data-type="${i}"]`)
  const children = () => [...(boardRef.current?.querySelectorAll<HTMLElement>(':scope > [data-type]') ?? [])]

  /** 누른 위젯 — lifted 는 길게 눌러 골라졌는지, moved 는 그 뒤 움직여 옮기는 중인지. ox · oy 는 잡은 점이 위젯 왼쪽 위에서 떨어진 거리 */
  const held = useRef<{ i: string; id: number; x: number; y: number; lifted: boolean; moved: boolean; timer: number; ox: number; oy: number } | null>(null)
  /** 순서를 바꾸기 직전 위젯 자리 — 다시 그린 뒤 그만큼 미끄러지게 */
  const before = useRef<Map<string, DOMRect> | null>(null)
  const scroll = useRef(0)
  /** 길게 눌러 편집을 켰으면 손을 뗄 때의 누르기(링크 열기 등)는 버린다 — 다음에 누를 때 푼다 */
  const swallow = useRef(false)
  /** 길게 눌러 편집을 켠 위젯의 화면 위치 — 편집 안내 줄이 생겨 판이 밀려도 손 아래 그대로 있게 스크롤로 되돌린다 */
  const anchor = useRef<{ i: string; top: number } | null>(null)

  // 고른 위젯(테두리 · 손잡이) — 편집이 끝나면 함께 꺼진다
  const [picked, setPicked] = useState<string | null>(null)
  if (!editing && picked) setPicked(null)
  useEffect(() => onPick(!!picked), [picked, onPick])
  useEffect(() => () => onPick(false), [onPick])
  useLayoutEffect(() => {
    const a = anchor.current
    anchor.current = null
    const node = a && el(a.i)
    if (node) scrollBy(0, node.getBoundingClientRect().top - a.top)
     
  }, [editing])
  // 실제 폰은 든 뒤 움직이면 브라우저가 스크롤로 가져가 pointercancel 을 보낸다 — 든 동안만 막는다.
  // touch-action 은 손을 댈 때 정해져 나중에 바꿀 수 없고, React 의 onTouchMove 는 passive 라 직접 단다
  useEffect(() => {
    const stop = (e: TouchEvent) => held.current?.lifted && e.preventDefault()
    document.addEventListener('touchmove', stop, { passive: false })
    return () => document.removeEventListener('touchmove', stop)
  }, [])
  // 고른 위젯 밖을 누르거나 Esc 면 꺼진다 — Esc 는 편집 끝내기(App)보다 먼저 받아 거기서 멈춘다
  useEffect(() => {
    if (!picked) return
    const outside = (e: globalThis.PointerEvent) => !el(picked)?.contains(e.target as Node) && setPicked(null)
    const esc = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return
      e.stopPropagation()
      setPicked(null)
    }
    document.addEventListener('pointerdown', outside, true)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', outside, true)
      document.removeEventListener('keydown', esc)
    }
     
  }, [picked])

  /** 들린 위젯을 손에 붙이고, 놓일 칸에 점선 자리를 둔다 — offset 값은 translate(FLIP 포함)를 빼고 잰 칸 자리 */
  const follow = () => {
    const h = held.current
    const node = h && el(h.i)
    const board = boardRef.current
    if (!h?.moved || !node || !board) return
    const b = board.getBoundingClientRect()
    node.style.translate = `${h.x - h.ox - b.left - node.offsetLeft}px ${h.y - h.oy - b.top - node.offsetTop}px`
    Object.assign(slotRef.current?.style ?? {}, { left: `${node.offsetLeft}px`, top: `${node.offsetTop}px`, width: `${node.offsetWidth}px`, height: `${node.offsetHeight}px` })
  }
  /** 손 아래 위젯의 앞 · 뒤로 — 바뀌면 순서만 미리 보여 준다 */
  const reorder = () => {
    const h = held.current
    const cur = order.current
    if (!h?.moved || !cur) return
    const target = children().find((c) => {
      if (c.dataset.type === h.i) return false
      const r = c.getBoundingClientRect()
      return h.x >= r.left && h.x <= r.right && h.y >= r.top && h.y <= r.bottom
    })
    if (!target) return
    const r = target.getBoundingClientRect()
    const narrow = STACK_CELLS[target.dataset.stack as StackSize]?.[0] < 4
    const after = narrow ? h.x > r.left + r.width / 2 : h.y > r.top + r.height / 2
    const next = cur.filter((i) => i !== h.i)
    next.splice(next.indexOf(target.dataset.type!) + (after ? 1 : 0), 0, h.i)
    if (next.join() === cur.join()) return
    before.current = new Map(children().map((c) => [c.dataset.type!, c.getBoundingClientRect()]))
    show(next)
  }
  // 순서가 바뀐 뒤 — 비킨 위젯은 옛 자리에서 미끄러져 오고, 들린 위젯 · 점선 자리는 새 칸 기준으로 다시
  useLayoutEffect(() => {
    const old = before.current
    before.current = null
    if (old && !motionOff()) {
      for (const c of children()) {
        const from = old.get(c.dataset.type!)
        if (!from || c.dataset.type === held.current?.i) continue
        const to = c.getBoundingClientRect()
        const [dx, dy] = [from.left - to.left, from.top - to.top]
        if (dx || dy) c.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], { duration: 200, easing: EASE })
      }
    }
    follow()
  })

  // 골라진 뒤에는 터치로 움직여도 화면이 스크롤되지 않게 — 브라우저가 미리 알도록 판에 늘 걸어 두고, 고른 동안만 막는다
  useEffect(() => {
    const board = boardRef.current
    const block = (e: TouchEvent) => held.current?.lifted && e.preventDefault()
    board?.addEventListener('touchmove', block, { passive: false })
    return () => board?.removeEventListener('touchmove', block)
  }, [])

  /** 길게 눌렀다 — 쉴 때면 편집을 켜고, 그 위젯을 고른다. 실제로 움직이기 전까지는 고른 그대로 */
  const lift = () => {
    const h = held.current
    const node = h && el(h.i)
    if (!h || !node) return
    const r = node.getBoundingClientRect()
    Object.assign(h, { lifted: true, ox: h.x - r.left, oy: h.y - r.top })
    if (!editing) {
      swallow.current = true
      anchor.current = { i: h.i, top: r.top }
      onEdit()
    }
    setPicked(h.i)
    navigator.vibrate?.(10)
  }
  /** 골라진 채 움직이기 시작 — 옮기는 중으로 */
  const startMove = () => {
    const h = held.current
    const node = h && el(h.i)
    if (!h || !node) return
    h.moved = true
    node.dataset.lifted = ''
    show(layout.items.map((c) => c.i))
    // 화면 끝에 대고 있으면 따라 스크롤 — 들어간 깊이의 제곱으로 빨라지고, 프레임 간격(dt)만큼 움직여 화면 빠르기와 상관없이 고르다.
    // 스크롤된 만큼 손 아래 위젯이 바뀌니 다시 견준다
    let last = performance.now()
    const tick = (now: number) => {
      const g = held.current
      if (!g?.moved) return
      const dt = Math.min(now - last, 32)
      last = now
      const depth = g.y < EDGE ? g.y - EDGE : g.y > innerHeight - EDGE ? g.y - innerHeight + EDGE : 0
      const dy = Math.sign(depth) * SCROLL_MAX * Math.min(1, Math.abs(depth) / EDGE) ** 2 * (dt / 1000)
      if (Math.abs(dy) >= 0.5) {
        scrollBy(0, dy)
        follow()
        reorder()
      }
      scroll.current = requestAnimationFrame(tick)
    }
    scroll.current = requestAnimationFrame(tick)
  }
  const drop = () => {
    const h = held.current
    held.current = null
    if (!h) return
    clearTimeout(h.timer)
    if (!h.moved) return
    cancelAnimationFrame(scroll.current)
    const node = el(h.i)
    if (node) {
      delete node.dataset.lifted
      // 손에서 칸 자리로 내려앉는다
      const from = node.style.translate
      node.style.translate = ''
      if (!motionOff()) node.animate([{ translate: from }, { translate: '0 0' }], { duration: 220, easing: EASE })
    }
    if (order.current) layout.move(h.i, order.current.indexOf(h.i))
    show(null)
    // 옮기고 놓으면 그대로 완료 — 고른 채 남겨 두지 않고 편집을 끝낸다(길게 눌러 고르기만 했으면 크기 손잡이를 쓰게 편집 그대로)
    onDone()
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    swallow.current = false
    const node = (e.target as Element).closest<HTMLElement>('[data-type]')
    if (e.button !== 0 || !node || (e.target as Element).closest('button, input, .no-drag')) return
    held.current = { i: node.dataset.type!, id: e.pointerId, x: e.clientX, y: e.clientY, lifted: false, moved: false, timer: window.setTimeout(lift, HOLD), ox: 0, oy: 0 }
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const h = held.current
    if (!h || h.id !== e.pointerId) return
    const far = Math.hypot(e.clientX - h.x, e.clientY - h.y) >= 6
    // 골라지기 전에 움직이면 스크롤 · 글자 고르기 — 길게 누르기를 그만둔다
    if (!h.lifted) return void (far && drop())
    if (!h.moved) {
      if (!far) return
      if (e.pointerType !== 'touch') e.currentTarget.setPointerCapture(e.pointerId)
      startMove()
    }
    h.x = e.clientX
    h.y = e.clientY
    follow()
    reorder()
  }

  /** 크기 손잡이를 끄는 중 — 처음 크기 · 손 위치에서 얼마나 갔는지로 정한다(정해진 경계라 크기가 바뀌어도 오가지 않는다).
   * to 는 마지막으로 바꾸라고 한 크기(바뀌기 전 같은 크기를 거듭 부르지 않게) */
  const resizing = useRef<{ x: number; y: number; from: StackSize; to: StackSize } | null>(null)
  /** 고른 위젯 위 — 테두리 · 그릴 수 있는 크기 쪽 변 손잡이. 테두리는 위젯에 붙어 있어 크기와 함께 바뀐다(styles/widgets/stack.css 의 stack-frame) */
  const frame = (i: string, sizes: StackSize[], name: string) => {
    const current = sizeOf(i)
    const pick = (s: StackSize) => {
      if (s === sizeOf(i)) return
      navigator.vibrate?.(8)
      morph(() => layout.resize(i, s))
    }
    const widths = new Set(sizes.map((s) => STACK_CELLS[s][0]))
    const heights = new Set(sizes.map((s) => STACK_CELLS[s][1]))
    const sides = [...(heights.size > 1 ? (['t', 'b'] as const) : []), ...(widths.size > 1 ? (['l', 'r'] as const) : [])]
    /** 한 칸(+ 간격) 폭 — 칸은 정사각이라 높이도 같다 */
    const step = () => ((boardRef.current?.clientWidth ?? 0) + 16) / 4
    /** from 에서 그 쪽 칸 수를 n 만큼 늘린(줄인) 크기 */
    const by = (side: Side, n: number, from: StackSize) => {
      const [w, h] = STACK_CELLS[from]
      const across = side === 'l' || side === 'r'
      const clamp = (v: number) => Math.min(4, Math.max(1, v))
      return nearest(sizes, across ? clamp(w + n) : w, across ? h : clamp(h + n), across)
    }
    return (
      <div className="stack-frame absolute -inset-1.5 z-10 animate-materialize rounded-[30px] border-2 border-accent">
        {sides.map((side) => (
          <button
            key={side}
            type="button"
            aria-label={f(t.widgets.resizeStack, { name, size: t.widgets.stackSize[current] })}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              resizing.current = { x: e.clientX, y: e.clientY, from: current, to: current }
            }}
            onPointerMove={(e) => {
              const r = resizing.current
              if (!r) return
              // 바깥으로 끈 거리 — 반 칸을 넘으면 다음 칸
              const o = { l: r.x - e.clientX, r: e.clientX - r.x, t: r.y - e.clientY, b: e.clientY - r.y }[side]
              const next = by(side, Math.round(o / step()), r.from)
              if (next !== r.to) {
                r.to = next
                pick(next)
              }
            }}
            onPointerUp={() => (resizing.current = null)}
            onPointerCancel={() => (resizing.current = null)}
            // 키보드(Enter · Space)로 누르면 한 단계 — 오른쪽 · 아래는 늘리고 왼쪽 · 위는 줄인다. 손으로 누르기만 한 것(detail > 0)은 끄기의 일부라 그냥 둔다
            onClick={(e) => e.detail === 0 && pick(by(side, side === 'r' || side === 'b' ? 1 : -1, current))}
            className={`absolute grid size-11 touch-none place-items-center ${HANDLE[side]}`}
          >
            <span className="size-3.5 rounded-full border-2 border-accent bg-bg shadow-[0_1px_4px_oklch(0_0_0/0.3)]" />
          </button>
        ))}
        {/* 지금 크기 — 칸 수로. 끄는 동안 칸을 넘을 때마다 바뀐다 */}
        <span className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-accent-fill px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-white tabular-nums shadow-[0_2px_6px_oklch(0_0_0/0.2)]">
          {t.widgets.stackSize[current]}
        </span>
      </div>
    )
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const node = e.target as HTMLElement
    const d = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key]
    const i = node.dataset.type
    if (!editing || !i) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setPicked(picked === i ? null : i); return;
    }
    if (!d) return
    e.preventDefault()
    layout.move(i, ids.indexOf(i) + d)
    requestAnimationFrame(() => el(i)?.focus())
  }

  return (
    // 칸 폭을 판 폭에서 정하려고 한 겹 감싼다(styles/widgets/stack.css 의 .stack-wrap)
    <div className="stack-wrap">
      <div
        ref={boardRef}
        role="list"
        aria-label={editing ? t.widgets.editHintStack : undefined}
        className="widget-board relative"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        // 편집 중 들지 않고 뗐으면 누르기 — 그 위젯 테두리를 켜고, 이미 켜져 있으면 끈다
        onPointerUp={() => {
          const h = held.current
          if (editing && h && !h.lifted) setPicked((p) => (p === h.i ? null : h.i))
          drop()
        }}
        onPointerCancel={drop}
        // 안드로이드는 길게 누르면 이미지 · 링크 메뉴가 떠 끌기를 끊는다
        onContextMenu={(e) => held.current && e.preventDefault()}
        onClickCapture={(e) => {
          if (!swallow.current) return
          swallow.current = false
          e.preventDefault()
          e.stopPropagation()
        }}
        onKeyDown={onKeyDown}
      >
        {items.map((c, index) => {
          const def = byType.get(c.i)!
          return renderWidget(c, index, items, { stack: sizeOf(c.i), overlay: picked === c.i ? frame(c.i, def.stack ?? ['m'], text(def.title, t)) : undefined })
        })}
        {/* 옮기는 중 놓일 칸 — follow 가 자리 · 크기를 맞춘다 */}
        {preview && <div ref={slotRef} aria-hidden="true" className="stack-slot" />}
      </div>
    </div>
  )
}
