// 홈 위젯 배치 계산. 홈은 여러 줄이고, 줄마다 위젯이 폭을 나눠 가진다(비율 w). 줄들은 높이를 나눠 가진다(비율 h).
// 위젯을 어떤 줄에 넣으면 그 줄의 위젯들이 좁아지며 자리가 생긴다 — 위젯마다 최소 폭 · 높이까지만.
// 페이지는 COLS 칸 × ROWS 줄로 본다(비율 1 = 한 칸). 비율 합이 그보다 작은 줄 · 페이지는 다 채우지 않고 칸 크기대로 둔다
// — 새 페이지에 하나만 놓은 위젯이 화면 전체로 커지지 않게. 합이 넘치면 그때부터 비율대로 나눠 채운다.
// React 없이 값만 다룬다.

/** 그려진 크기 — 위젯이 내용을 얼마나 보여줄지 정한다. 사람이 고르지 않고, 칸이 이 크기(PX) 이상이면 그 크기로 그린다 */
export type WidgetSize = 's' | 'm' | 'l' | 'xl'
export const SIZES: WidgetSize[] = ['s', 'm', 'l', 'xl']
export const PX: Record<WidgetSize, { w: number; h: number }> = {
  s: { w: 320, h: 220 },
  m: { w: 560, h: 220 },
  l: { w: 560, h: 440 },
  xl: { w: 1000, h: 440 },
}

/** 위젯의 최소 크기 — 그릴 수 있는 크기 중 가장 작은 것 */
export const minSize = (sizes: WidgetSize[]) => PX[SIZES.find((s) => sizes.includes(s)) ?? 's']

/** 칸 크기(px)에 맞는 그릴 크기 — 들어가는 것 중 가장 큰 것, 하나도 안 들어가면 가장 작은 것 */
export function sizeFor(sizes: WidgetSize[], w: number, h: number): WidgetSize {
  const ok = SIZES.filter((s) => sizes.includes(s))
  return ok.filter((s) => PX[s].w <= w && PX[s].h <= h).at(-1) ?? ok[0] ?? 's'
}

export const COLS = 3
export const ROWS = 3
const EPS = 1e-6

/**
 * 비율 → 그려지는 크기(px). total 은 줄 폭(또는 페이지 높이), n 은 COLS(또는 ROWS).
 * 합이 n 이하면 한 칸 = (total - (n-1)·gap) / n 이고 비율 w 는 w 칸 + 그 사이 틈 — 칸이 줄마다 같은 자리에 맞는다.
 * 합이 n 을 넘으면 틈을 뺀 나머지를 비율대로 나눈다.
 */
export function spans(shares: number[], total: number, gap: number, n: number): number[] {
  const sum = shares.reduce((a, b) => a + b, 0)
  if (sum > n + EPS) return shares.map((s) => ((total - gap * (shares.length - 1)) * s) / sum)
  const unit = unitOf(total, gap, n)
  return shares.map((s) => s * unit - gap)
}
/** 칸 하나 + 틈 하나(px) — 다 채우지 않는 줄에서 비율 1 이 차지하는 만큼 */
export const unitOf = (total: number, gap: number, n: number) => (total - gap * (n - 1)) / n + gap
/** 비율 합이 칸 수를 넘어 비율대로 나눠 채우는지 */
export const packed = (shares: number[], n: number) => shares.reduce((a, b) => a + b, 0) > n + EPS

/** 홈 한 화면에 둘 수 있는 위젯 수 상한 — 화면이 넓어도 이보다 많으면 한눈에 안 들어온다 */
export const MAX_WIDGETS = 12
export interface Cell {
  type: string
  /** 줄 안에서 차지하는 폭 비율 */
  w: number
}

export interface Row {
  /** 홈 안에서 차지하는 높이 비율 */
  h: number
  items: Cell[]
}

/** 놓을 곳 — 줄 row 의 index 번째(그 줄의 다른 위젯 기준 — 옮기는 위젯은 빼고 센다), 또는 newRow 번째에 새 줄 */
export type Target = { row: number; index: number } | { newRow: number }

/** 위젯 판의 크기 */
export interface Box {
  width: number
  height: number
  gap: number
}

export type Mins = (type: string) => { w: number; h: number }

export const count = (rows: Row[]) => rows.reduce((n, r) => n + r.items.length, 0)
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 1)
const rowMinH = (r: Row, mins: Mins) => Math.max(...r.items.map((c) => mins(c.type).h))

export function without(rows: Row[], type: string): Row[] {
  return rows.map((r) => ({ ...r, items: r.items.filter((c) => c.type !== type) })).filter((r) => r.items.length)
}

/**
 * type 을 target 에 넣는다. 이미 홈에 있으면 원래 자리에서 빠진다(옮기기).
 * 줄에 넣으면 그 줄의 다른 위젯 평균 폭만큼 — 모두 같은 몫으로 나눠 가진다. 새 줄은 다른 줄 평균 높이.
 */
export function put(rows: Row[], type: string, target: Target): Row[] {
  // 빈 줄은 넣은 뒤에 지운다 — 먼저 지우면 target 의 줄 번호가 어긋난다
  const next = rows.map((r) => ({ ...r, items: r.items.filter((c) => c.type !== type) }))
  if ('newRow' in target) {
    next.splice(target.newRow, 0, { h: avg(rows.map((r) => r.h)), items: [{ type, w: 1 }] })
  } else {
    const r = next[target.row]
    r.items.splice(target.index, 0, { type, w: avg(r.items.map((c) => c.w)) })
  }
  return next.filter((r) => r.items.length)
}

/** 키보드로 한 칸 — 좌우는 줄 안에서, 위아래는 옆 줄 끝으로(맨 위 · 아래면 새 줄). 못 가면 null */
export function step(rows: Row[], type: string, dx: number, dy: number): Target | null {
  const row = rows.findIndex((r) => r.items.some((c) => c.type === type))
  if (row < 0) return null
  const index = rows[row].items.findIndex((c) => c.type === type)
  if (dx) {
    const to = index + dx
    return to < 0 || to >= rows[row].items.length ? null : { row, index: to }
  }
  const to = row + dy
  // 혼자인 줄에서 바깥으로 새 줄을 만들면 제자리다
  if (to < 0 || to >= rows.length) return rows[row].items.length > 1 ? { newRow: to < 0 ? 0 : rows.length } : null
  return { row: to, index: rows[to].items.length }
}

/** 판에 들어가는지 — 위젯 수 상한, 줄마다 최소 폭의 합, 줄 최소 높이의 합 */
export function fitsBox(rows: Row[], box: Box, mins: Mins): boolean {
  if (count(rows) > MAX_WIDGETS) return false
  const height = rows.reduce((s, r) => s + rowMinH(r, mins), 0) + box.gap * (rows.length - 1)
  return height <= box.height && rows.every((r) => r.items.reduce((s, c) => s + mins(c.type).w, 0) + box.gap * (r.items.length - 1) <= box.width)
}

/**
 * 누르기만 해서 추가할 때의 자리 — 남는 폭이 가장 큰 줄의 끝, 줄마다 꽉 찼으면 맨 아래 새 줄. 어디에도 안 들어가면 null.
 */
export function bestSpot(rows: Row[], type: string, box: Box, mins: Mins): Target | null {
  const spare = (r: Row) => box.width - r.items.reduce((s, c) => s + mins(c.type).w + box.gap, 0)
  const order = rows.map((_, i) => i).sort((a, b) => spare(rows[b]) - spare(rows[a]))
  for (const i of order) {
    const t = { row: i, index: rows[i].items.length }
    if (fitsBox(put(rows, type, t), box, mins)) return t
  }
  const t = { newRow: rows.length }
  return fitsBox(put(rows, type, t), box, mins) ? t : null
}

/**
 * 경계 끌기 — 이웃한 두 칸(위젯 둘 또는 줄 둘)의 비율을 d(px)만큼 옮긴다. 각자 최소 크기 아래로는 줄지 않는다.
 * a · b 는 지금 비율, pa · pb 는 지금 그려진 크기(px). 둘의 비율 합은 그대로다.
 * unit 을 주면(다 채우지 않는 줄 — spans 참고) 크기와 비율이 비례하지 않으므로 칸 크기로 바꾼다.
 */
export function split(a: number, b: number, pa: number, pb: number, d: number, minA: number, minB: number, unit = 0, gap = 0): [number, number] {
  const total = pa + pb
  const na = Math.min(total - minB, Math.max(minA, pa + d))
  const wa = unit ? (na + gap) / unit : ((a + b) * na) / total
  return [wa, a + b - wa]
}

/** 끝 경계 끌기 — 다 채우지 않는 줄의 마지막 위젯(또는 페이지의 마지막 줄)을 d(px)만큼 키우고 줄인다. min ~ max(px) 사이로 */
export const grow = (p: number, d: number, min: number, max: number, unit: number, gap: number) => (Math.min(max, Math.max(min, p + d)) + gap) / unit

/** 비율 shares 를 total(px)에 나눴을 때 mins 아래로 내려가는 칸은 최소로 묶고, 모자란 만큼을 나머지가 비율대로 내준다. 비율 합은 그대로 */
function clampShares(shares: number[], total: number, mins: number[]): number[] {
  const sum = shares.reduce((a, b) => a + b, 0)
  const pinned = new Set<number>()
  let px = shares.map((s) => (total * s) / sum)
  for (;;) {
    const low = px.findIndex((p, i) => !pinned.has(i) && p < mins[i] - 0.5)
    if (low < 0 || pinned.size === px.length - 1) break
    px.forEach((p, i) => !pinned.has(i) && p < mins[i] - 0.5 && pinned.add(i))
    const fixed = [...pinned].reduce((s, i) => s + mins[i], 0)
    const free = px.reduce((s, p, i) => s + (pinned.has(i) ? 0 : p), 0)
    px = px.map((p, i) => (pinned.has(i) ? mins[i] : (p * (total - fixed)) / free))
  }
  return px.map((p) => (p * sum) / total)
}

/**
 * 판에 그렸을 때 최소 폭 · 높이보다 작아지는 위젯 · 줄이 없게 비율을 고친다 (넣기 · 새 줄은 평균 몫으로 들어와 이웃을 최소 아래로 밀 수 있다).
 * 다 채우지 않는 줄은 최소 크기만큼 칸을 늘리고, 그러다 칸 수를 넘으면 비율대로 나눠 채운다.
 */
export function settle(rows: Row[], box: Box, mins: Mins): Row[] {
  if (!Number.isFinite(box.width)) return rows
  const fix = (shares: number[], total: number, lows: number[], n: number) => {
    const unit = unitOf(total, box.gap, n)
    const raised = packed(shares, n) ? shares : shares.map((s, i) => Math.max(s, (lows[i] + box.gap) / unit))
    return packed(raised, n) ? clampShares(raised, total - box.gap * (raised.length - 1), lows) : raised
  }
  const next = rows.map((r) => {
    const ws = fix(r.items.map((c) => c.w), box.width, r.items.map((c) => mins(c.type).w), COLS)
    return { ...r, items: r.items.map((c, i) => ({ ...c, w: ws[i] })) }
  })
  if (!Number.isFinite(box.height)) return next
  const hs = fix(next.map((r) => r.h), box.height, next.map((r) => rowMinH(r, mins)), ROWS)
  return next.map((r, i) => ({ ...r, h: hs[i] }))
}

/**
 * 여러 페이지에서 type 을 page 의 target 으로 — 다른 페이지에 있으면 거기서 빠진다.
 * page 가 페이지 수와 같으면 끝에 새 페이지. 빈 줄은 지우지만 빈 페이지는 남긴다(페이지 번호가 끄는 중에 밀리지 않게 — 저장할 때 지운다).
 */
export function movePages(pages: Row[][], type: string, page: number, target: Target): Row[][] {
  const next = pages.map((rows, i) => (i === page ? put(rows, type, target) : without(rows, type)))
  return page < pages.length ? next : [...next, put([], type, target)]
}
