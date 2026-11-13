import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { project, rubberband, settle, snap, spring, step } from '../lib/spring'
import { motionOff } from '../lib/theme'

interface Options {
  /** 지금 화면의 메뉴 순번. 메뉴에 없는 화면이면 -1 */
  active: number
  /** 물방울이 다른 메뉴에 닿거나 그 위에 놓였을 때 — 그 화면으로 옮긴다 */
  onCommit: (index: number) => void
}

interface Drag {
  /** 터치는 포인터 id, 마우스(브라우저 끌어놓기)는 -1 */
  id: number
  startX: number
  startY: number
  listTop: number
  /** 잡은 자리 — 메뉴 위쪽 끝에서 손가락까지 */
  offset: number
  live: boolean
  /** 사이드바 안에 있는지. 밖이면 방울은 제자리로 돌아가고 링크 칩이 커서를 따라간다 */
  inside: boolean
  to: number
  history: { t: number; y: number }[]
}

const DRAG_START = 6
const reduceMotion = motionOff

// 브라우저 기본 끌기 그림은 숨기고 방울 · 링크 칩으로 대신 보여준다
const BLANK = new Image()
BLANK.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

/**
 * 세로 메뉴의 '물방울' 선택 표시.
 * - drop: 손가락을 따라다니는 방울 (속도만큼 늘어난다)
 * - anchor 두 개: 메뉴 자리에 맺힌 방울. 방울이 떠나면 줄어들며 떨어져 나가고, 새 자리에서는 새로 맺힌다.
 * 셋을 goo 필터로 한 겹에 그려서 가까우면 이어지고 멀어지면 끊어진다.
 *
 * 마우스는 브라우저 끌어놓기를 그대로 쓴다 — 사이드바 안에서는 방울이 따라오고,
 * 밖으로 나가면 평소처럼 링크를 탭 바 · 북마크 · 바탕화면에 놓을 수 있다. 터치는 포인터로 직접 끈다.
 * 매 프레임은 React 를 거치지 않고 style 만 바꾼다.
 */
export function useLiquidNav({ active, onCommit }: Options) {
  const listRef = useRef<HTMLUListElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const anchorA = useRef<HTMLDivElement>(null)
  const anchorB = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLDivElement>(null)
  const commitRef = useRef(onCommit)
  commitRef.current = onCommit
  const [lit, setLit] = useState(active)
  const [dragging, setDragging] = useState(false)
  /** 사이드바 밖으로 들고 나간 메뉴 — 링크 칩에 보여준다 */
  const [carry, setCarry] = useState(-1)

  const sim = useRef({
    tops: [] as number[],
    height: 0,
    drop: spring(0),
    lift: spring(1),
    anchors: [spring(active >= 0 ? 1 : 0), spring(0)],
    anchorY: [0, 0],
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

  /** 방울이 손가락을 따라가는 중인가 (끄는 중이고 사이드바 안) */
  const following = () => !!sim.drag?.live && sim.drag.inside

  function measure() {
    const list = listRef.current
    if (!list) return
    const items = [...list.children] as HTMLElement[]
    sim.tops = items.map((li) => li.offsetTop)
    sim.height = items[0]?.offsetHeight ?? 0
    for (const el of [dropRef.current, anchorA.current, anchorB.current]) {
      if (!el) continue
      el.style.width = `${list.clientWidth}px`
      el.style.height = `${sim.height}px`
    }
  }

  function render() {
    const { drop, lift, anchors, anchorY, height } = sim
    const stretch = reduceMotion() ? 0 : Math.min(Math.abs(drop.v) / 2500, 0.22)
    const el = dropRef.current
    if (el) {
      el.style.transform = `translate3d(0,${drop.x}px,0) scale(${lift.x * (1 - stretch * 0.5)},${lift.x * (1 + stretch)})`
      el.style.opacity = sim.active < 0 && !following() ? '0' : '1'
    }
    ;[anchorA.current, anchorB.current].forEach((a, i) => {
      if (a) a.style.transform = `translate3d(0,${anchorY[i]}px,0) scale(${0.5 + 0.5 * anchors[i].x},${anchors[i].x})`
    })

    // 방울 가운데가 어느 메뉴 위에 있는지 — 그 메뉴 글자를 흰색으로
    let near = -1
    if (sim.active >= 0 || following()) {
      const center = drop.x + height / 2
      let best = Infinity
      sim.tops.forEach((top, i) => {
        const d = Math.abs(top + height / 2 - center)
        if (d < best) [best, near] = [d, i]
      })
      if (best > height * 0.6) near = -1
    }
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
    const { drop, lift, anchors, drag, height } = sim
    const reduce = reduceMotion()

    if (following()) {
      drop.to = drag!.to
      step(drop, dt, 1, 0.1)
    } else {
      // 사이드바 밖으로 나갔으면 방울은 제자리로 돌아온다
      if (drag?.live && sim.active >= 0) drop.to = sim.tops[sim.active]
      step(drop, dt, ...sim.feel)
    }
    lift.to = following() ? 1.06 : 1
    step(lift, dt, 1, 0.25)
    anchors.forEach((a, i) => {
      // 지금 자리의 방울은 떠난 방울과의 거리만큼 줄어들고, 떠나는 자리의 방울은 사라진다
      a.to = i === sim.current && sim.active >= 0 ? Math.max(0, 1 - Math.abs(drop.x - sim.anchorY[i]) / (height || 1)) : 0
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

  // 처음 그릴 때 · 크기가 바뀔 때(사이드바 접기) 바로 제자리에
  useLayoutEffect(() => {
    measure()
    if (sim.active >= 0) {
      snap(sim.drop, sim.tops[sim.active])
      sim.anchorY[sim.current] = sim.tops[sim.active]
    }
    render()
    const list = listRef.current
    if (!list) return
    const ro = new ResizeObserver(() => {
      measure()
      if (!sim.drag?.live && sim.active >= 0) {
        sim.drop.to = sim.tops[sim.active]
        sim.anchorY[sim.current] = sim.tops[sim.active]
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
      sim.anchorY[sim.current] = sim.tops[active]
      snap(sim.anchors[sim.current], 0)
      if (prev < 0 && !following()) snap(sim.drop, sim.tops[active])
      sim.drop.to = sim.tops[active]
      // 끌어서 놓은 게 아니라 눌러서 옮긴 경우 — 튕김 없이 부드럽게
      if (performance.now() - sim.releasedAt > 120) sim.feel = [0.9, 0.38]
    }
    kick()
  }, [active])

  /** 끌기 시작 — 누른 메뉴와 잡은 자리를 기억한다 */
  function begin(index: number, id: number, x: number, y: number, live: boolean) {
    measure()
    const listTop = listRef.current!.getBoundingClientRect().top
    if (sim.active < 0) snap(sim.drop, sim.tops[index])
    sim.drag = { id, startX: x, startY: y, listTop, offset: y - listTop - sim.tops[index], live, inside: true, to: sim.tops[index], history: [] }
  }

  /** 손가락 높이를 방울 목표로 — 끝을 넘으면 고무줄처럼 */
  function follow(d: Drag, clientY: number, t: number) {
    const max = sim.tops[sim.tops.length - 1] ?? 0
    let y = clientY - d.listTop - d.offset
    if (y < 0) y = -rubberband(-y, sim.height)
    if (y > max) y = max + rubberband(y - max, sim.height)
    d.to = y
    d.history.push({ t, y })
    while (d.history.length > 2 && t - d.history[0].t > 100) d.history.shift()
  }

  /** 놓기 — 놓는 순간 속도를 넘겨받고, 그 속도로 멈출 자리에 가장 가까운 메뉴로 */
  function land(d: Drag) {
    const h = d.history
    const v = h.length > 1 ? ((h[h.length - 1].y - h[0].y) / Math.max(1, h[h.length - 1].t - h[0].t)) * 1000 : 0
    const aim = d.to + project(v)
    let target = 0
    sim.tops.forEach((top, i) => {
      if (Math.abs(top - aim) < Math.abs(sim.tops[target] - aim)) target = i
    })
    sim.drop.v = v
    sim.feel = [0.8, 0.32]
    sim.releasedAt = performance.now()
    if (target !== sim.active) commitRef.current(target)
    else sim.drop.to = sim.tops[target]
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
    follow(d, e.clientY, e.timeStamp)
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
    land(d)
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
    const box = listRef.current?.closest('aside')?.getBoundingClientRect()
    d.inside = !!box && e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom
    if (d.inside) {
      // 사이드바는 놓을 수 있는 자리 — 금지 표시 대신 옮기기 커서
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
      follow(d, e.clientY, e.timeStamp)
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
    // 사이드바 위에 놓으면 주소로 이동하지 않고 그 메뉴로
    if (!sim.drag?.inside) return
    e.preventDefault()
    finishDrag(true)
  }

  function finishDrag(dropped: boolean) {
    detach()
    const d = sim.drag
    sim.drag = null
    setDragging(false)
    moveChip(0, 0, false)
    if (!d) return
    if (dropped) land(d)
    else {
      sim.feel = [0.8, 0.32]
      sim.releasedAt = performance.now()
      if (sim.active >= 0) sim.drop.to = sim.tops[sim.active]
    }
    kick()
  }

  function onDragEnd() {
    finishDrag(false)
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
