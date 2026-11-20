// 홈 위젯 배치 규칙. 끌기 · 크기 조절 손놀림은 react-grid-layout 이 하고, 어디에 놓일지는 여기 규칙이 정한다.
//
// 기준 — 손댄 위젯과 그 자리에 있던 위젯만 움직인다(최소 이동). AWS Cloudscape Board · Android 홈 화면 · gridstack(float) 을 따랐다
// 1. 페이지마다 COLS × ROWS 칸. 위젯은 칸 정수 { x, y, w, h }. 놓은 자리에 그대로 있고, 빈칸도 그대로 남는다(저절로 끌어 올리지 않는다).
// 2. 끌어 다른 위젯을 덮으면: 덮인 위젯을 끄는 위젯이 떠난 자리로 통째로 옮기고(바꾸기), 안 들어가면 덮인 위젯마다 가장 가까운 빈칸으로 비킨다
//    — 먼저 떠난 자리와 간 자리를 아우르는 상자 안에서(먼 빈칸으로 튀지 않게).
//    크기가 달라 그대로 못 바꾸면(8칸을 16칸 자리로) 덮인 위젯을 떠난 자리 쪽으로 옮기고, 거기 걸리는 위젯만 가장 가까운 빈칸으로 보낸다.
//    그래도 안 되면 판 어디든 가장 가까운 빈칸으로. 덮인 위젯을 절반도 안 덮었거나 비킬 곳이 정말 없을 때만 놓을 수 없는 자리.
//    끌기 시작한 배치를 기준으로 매번 다시 계산하므로 손을 되돌리면 배치도 되돌아온다.
// 3. 크기 조절은 빈칸으로는 자유롭게. 이웃을 덮으면 이웃을 그쪽으로 밀고(크기 그대로), 밀 데가 없으면 이웃이 그쪽에서 줄어든다(이웃의 최소 크기까지,
//    분할 창처럼). 그것도 안 되면 가장 가까운 빈칸으로 비키고, 비킬 곳이 없으면 거기서 멈춘다.
// 4. 페이지 사이 이동 · 추가는 그 페이지에서 처음 들어가는 빈칸(위 → 아래, 왼쪽 → 오른쪽)에. 없으면 받지 않는다.
// 5. 빈칸 정리(tidy)는 사람이 누를 때만 — 읽는 순서대로 위 · 왼쪽으로 당겨 붙이고, 줄에 남은 가로 빈칸은 옆 위젯이 넓혀 채운다.
// 6. 위젯마다 최소 크기(px)를 지금 칸 크기로 칸 수(minW · minH)로 바꿔 지킨다. 그릴 크기(S · M · L · XL)는 칸이 그려진 px 로 정한다.
// React 없이 값만 다룬다.

import { bottom, collides } from 'react-grid-layout/core'
import { COLS, GAP, MAX_PER_PAGE, ROWS } from './constants.ts'

/** 위젯 하나의 자리 — i 는 위젯 type */
export interface Item {
  i: string
  x: number
  y: number
  w: number
  h: number
}
export type Page = Item[]

/** 그려진 크기 — 위젯이 내용을 얼마나 보여줄지 정한다. 칸이 이 크기(PX) 이상이면 그 크기로 그린다 */
export type WidgetSize = 's' | 'm' | 'l' | 'xl'
export const SIZES: WidgetSize[] = ['s', 'm', 'l', 'xl']
export const PX: Record<WidgetSize, { w: number; h: number }> = {
  s: { w: 320, h: 220 },
  m: { w: 560, h: 220 },
  l: { w: 560, h: 440 },
  xl: { w: 1000, h: 440 },
}

/** 위젯의 최소 크기(px) — 그릴 수 있는 크기 중 가장 작은 것 */
export const minSize = (sizes: WidgetSize[]) => PX[SIZES.find((s) => sizes.includes(s)) ?? 's']

/** 칸 크기(px)에 맞는 그릴 크기 — 들어가는 것 중 가장 큰 것, 하나도 안 들어가면 가장 작은 것 */
export function sizeFor(sizes: WidgetSize[], w: number, h: number): WidgetSize {
  const ok = SIZES.filter((s) => sizes.includes(s))
  return ok.filter((s) => PX[s].w <= w && PX[s].h <= h).at(-1) ?? ok.at(0) ?? 's'
}

/** 칸 n 개의 px — 칸 사이 틈 포함 */
export const span = (n: number, unit: number) => n * unit + (n - 1) * GAP
/** px 를 담는 데 필요한 칸 수(1 ~ max) */
export const cellsFor = (px: number, unit: number, max: number) => Math.min(max, Math.max(1, Math.ceil((px + GAP) / (unit + GAP) - 1e-6)))
/** 판 폭(px)에서 칸 한 개 폭 */
export const colWidth = (width: number) => (width - GAP * (COLS - 1)) / COLS
/** 판 높이(px)를 ROWS 행으로 나눈 행 높이 */
export const rowHeight = (height: number) => (height - GAP * (ROWS - 1)) / ROWS

/** 이 페이지가 기준에 맞는지 — 위젯 수 상한, 아래로 ROWS 안 */
export const fits = (page: Page) => page.length <= MAX_PER_PAGE && bottom(page) <= ROWS

/** 읽는 순서 — 위 → 아래, 같은 행이면 왼쪽 → 오른쪽 */
export const reading = (a: Item, b: Item) => a.y - b.y || a.x - b.x

/** 두 자리가 겹친 칸 수 */
const overlap = (a: Item, b: Item) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
const inside = (c: Item) => c.x >= 0 && c.y >= 0 && c.x + c.w <= COLS && c.y + c.h <= ROWS
/** c 가 판 안이고 taken 의 다른 위젯과 안 겹치는지 */
const free = (taken: Item[], c: Item) => inside(c) && !taken.some((t) => t.i !== c.i && overlap(t, c) > 0)

/** 두 자리를 아우르는 상자 */
function around(a: Item, b: Item): Item {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return { i: '', x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }
}

/** 기준에 맞는 페이지인지 — 위젯 수 상한, 판 안, 서로 안 겹침 */
export const valid = (page: Page) => fits(page) && page.every((c, k) => free(page.slice(k + 1), c))

/** taken 을 피해 c 가 들어갈 첫 빈칸(읽는 순서). 없으면 null */
function firstFree<T extends Item>(taken: Item[], c: T): T | null {
  for (let y = 0; y + c.h <= ROWS; y++) for (let x = 0; x + c.w <= COLS; x++) if (free(taken, { ...c, x, y })) return { ...c, x, y }
  return null
}

/** taken 을 피해 c 가 들어갈, 지금 자리에서 가장 가까운 빈칸 — box 를 주면 그 안에서만. 없으면 null */
function nearest<T extends Item>(taken: Item[], c: T, box?: Item): T | null {
  let best: T | null = null
  let d = Infinity
  for (let y = 0; y + c.h <= ROWS; y++)
    for (let x = 0; x + c.w <= COLS; x++) {
      const k = (x - c.x) ** 2 + (y - c.y) ** 2
      const at = { ...c, x, y }
      if (k < d && (!box || overlap(at, box) === c.w * c.h) && free(taken, at)) [best, d] = [at, k]
    }
  return best
}

/**
 * 위젯 to.i 를 to 자리(크기 포함)로 — 손댄 위젯과 그 자리에 있던 위젯만 움직인다. page 에 없던 위젯이면 새로 놓는다.
 * drag 는 끌기(바꾸기 · 절반 기준을 쓴다), 아니면 크기 조절(이웃을 밀거나 줄인다 — 이웃의 minW · minH 가 있으면 그만큼은 남긴다). 놓을 수 없는 자리면 null.
 * react-grid-layout 이 붙인 것(minW 등)은 그대로 둔다
 */
export function place<T extends Item>(page: T[], to: T, drag = true): T[] | null {
  const next = settle(page, to, drag)
  if (next || !drag) return next
  // 절반 넘게 덮었는데 손 아래 자리에 안 맞으면 덮인 위젯 자리에 맞춰 본다 — 다 덮을 때까지 끌지 않아도 바뀐다
  const hit = page.filter((c) => c.i !== to.i && overlap(c, to) > 0)
  const b = hit.length && hit.every((c) => enough(c, to)) ? hit.reduce<Item>(around, hit[0]) : null
  const aligned = b && (b.x !== to.x || b.y !== to.y) ? settle(page, { ...to, x: b.x, y: b.y }, drag) : null
  // 마지막으로 — 덮인 위젯을 판 어디든 가장 가까운 빈칸으로
  return aligned ?? settle(page, to, drag, true)
}

/** 끝만 걸친 것은 바꾸려는 뜻으로 보지 않는다 — 둘 중 작은 쪽의 절반은 덮어야 */
const enough = (c: Item, to: Item) => overlap(c, to) * 2 >= Math.min(c.w * c.h, to.w * to.h)

/** far 면 끌기에서 덮인 위젯을 판 어디든 가장 가까운 빈칸으로도 보낸다(마지막 수단) */
function settle<T extends Item>(page: T[], to: T, drag: boolean, far = false): T[] | null {
  if (!inside(to)) return null
  const from = page.find((c) => c.i === to.i)
  const rest = page.filter((c) => c !== from)
  const hit = rest.filter((c) => overlap(c, to) > 0)
  if (!hit.length) return [...rest, to]
  const taken = [...rest.filter((c) => !hit.includes(c)), to]
  if (!drag) return scatter(taken, hit, (t, c) => yieldTo(t, c, to) ?? nearest(t, c))
  if (!hit.every((c) => enough(c, to))) return null
  if (from) {
    // 바꾸기 — 덮인 위젯들을 놓인 모양 그대로 떠난 자리로
    const moved = hit.map((c) => ({ ...c, x: c.x + from.x - to.x, y: c.y + from.y - to.y }))
    if (moved.every((c) => free(taken, c))) return [...taken, ...moved]
    // 가까운 빈칸으로 — 떠난 자리와 간 자리를 아우르는 상자 안에서만(Cloudscape 의 boundaries 점수)
    const near = scatter(taken, hit, (t, c) => nearest(t, c, around(from, to)))
    if (near) return near
    // 크기가 달라 못 바꾸면 — 덮인 위젯은 떠난 자리 쪽으로 옮기고, 거기 걸리는 위젯만 가장 가까운 빈칸으로
    if (moved.every((c) => inside(c) && overlap(c, to) === 0)) {
      const out = taken.filter((t) => t !== to && moved.some((m) => overlap(m, t) > 0))
      const pushed = scatter([...taken.filter((t) => !out.includes(t)), ...moved], out, (t, c) => nearest(t, c))
      if (pushed) return pushed
    }
  }
  return far || !from ? scatter(taken, hit, (t, c) => nearest(t, c)) : null
}

/** cs 를 taken 을 피해 하나씩 놓는다(spot 이 자리를 고른다) — 큰 위젯부터(작은 것이 먼저 큰 빈칸을 쪼개지 않게). 하나라도 못 놓으면 null */
function scatter<T extends Item>(taken: T[], cs: T[], spot: (taken: Item[], c: T) => T | null): T[] | null {
  const out = [...taken]
  for (const c of [...cs].sort((a, b) => b.w * b.h - a.w * a.h)) {
    const at = spot(out, c)
    if (!at) return null
    out.push(at)
  }
  return out
}

/**
 * 크기 조절로 덮인 이웃 c 를 to 밖으로 — 덜 겹친 쪽(가로 · 세로)으로 밀어 보고(크기 그대로), 안 되면 그쪽에서 줄인다.
 * 줄여도 react-grid-layout 이 붙인 이웃의 최소 크기(minW · minH)는 지킨다. 둘 다 안 되면 null
 */
function yieldTo<T extends Item & { minW?: number; minH?: number }>(taken: Item[], c: T, to: Item): T | null {
  const dx = c.x + c.w / 2 >= to.x + to.w / 2 ? to.x + to.w - c.x : to.x - (c.x + c.w)
  const dy = c.y + c.h / 2 >= to.y + to.h / 2 ? to.y + to.h - c.y : to.y - (c.y + c.h)
  const across = Math.abs(dx) <= Math.abs(dy)
  const pushed = across ? { ...c, x: c.x + dx } : { ...c, y: c.y + dy }
  if (free(taken, pushed)) return pushed
  const cut = across ? (dx > 0 ? { ...c, x: c.x + dx, w: c.w - dx } : { ...c, w: c.w + dx }) : dy > 0 ? { ...c, y: c.y + dy, h: c.h - dy } : { ...c, h: c.h + dy }
  return cut.w >= (c.minW ?? 1) && cut.h >= (c.minH ?? 1) && free(taken, cut) ? cut : null
}

/**
 * 빈칸 정리 — 읽는 순서대로 위젯마다 처음 들어가는 자리(위 → 아래, 왼쪽 → 오른쪽)에 놓는다.
 * 앞에 빈칸이 있으면 그 뒤 위젯 중 들어가는 것이 올라와 채운다(CSS grid 의 auto-flow dense 와 같다).
 * 그래도 남는 가로 빈칸은 옆 위젯이 다른 위젯 · 판 끝에 닿을 때까지 넓혀 채운다. 높이는 안 바꾼다
 */
export function tidy(page: Page): Page {
  const placed: Item[] = []
  for (const c of [...page].sort(reading)) {
    const w = Math.min(c.w, COLS)
    let at = { x: 0, y: 0 }
    find: for (let y = 0; ; y++)
      for (let x = 0; x + w <= COLS; x++)
        if (!placed.some((p) => collides(p, { i: '', x, y, w, h: c.h }))) {
          at = { x, y }
          break find
        }
    placed.push({ i: c.i, ...at, w, h: c.h })
  }
  for (const c of placed) {
    const r = reach(placed, c.i)
    c.x = r.x0
    c.w = r.x1 - r.x0
  }
  return page.map((c) => placed.find((p) => p.i === c.i) ?? c)
}

/** react-grid-layout 이 붙이는 것(moved · static · minW 등)을 떼고 자리만 남긴다 — 저장하는 모양 */
export const strip = (page: Page): Page => page.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }))

/** 모든 페이지에서 i 를 뺀다 — 빈자리는 그대로, 빈 페이지는 지운다 */
export const without = (pages: Page[], i: string) => pages.map((p) => p.filter((c) => c.i !== i)).filter((p) => p.length)

/**
 * 위젯 i 를 페이지 p 의 첫 빈칸에 — 다른 페이지에 있으면 거기서 빠진다(옮기기). p 가 페이지 수면 끝에 새 페이지.
 * size 는 새로 넣을 때의 크기, 이미 있으면 그 크기 그대로. 들어갈 자리가 없으면 null
 */
export function placeOn(pages: Page[], i: string, p: number, size: { w: number; h: number }): Page[] | null {
  const cur = pages.flat().find((c) => c.i === i) ?? { i, x: 0, y: 0, ...size }
  const [rest, q] = lift(pages, i, p)
  const page = rest[q] ?? []
  const at = page.length < MAX_PER_PAGE ? firstFree(page, { ...cur }) : null
  if (!at) return null
  rest[q] = [...page, at]
  return rest
}

/**
 * 위젯 i 를 페이지 p 의 (x, y) 자리로(판 안으로 당긴다, 크기 그대로) — 끌어서 옆 페이지로 넘어갈 때 손 아래 자리에 놓는다.
 * 덮인 위젯은 끌어 놓을 때처럼 비킨다(place). 안 되면 null — 그때는 placeOn 으로 첫 빈칸에
 */
export function placeAt(pages: Page[], i: string, p: number, x: number, y: number): Page[] | null {
  const cur = pages.flat().find((c) => c.i === i)
  if (!cur) return null
  const [rest, q] = lift(pages, i, p)
  const page = rest[q] ?? []
  const next = page.length < MAX_PER_PAGE ? place(page, { ...cur, x: Math.max(0, Math.min(COLS - cur.w, x)), y: Math.max(0, Math.min(ROWS - cur.h, y)) }) : null
  if (!next) return null
  rest[q] = next
  return rest
}

/** 모든 페이지에서 i 를 빼고, 그 때문에 p 앞의 페이지가 없어졌으면 p 를 하나 당긴다 */
function lift(pages: Page[], i: string, p: number): [Page[], number] {
  const rest = without(pages, i)
  const from = pages.findIndex((pg) => pg.some((c) => c.i === i))
  return [rest, rest.length < pages.length && from < p ? p - 1 : p]
}

/** 키보드로 옮기기 — (dx, dy) 쪽으로 한 칸씩 더 가 보며 처음 놓을 수 있는 자리로(이웃과 바꾸기 포함). 더 갈 데가 없으면 null */
export function nudge(page: Page, i: string, dx: number, dy: number): Page | null {
  const item = page.find((c) => c.i === i)
  if (!item) return null
  for (let k = 1; k <= Math.max(COLS, ROWS); k++) {
    const to = { ...item, x: item.x + dx * k, y: item.y + dy * k }
    if (!inside(to)) return null
    const next = place(page, to)
    if (next) return next
  }
  return null
}

/** 키보드로 크기 한 칸 — min 이상 · 판 안. 이웃이 비킬 곳이 없으면 null */
export function grow(page: Page, i: string, dw: number, dh: number, min: { w: number; h: number }): Page | null {
  const item = page.find((c) => c.i === i)
  if (!item) return null
  const w = Math.max(min.w, Math.min(COLS - item.x, item.w + dw))
  const h = Math.max(min.h, Math.min(ROWS - item.y, item.h + dh))
  return place(page, { ...item, w, h }, false)
}

const isItem = (c: unknown): c is Item => {
  const v = c as Item | null | undefined
  return typeof v?.i === 'string' && [v.x, v.y, v.w, v.h].every((n) => Number.isInteger(n) && n >= 0) && v.w >= 1 && v.h >= 1 && v.x + v.w <= COLS && v.y + v.h <= ROWS
}

/** 저장해 둔 배치(페이지마다 위젯 자리). 모양이 하나라도 틀리거나 겹치면 null — 반쯤 살린 배치는 홈을 깨뜨린다 */
export function parsePages(saved: unknown): Page[] | null {
  return Array.isArray(saved) && saved.every((p) => Array.isArray(p) && p.every(isItem) && valid(p)) ? (saved as Page[]) : null
}

/** 12 × 6 칸으로 저장하던 배치를 지금 칸(24 × 12)으로 — 칸이 반으로 잘게 나뉘어 모두 두 배. 모양이 틀리면 null */
export function fromHalf(saved: unknown): Page[] | null {
  const pages = parsePages(saved)
  return pages?.map((p) => p.map((c) => ({ i: c.i, x: c.x * 2, y: c.y * 2, w: c.w * 2, h: c.h * 2 }))) ?? null
}

/** 위젯 i 가 지금 자리에서 다른 위젯이나 판 끝에 닿기 전까지 넓힐 수 있는 칸 경계 — 왼쪽 x0 · 오른쪽 x1 · 위 y0 · 아래 y1(지금 높이 · 폭으로) */
export function reach(page: Page, i: string): { x0: number; x1: number; y0: number; y1: number } {
  const c = page.find((x) => x.i === i)
  if (!c) return { x0: 0, x1: COLS, y0: 0, y1: ROWS }
  const rest = page.filter((x) => x !== c)
  const row = rest.filter((o) => o.y < c.y + c.h && c.y < o.y + o.h)
  const col = rest.filter((o) => o.x < c.x + c.w && c.x < o.x + o.w)
  return {
    x0: Math.max(0, ...row.filter((o) => o.x + o.w <= c.x).map((o) => o.x + o.w)),
    x1: Math.min(COLS, ...row.filter((o) => o.x >= c.x + c.w).map((o) => o.x)),
    y0: Math.max(0, ...col.filter((o) => o.y + o.h <= c.y).map((o) => o.y + o.h)),
    y1: Math.min(ROWS, ...col.filter((o) => o.y >= c.y + c.h).map((o) => o.y)),
  }
}

/** 기준선 — vertical 이면 세로선(x = at), 아니면 가로선(y = at). end 는 위젯의 끝 변(오른쪽 · 아래)인지. from ~ to 는 선이 걸치는 칸 */
export interface Guide {
  vertical: boolean
  at: number
  end: boolean
  from: number
  to: number
}

/** 위젯의 변 — 왼쪽 · 오른쪽 · 위 · 아래 */
export type Side = 'l' | 'r' | 't' | 'b'

/**
 * 위젯 i 의 sides 변 중 다른 위젯의 같은 쪽 변과 나란한 것마다 기준선(피그마처럼) — 왼쪽끼리 · 오른쪽끼리 · 위끼리 · 아래끼리.
 * sides 는 사람이 지금 맞추는 변만(크기 조절이면 잡은 변, 끌기면 움직인 쪽) — 네 변을 다 그으면 선이 너무 많다.
 * 판 끝에 붙은 변은 늘 나란하니 뺀다. 높이가 같은 이웃에 아래 변을 맞추면 아래 한 줄이 그어진다
 */
export function guides(page: Page, i: string, sides: Side[]): Guide[] {
  const c = page.find((x) => x.i === i)
  if (!c) return []
  const out: Guide[] = []
  for (const vertical of [true, false]) {
    const max = vertical ? COLS : ROWS
    const edges = (o: Item): [number, boolean][] => (vertical ? [[o.x, false], [o.x + o.w, true]] : [[o.y, false], [o.y + o.h, true]])
    for (const [at, end] of edges(c)) {
      if (at === 0 || at === max || !sides.includes(vertical ? (end ? 'r' : 'l') : end ? 'b' : 't')) continue
      const same = page.filter((o) => o !== c && edges(o).some(([a, e]) => a === at && e === end))
      if (!same.length) continue
      const across = [c, ...same].map((o) => (vertical ? [o.y, o.y + o.h] : [o.x, o.x + o.w]))
      out.push({ vertical, at, end, from: Math.min(...across.map((r) => r[0])), to: Math.max(...across.map((r) => r[1])) })
    }
  }
  return out
}

/** 예전 형식(페이지마다 줄 목록 — 줄 높이 h · 위젯 폭 w 가 3 × 3 칸 비율)을 칸 자리로. 모양이 틀리면 null */
export function fromRows(saved: unknown): Page[] | null {
  interface Row { h: number; items: { type: string; w: number }[] }
  const ok = (n: unknown): n is number => typeof n === 'number' && n > 0 && Number.isFinite(n)
  const isRow = (r: Row | null) => ok(r?.h) && Array.isArray(r.items) && r.items.length > 0 && r.items.every((c: Row['items'][number] | null) => typeof c?.type === 'string' && ok(c.w))
  if (!Array.isArray(saved) || !saved.length) return null
  const pages = (saved.every((p) => !Array.isArray(p)) ? [saved] : saved) as Row[][]
  if (!pages.every((p) => Array.isArray(p) && p.every(isRow))) return null
  const out = pages.map((rows) => {
    const page: Page = []
    let y = 0
    for (const r of rows) {
      const h = Math.max(1, Math.round((r.h * ROWS) / 3))
      if (y + h > ROWS) break
      let x = 0
      for (const c of r.items) {
        const w = Math.min(COLS - x, Math.max(1, Math.round((c.w * COLS) / 3)))
        if (w < 1) break
        page.push({ i: c.type, x, y, w, h })
        x += w
      }
      y += h
    }
    return tidy(page)
  })
  // 판에 안 들어가 잘린 위젯은 새 페이지로
  const lost = pages.flat().flatMap((r) => r.items).filter((c) => !out.flat().some((p) => p.i === c.type))
  return lost.reduce<Page[]>((all, c) => placeOn(all, c.type, Math.max(0, all.length - 1), { w: COLS / 3, h: ROWS / 3 }) ?? placeOn(all, c.type, all.length, { w: COLS / 3, h: ROWS / 3 }) ?? all, out)
}
