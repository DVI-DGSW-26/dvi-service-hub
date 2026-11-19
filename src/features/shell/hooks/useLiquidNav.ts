import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { settle, snap, spring, step, motionOff } from '@/shared/lib'
import { DRAG_START, EDGE_SPEED, MAX_LIFT, MAX_STRETCH, aimAt, followTo, nearestMenu, type Drag } from '../lib/liquid'

interface Options {
  /** 메뉴가 늘어선 방향 — 사이드바는 세로(y), 하단 탭바는 가로(x) */
  axis?: 'x' | 'y'
  /** 지금 화면의 메뉴 순번. 메뉴에 없는 화면이면 -1 */
  active: number
  /** 물방울이 다른 메뉴에 닿거나 그 위에 놓였을 때 — 그 화면으로 옮긴다 */
  onCommit: (index: number) => void
}

const reduceMotion = motionOff

// 브라우저 기본 끌기 그림은 숨기고 방울 · 링크 칩으로 대신 보여준다
const BLANK = new Image()
BLANK.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

/**
 * 메뉴의 '물방울' 선택 표시. 세로(사이드바) · 가로(하단 탭바) 모두 같은 물리로 움직인다.
 * 아래에서 '위치'는 메뉴가 늘어선 방향의 좌표(세로면 y, 가로면 x)다.
 * - drop: 손가락을 따라다니는 방울 (속도만큼 늘어난다)
 * - anchor 두 개: 메뉴 자리에 맺힌 방울. 방울이 떠나면 줄어들며 떨어져 나가고, 새 자리에서는 새로 맺힌다.
 * 셋을 goo 필터로 한 겹에 그려서 가까우면 이어지고 멀어지면 끊어진다.
 *
 * 마우스는 브라우저 끌어놓기를 그대로 쓴다 — 메뉴 판(data-liquid-root) 안에서는 방울이 따라오고,
 * 밖으로 나가면 평소처럼 링크를 탭 바 · 북마크 · 바탕화면에 놓을 수 있다. 터치는 포인터로 직접 끈다.
 * 매 프레임은 React 를 거치지 않고 style 만 바꾼다.
 */
export function useLiquidNav({ axis = 'y', active, onCommit }: Options) {
  const horizontal = axis === 'x'
  /** 메뉴 방향의 포인터 좌표 */
  const along = (e: { clientX: number; clientY: number }) => (horizontal ? e.clientX : e.clientY)
  const translate = (p: number) => (horizontal ? `translate3d(${p}px,0,0)` : `translate3d(0,${p}px,0)`)
  /** 메뉴 방향 · 그 수직 방향의 배율 */
  const scale = (main: number, cross: number) => (horizontal ? `scale(${main},${cross})` : `scale(${cross},${main})`)

  const listRef = useRef<HTMLUListElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const anchorA = useRef<HTMLDivElement>(null)
  const anchorB = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLDivElement>(null)
  const commitRef = useRef(onCommit)
  // 그리는 중에는 ref 를 쓰지 않는다 — CalendarModal 과 같은 방식
  useLayoutEffect(() => {
    commitRef.current = onCommit
  })
  const [lit, setLit] = useState(active)
  const [dragging, setDragging] = useState(false)
  /** 메뉴 판 밖으로 들고 나간 메뉴 — 링크 칩에 보여준다 */
  const [carry, setCarry] = useState(-1)

  const sim = useRef({
    /** 메뉴마다 시작 위치와, 메뉴 한 칸의 길이(메뉴 방향) */
    starts: [] as number[],
    size: 0,
    drop: spring(0),
    lift: spring(1),
    anchors: [spring(active >= 0 ? 1 : 0), spring(0)],
    anchorAt: [0, 0],
    current: 0,
    /** 놓은 뒤 · 눌러서 옮길 때의 [감쇠비, 응답 시간] */
    feel: [1, 0.38] as [number, number],
    releasedAt: 0,
    active,
    pending: -1,
    lit: active,
    drag: null as Drag | null,
    /** 끄는 동안 문서에 붙인 리스너를 떼는 함수 — 붙인 그 렌더의 함수로 뗀다 */
    detach: null as (() => void) | null,
    raf: 0,
    last: 0,
  }).current

  /** 방울이 손가락을 따라가는 중인가 (끄는 중이고 메뉴 판 안) */
  const following = () => !!sim.drag?.live && sim.drag.inside

  function measure() {
    const list = listRef.current
    if (!list) return
    const items = [...list.children] as HTMLElement[]
    const first = items[0]
    sim.starts = items.map((li) => (horizontal ? li.offsetLeft : li.offsetTop))
    sim.size = (horizontal ? first?.offsetWidth : first?.offsetHeight) ?? 0
    // 방울 크기 = 메뉴 한 칸 (세로 메뉴는 목록 폭을 꽉 채운다)
    const width = horizontal ? sim.size : list.clientWidth
    const height = horizontal ? (first?.offsetHeight ?? 0) : sim.size
    for (const el of [dropRef.current, anchorA.current, anchorB.current]) {
      if (!el) continue
      el.style.width = `${width}px`
      el.style.height = `${height}px`
    }
  }

  function render() {
    const { drop, lift, anchors, anchorAt, size } = sim
    // 빠르게 움직일수록 움직이는 방향으로 늘어나고 옆으로는 홀쭉해진다
    const stretch = reduceMotion() ? 0 : Math.min(Math.abs(drop.v) / 2500, 0.22, MAX_STRETCH / (size || 1))
    const grow = 1 + Math.min(lift.x - 1, MAX_LIFT / (size || 1))
    const el = dropRef.current
    if (el) {
      el.style.transform = `${translate(drop.x)} ${scale(grow * (1 + stretch), lift.x * (1 - stretch * 0.5))}`
      el.style.opacity = sim.active < 0 && !following() ? '0' : '1'
    }
    ;[anchorA.current, anchorB.current].forEach((a, i) => {
      if (a) a.style.transform = `${translate(anchorAt[i])} ${scale(anchors[i].x, 0.5 + 0.5 * anchors[i].x)}`
    })

    // 방울 가운데가 어느 메뉴 위에 있는지 — 그 메뉴 글자를 흰색으로
    const near = sim.active >= 0 || following() ? nearestMenu(sim.starts, size, drop.x + size / 2) : -1
    if (near !== sim.lit) {
      sim.lit = near
      setLit(near)
    }
    if (following() && near >= 0 && near !== sim.active && near !== sim.pending) {
      sim.pending = near
      commitRef.current(near)
    }
  }

  function frame(now: number) {
    const dt = Math.min((now - sim.last) / 1000, 1 / 30)
    sim.last = now
    const { drop, lift, anchors, drag, size } = sim
    const reduce = reduceMotion()

    if (following()) {
      drop.to = drag!.to
      step(drop, dt, 1, 0.1)
    } else {
      // 메뉴 판 밖으로 나갔으면 방울은 제자리로 돌아온다
      if (drag?.live && sim.active >= 0) drop.to = sim.starts[sim.active]
      step(drop, dt, ...sim.feel)
    }
    lift.to = following() ? 1.06 : 1
    step(lift, dt, 1, 0.25)
    anchors.forEach((a, i) => {
      // 지금 자리의 방울은 떠난 방울과의 거리만큼 줄어들고, 떠나는 자리의 방울은 사라진다
      a.to = i === sim.current && sim.active >= 0 ? Math.max(0, 1 - Math.abs(drop.x - sim.anchorAt[i]) / (size || 1)) : 0
      step(a, dt, 1, 0.2)
    })
    if (reduce) [drop, lift, ...anchors].forEach((s) => snap(s))

    const still = [settle(drop, 0.3), settle(lift, 0.002), ...anchors.map((a) => settle(a, 0.002))].every(Boolean)
    render()
    sim.raf = drag?.live || !still ? requestAnimationFrame(frame) : 0
  }

  function kick() {
    if (sim.raf) return
    sim.last = performance.now()
    sim.raf = requestAnimationFrame(frame)
  }

  // 처음 그릴 때 · 크기가 바뀔 때(사이드바 접기 · 화면 회전) 바로 제자리에
  useLayoutEffect(() => {
    measure()
    if (sim.active >= 0) {
      snap(sim.drop, sim.starts[sim.active])
      sim.anchorAt[sim.current] = sim.starts[sim.active]
    }
    render()
    const list = listRef.current
    if (!list) return
    const ro = new ResizeObserver(() => {
      measure()
      if (!sim.drag?.live && sim.active >= 0) {
        sim.drop.to = sim.starts[sim.active]
        sim.anchorAt[sim.current] = sim.starts[sim.active]
        kick()
      }
    })
    ro.observe(list)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(sim.raf)
      sim.raf = 0
    }
  }, [])

  // 화면이 바뀌면: 떠나는 자리의 방울은 줄어 사라지고, 새 자리에 새 방울이 맺힌다
  useLayoutEffect(() => {
    if (sim.active === active) return
    const prev = sim.active
    sim.active = active
    sim.pending = -1
    if (active >= 0) {
      sim.current = 1 - sim.current
      sim.anchorAt[sim.current] = sim.starts[active]
      snap(sim.anchors[sim.current], 0)
      if (prev < 0 && !following()) snap(sim.drop, sim.starts[active])
      sim.drop.to = sim.starts[active]
      // 끌어서 놓은 게 아니라 눌러서 옮긴 경우 — 튕김 없이 부드럽게
      if (performance.now() - sim.releasedAt > 120) sim.feel = [0.9, 0.38]
    }
    kick()
  }, [active])

  /** 끌기 시작 — 누른 메뉴와 잡은 자리를 기억한다 */
  function begin(index: number, id: number, x: number, y: number, live: boolean) {
    measure()
    const box = listRef.current!.getBoundingClientRect()
    const listStart = horizontal ? box.left : box.top
    const start = sim.starts[index]
    if (sim.active < 0) snap(sim.drop, start)
    const offset = along({ clientX: x, clientY: y }) - listStart - start
    sim.drag = { id, startX: x, startY: y, listStart, offset, live, inside: true, to: start, history: [] }
  }

  /** 손가락 위치를 방울 목표로 — 끝을 넘으면 고무줄처럼 */
  const follow = (d: Drag, client: number, t: number) => followTo(d, client, t, sim.starts[sim.starts.length - 1] ?? 0)

  /** 놓기 — 놓는 순간 속도를 넘겨받고, 그 속도로 멈출 자리에 가장 가까운 메뉴로 */
  function land(d: Drag, t: number) {
    const { target, v, outward } = aimAt(d, t, sim.starts)
    // 끝 메뉴로 갈 때 바깥쪽 속도는 판 끝이 받아 낸다 — 그대로 넘기면 끝을 지나쳐 튀어나갔다 돌아온다
    sim.drop.v = outward ? Math.sign(v) * Math.min(Math.abs(v), EDGE_SPEED) : v
    sim.feel = outward ? [1, 0.32] : [0.8, 0.32]
    sim.releasedAt = performance.now()
    if (target !== sim.active) commitRef.current(target)
    else sim.drop.to = sim.starts[target]
  }

  // ── 터치 · 펜: 포인터로 직접 끈다 ──

  function onMove(e: PointerEvent) {
    const d = sim.drag
    if (!d || e.pointerId !== d.id) return
    if (!d.live) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_START) return
      d.live = true
      setDragging(true)
      // 메뉴 밖으로 나가도 계속 따라오게. 이미 끝난 포인터면 브라우저가 거절하므로 무시한다
      try {
        listRef.current?.setPointerCapture(e.pointerId)
      } catch {}
    }
    follow(d, along(e), e.timeStamp)
    kick()
  }

  function onUp(e: PointerEvent) {
    const d = sim.drag
    if (!d || e.pointerId !== d.id) return
    detach()
    sim.drag = null
    if (!d.live) return // 끌지 않았으면 그냥 링크 누름

    setDragging(false)
    // 끈 뒤 따라오는 click 은 삼킨다
    const swallow = (ev: MouseEvent) => {
      ev.preventDefault()
      ev.stopPropagation()
    }
    addEventListener('click', swallow, { capture: true, once: true })
    setTimeout(() => removeEventListener('click', swallow, { capture: true }), 0)
    land(d, e.timeStamp)
    kick()
  }

  function detach() {
    sim.detach?.()
    sim.detach = null
  }

  function onPointerDown(e: ReactPointerEvent<HTMLUListElement>) {
    // 마우스는 아래 브라우저 끌어놓기로 처리한다
    if (e.pointerType === 'mouse' || e.button !== 0 || !e.isPrimary || !listRef.current) return
    const li = (e.target as HTMLElement).closest('li')
    const index = li ? [...listRef.current.children].indexOf(li) : -1
    if (index < 0) return
    begin(index, e.pointerId, e.clientX, e.clientY, false)
    detach()
    addEventListener('pointermove', onMove)
    addEventListener('pointerup', onUp)
    addEventListener('pointercancel', onUp)
    sim.detach = () => {
      removeEventListener('pointermove', onMove)
      removeEventListener('pointerup', onUp)
      removeEventListener('pointercancel', onUp)
    }
  }

  // ── 마우스: 브라우저 끌어놓기 ──

  function moveChip(x: number, y: number, show: boolean) {
    const chip = chipRef.current
    if (!chip) return
    chip.style.transform = `translate3d(${x + 14}px,${y + 14}px,0)`
    if (show) chip.dataset.show = ''
    else delete chip.dataset.show
  }

  function onDragOver(e: DragEvent) {
    const d = sim.drag
    if (!d) return
    const box = listRef.current?.closest('[data-liquid-root]')?.getBoundingClientRect()
    d.inside = !!box && e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom
    if (d.inside) {
      // 메뉴 판은 놓을 수 있는 자리 — 금지 표시 대신 옮기기 커서
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
      follow(d, along(e), e.timeStamp)
    }
    moveChip(e.clientX, e.clientY, !d.inside)
    kick()
  }

  function onDragLeave(e: DragEvent) {
    // 브라우저 창 밖(탭 바 · 바탕화면)으로 나가면 칩은 숨긴다 — 그 뒤는 브라우저가 맡는다
    if (sim.drag && !e.relatedTarget && (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= innerWidth || e.clientY >= innerHeight)) {
      sim.drag.inside = false
      moveChip(e.clientX, e.clientY, false)
      kick()
    }
  }

  function onDrop(e: DragEvent) {
    // 메뉴 판 위에 놓으면 주소로 이동하지 않고 그 메뉴로
    if (!sim.drag?.inside) return
    e.preventDefault()
    finishDrag(e.timeStamp)
  }

  /** droppedAt: 메뉴 판 위에 놓은 시각. 밖에서 끝났으면 없음 */
  function finishDrag(droppedAt?: number) {
    detach()
    const d = sim.drag
    sim.drag = null
    setDragging(false)
    moveChip(0, 0, false)
    if (!d) return
    if (droppedAt !== undefined) land(d, droppedAt)
    else {
      sim.feel = [0.8, 0.32]
      sim.releasedAt = performance.now()
      if (sim.active >= 0) sim.drop.to = sim.starts[sim.active]
    }
    kick()
  }

  function onDragEnd() {
    finishDrag()
  }

  function onDragStart(e: ReactDragEvent<HTMLUListElement>) {
    const li = (e.target as HTMLElement).closest('li')
    const index = li && listRef.current ? [...listRef.current.children].indexOf(li) : -1
    if (index < 0) return
    e.dataTransfer.setDragImage(BLANK, 0, 0)
    begin(index, -1, e.clientX, e.clientY, true)
    setCarry(index)
    setDragging(true)
    detach()
    document.addEventListener('dragover', onDragOver, true)
    document.addEventListener('dragleave', onDragLeave, true)
    document.addEventListener('drop', onDrop, true)
    document.addEventListener('dragend', onDragEnd, true)
    sim.detach = () => {
      document.removeEventListener('dragover', onDragOver, true)
      document.removeEventListener('dragleave', onDragLeave, true)
      document.removeEventListener('drop', onDrop, true)
      document.removeEventListener('dragend', onDragEnd, true)
    }
    kick()
  }

  useEffect(
    // sim 은 렌더마다 같은 객체라 첫 렌더의 정리 함수로도 지금 붙은 리스너를 뗄 수 있다
    () => () => detach(),
    [],
  )

  return { listRef, dropRef, chipRef, anchorRefs: [anchorA, anchorB] as const, lit, dragging, carry, onPointerDown, onDragStart }
}
