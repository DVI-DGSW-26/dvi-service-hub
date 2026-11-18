// lib/widgetLayout.ts 의 배치 규칙 — pnpm test (node --test, 의존성 없이 Node 가 .ts 를 바로 돌린다)
// 판은 24 × 12 칸. 끌기 손놀림은 react-grid-layout 이 하므로 여기서는 우리 규칙(최소 이동 · 바꾸기 · 빈칸 정리 · 상한 · 저장 형식)만 본다

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cellsFor, fits, fromHalf, fromRows, grow, guides, nudge, parsePages, place, placeAt, placeOn, reach, sizeFor, span, tidy, valid, without, type Page } from './widgetLayout.ts'

const it = (i: string, x: number, y: number, w: number, h: number) => ({ i, x, y, w, h })
const at = (page: Page, i: string) => page.find((c) => c.i === i)
const sizes = (page: Page) => Object.fromEntries(page.map((c) => [c.i, `${c.w}x${c.h}`]))
/** 위젯별 자리 — 배열 순서와 상관없이 견준다 */
const byId = (page: Page) => Object.fromEntries(page.map((c) => [c.i, `${c.x},${c.y} ${c.w}x${c.h}`]))

// 처음 배치와 같은 꽉 찬 판
const HOME = [it('hero', 0, 0, 16, 4), it('links', 16, 0, 8, 4), it('news', 0, 4, 16, 4), it('today', 16, 4, 8, 4), it('sys', 0, 8, 24, 4)]

test('place — 빈칸으로 옮기면 그 위젯만 움직이고 떠난 자리는 빈칸으로 남는다', () => {
  const page = [it('a', 0, 0, 8, 4), it('b', 8, 0, 8, 4), it('c', 0, 4, 8, 4)]
  const next = place(page, it('a', 16, 0, 8, 4))!
  assert.deepEqual(byId(next), byId([it('a', 16, 0, 8, 4), it('b', 8, 0, 8, 4), it('c', 0, 4, 8, 4)]))
})

test('place — 덮은 위젯과 자리를 바꾸고, 다른 위젯은 그대로(전사 공지 ↔ 업무시스템)', () => {
  const home = [it('hero', 0, 0, 16, 4), it('links', 16, 0, 8, 4), it('sys', 0, 4, 16, 4), it('today', 16, 4, 8, 4), it('cal', 0, 8, 24, 4)]
  const next = place(home, it('hero', 0, 4, 16, 4))!
  assert.deepEqual(byId(next), byId([it('hero', 0, 4, 16, 4), it('links', 16, 0, 8, 4), it('sys', 0, 0, 16, 4), it('today', 16, 4, 8, 4), it('cal', 0, 8, 24, 4)]))
  // 다 덮지 않아도 절반 넘게 덮으면 덮인 위젯 자리에 맞춰 바꾼다(절반만 내려도)
  assert.deepEqual(byId(place(home, it('hero', 0, 2, 16, 4))!), byId(next))
  // 8칸 둘을 16칸 하나와 — 놓인 모양 그대로 떠난 자리로
  const two = place([it('big', 0, 0, 16, 4), it('p', 0, 4, 8, 4), it('q', 8, 4, 8, 4)], it('big', 0, 4, 16, 4))!
  assert.deepEqual(byId(two), byId([it('big', 0, 4, 16, 4), it('p', 0, 0, 8, 4), it('q', 8, 0, 8, 4)]))
})

test('place — 떠난 자리에 안 들어가면 덮인 위젯만 가장 가까운 빈칸으로, 크기는 그대로', () => {
  // 8칸 today 를 16칸 sys 자리로 — sys 는 today 가 떠난 8칸에 못 들어가 바로 옆 빈칸(8,4)으로
  const page = [it('sys', 0, 4, 16, 4), it('today', 16, 4, 8, 4), it('top', 0, 0, 24, 4)]
  const next = place(page, it('today', 0, 4, 8, 4))!
  assert.deepEqual(byId(next), byId([it('sys', 8, 4, 16, 4), it('today', 0, 4, 8, 4), it('top', 0, 0, 24, 4)]))
  assert.deepEqual(sizes(next), sizes(page))
})

test('place — 끝만 걸치거나 비킬 곳이 없으면 null(놓을 수 없는 자리)', () => {
  const page = [it('a', 0, 0, 8, 4), it('b', 8, 0, 8, 4)]
  // 8칸 b 를 2칸만 덮음
  assert.equal(place(page, it('a', 2, 0, 8, 4)), null)
  // 꽉 찬 판에서 큰 위젯을 작은 위젯 자리로 — 큰 위젯이 갈 데가 없다
  const full = [it('s', 0, 0, 8, 4), it('t', 8, 0, 16, 4), it('u', 0, 4, 24, 8)]
  assert.equal(place(full, it('s', 8, 0, 8, 4)), null)
  // 판 밖
  assert.equal(place(page, it('a', 20, 0, 8, 4)), null)
})

test('place — 크기 조절은 빈칸으로 자유롭게, 이웃은 밀고 → 줄이고(최소까지) → 안 되면 null', () => {
  const page = [it('a', 0, 0, 8, 4), it('b', 8, 0, 8, 4)]
  assert.deepEqual(byId(place(page, it('a', 0, 0, 8, 8), false)!), byId([it('a', 0, 0, 8, 8), it('b', 8, 0, 8, 4)]))
  // 오른쪽에 빈칸이 있으면 b 를 그만큼 민다(크기 그대로)
  assert.deepEqual(byId(place(page, it('a', 0, 0, 10, 4), false)!), byId([it('a', 0, 0, 10, 4), it('b', 10, 0, 8, 4)]))
  // 꽉 찬 줄이면 b 가 그쪽에서 줄어든다(분할 창처럼) — 최소 크기까지만
  const full = [it('a', 0, 0, 12, 12), { ...it('b', 12, 0, 12, 12), minW: 10 }]
  assert.deepEqual(byId(place(full, it('a', 0, 0, 14, 12), false)!), byId([it('a', 0, 0, 14, 12), it('b', 14, 0, 10, 12)]))
  assert.equal(place(full, it('a', 0, 0, 15, 12), false), null)
  // 왼쪽 변으로 키워도 — 왼쪽 이웃이 왼쪽에서 줄어든다
  const left = [{ ...it('p', 0, 0, 12, 12), minW: 4 }, it('q', 12, 0, 12, 12)]
  assert.deepEqual(byId(place(left, it('q', 9, 0, 15, 12), false)!), byId([it('p', 0, 0, 9, 12), it('q', 9, 0, 15, 12)]))
})

test('place — 크기가 달라 그대로 못 바꾸면 덮인 위젯은 떠난 자리 쪽으로, 거기 걸린 위젯만 빈칸으로', () => {
  // 처음 배치에서 아래 줄 8칸(maint)을 가운데 줄 16칸(sys) 자리로 — sys 는 아래 줄로, 거기 있던 news 는 sys 가 비운 곳으로
  const home = [it('hero', 0, 0, 16, 4), it('links', 16, 0, 8, 4), it('sys', 0, 4, 16, 4), it('today', 16, 4, 8, 4), it('maint', 0, 8, 8, 4), it('news', 8, 8, 8, 4), it('cal', 16, 8, 8, 4)]
  const next = place(home, it('maint', 0, 4, 8, 4))!
  assert.ok(valid(next))
  assert.deepEqual(byId(next), byId([it('hero', 0, 0, 16, 4), it('links', 16, 0, 8, 4), it('maint', 0, 4, 8, 4), it('news', 8, 4, 8, 4), it('today', 16, 4, 8, 4), it('sys', 0, 8, 16, 4), it('cal', 16, 8, 8, 4)]))
})

test('tidy — 빈칸 정리는 읽는 순서대로 위 · 왼쪽으로 당겨 붙이고, 남은 가로 빈칸은 넓혀 채운다', () => {
  assert.deepEqual(tidy([it('b', 12, 0, 12, 4), it('c', 0, 8, 12, 4)]), [it('b', 0, 0, 12, 4), it('c', 12, 0, 12, 4)])
  // 16칸 옆 8칸 빈칸에 뒤의 8칸 위젯이 올라오고(16칸 위젯은 다음 행), 홀로 남은 16칸 위젯은 줄 끝까지 넓어진다
  assert.deepEqual(tidy([it('a', 0, 0, 16, 4), it('b', 0, 4, 16, 4), it('c', 0, 8, 8, 4)]), [it('a', 0, 0, 16, 4), it('b', 0, 4, 24, 4), it('c', 16, 0, 8, 4)])
  // 높이가 다르면 겹치지 않는 만큼만 — 키 큰 a 옆의 b · c 가 넓어지고 a 는 그대로
  assert.deepEqual(tidy([it('a', 0, 0, 8, 8), it('b', 8, 0, 8, 4), it('c', 8, 4, 12, 4)]), [it('a', 0, 0, 8, 8), it('b', 8, 0, 16, 4), it('c', 8, 4, 16, 4)])
  assert.deepEqual(tidy(HOME), HOME)
})

test('fits — 아래로 12행 · 위젯 12개까지', () => {
  assert.ok(fits([it('a', 0, 0, 24, 12)]))
  assert.ok(!fits([it('a', 0, 1, 24, 12)]))
  assert.ok(!fits(Array.from({ length: 13 }, (_, n) => it(`w${n}`, n % 12, Math.floor(n / 12), 1, 1))))
})

test('valid — 겹치거나 판 밖이면 아니다', () => {
  assert.ok(valid(HOME))
  assert.ok(!valid([it('a', 0, 0, 8, 4), it('b', 6, 0, 8, 4)]))
  assert.ok(!valid([it('a', 20, 0, 8, 4)]))
})

test('placeOn — 다른 페이지의 첫 빈칸으로 옮기고, 원래 페이지는 빈칸 그대로, 빈 페이지는 지운다', () => {
  const pages = [[it('a', 0, 0, 24, 4), it('b', 0, 4, 8, 4)], [it('c', 0, 0, 8, 4)]]
  const next = placeOn(pages, 'a', 1, { w: 8, h: 4 })!
  assert.deepEqual(next[0], [it('b', 0, 4, 8, 4)])
  assert.deepEqual(at(next[1], 'a'), it('a', 0, 4, 24, 4))
  // 혼자 있던 페이지에서 빠지면 그 페이지는 없어진다
  assert.equal(placeOn(pages, 'c', 0, { w: 8, h: 4 })!.length, 1)
  // 페이지 수와 같은 번호면 새 페이지
  assert.equal(placeOn(pages, 'new', 2, { w: 8, h: 4 })!.length, 3)
  // 자리가 없으면 null(위젯 수 상한도)
  assert.equal(placeOn([[it('a', 0, 0, 24, 12)]], 'b', 0, { w: 1, h: 1 }), null)
  assert.equal(placeOn([Array.from({ length: 12 }, (_, n) => it(`w${n}`, n, 0, 1, 1))], 'x', 0, { w: 1, h: 1 }), null)
})

test('without — 빼면 빈자리는 그대로', () => {
  assert.deepEqual(without([HOME], 'hero')[0], HOME.slice(1))
  assert.deepEqual(without([[it('a', 0, 0, 24, 4)]], 'a'), [])
})

test('nudge — 한 칸씩 더 가 보며 처음 놓을 수 있는 자리로(이웃과 바꾸기), 끝이면 null', () => {
  const two = [it('a', 0, 0, 12, 4), it('b', 12, 0, 12, 4)]
  assert.deepEqual(byId(nudge(two, 'a', 1, 0)!), byId([it('a', 12, 0, 12, 4), it('b', 0, 0, 12, 4)]))
  assert.equal(nudge(two, 'a', -1, 0), null)
  // 빈칸이면 한 칸만
  assert.deepEqual(at(nudge(two, 'a', 0, 1)!, 'a'), it('a', 0, 1, 12, 4))
})

test('grow — 이웃이 비키며 한 칸, 최소 아래로는 안 준다', () => {
  const page = [it('a', 0, 0, 12, 4), it('b', 12, 0, 12, 4)]
  const next = grow(page, 'a', 1, 0, { w: 1, h: 1 })!
  assert.equal(at(next, 'a')!.w, 13)
  assert.ok(valid(next))
  assert.equal(at(grow(page, 'a', -1, 0, { w: 12, h: 1 })!, 'a')!.w, 12)
})

test('cellsFor · span — 최소 px 를 담는 칸 수', () => {
  // 칸 100px · 틈 20px: 3칸 = 340px
  assert.equal(span(3, 100), 340)
  assert.equal(cellsFor(340, 100, 12), 3)
  assert.equal(cellsFor(341, 100, 12), 4)
  assert.equal(cellsFor(5000, 100, 12), 12)
})

test('sizeFor — 들어가는 것 중 가장 큰 크기', () => {
  assert.equal(sizeFor(['s', 'm', 'l'], 600, 300), 'm')
  assert.equal(sizeFor(['s', 'm', 'l'], 600, 500), 'l')
  assert.equal(sizeFor(['m', 'xl'], 100, 100), 'm')
})

test('parsePages — 판 밖으로 나가거나 모양이 틀리면 통째로 버린다', () => {
  assert.deepEqual(parsePages([[it('a', 0, 0, 24, 12)]]), [[it('a', 0, 0, 24, 12)]])
  assert.equal(parsePages([[it('a', 1, 0, 24, 1)]]), null)
  assert.equal(parsePages([[{ i: 'a', x: 0, y: 0, w: 1.5, h: 1 }]]), null)
  assert.equal(parsePages('x'), null)
  // 겹친 배치도
  assert.equal(parsePages([[it('a', 0, 0, 8, 4), it('b', 4, 0, 8, 4)]]), null)
})

test('fromHalf — 12 × 6 칸 배치를 24 × 12 칸으로(모두 두 배)', () => {
  assert.deepEqual(fromHalf([[it('a', 0, 0, 8, 2), it('b', 8, 0, 4, 2)], [it('c', 2, 4, 10, 2)]]), [
    [it('a', 0, 0, 16, 4), it('b', 16, 0, 8, 4)],
    [it('c', 4, 8, 20, 4)],
  ])
  // 줄 비율 형식 · 틀린 모양은 null(줄 비율은 fromRows 가 맡는다)
  assert.equal(fromHalf([[{ h: 1, items: [{ type: 'a', w: 1 }] }]]), null)
})

test('fromRows — 예전 줄 비율 배치를 칸으로 옮긴다', () => {
  const old = [
    [
      { h: 1, items: [{ type: 'hero', w: 2 }, { type: 'links', w: 1 }] },
      { h: 1, items: [{ type: 'sys', w: 1.3333 }, { type: 'today', w: 0.6667 }, { type: 'cal', w: 1 }] },
    ],
  ]
  const [page] = fromRows(old)!
  assert.deepEqual(at(page, 'hero'), it('hero', 0, 0, 16, 4))
  assert.deepEqual(at(page, 'links'), it('links', 16, 0, 8, 4))
  assert.deepEqual(at(page, 'sys'), it('sys', 0, 4, 11, 4))
  assert.deepEqual(at(page, 'today'), it('today', 11, 4, 5, 4))
  assert.deepEqual(at(page, 'cal'), it('cal', 16, 4, 8, 4))
  // 페이지 없이 줄 목록만 있던 형식도
  assert.equal(fromRows(old[0])!.length, 1)
  assert.equal(fromRows([[it('a', 0, 0, 1, 1)]]), null)
})

test('reach — 이웃 · 판 끝에 닿기 전까지 넓힐 수 있는 칸 경계', () => {
  const page = [it('a', 0, 0, 8, 4), it('b', 12, 0, 8, 4), it('c', 0, 8, 8, 4), it('d', 16, 6, 8, 2)]
  // 오른쪽은 b 까지, 아래는 c 까지 — 비스듬히 떨어진 d 는 상관없다
  assert.deepEqual(reach(page, 'c'), { x0: 0, x1: 24, y0: 4, y1: 12 })
  assert.deepEqual(reach(page, 'a'), { x0: 0, x1: 12, y0: 0, y1: 8 })
  // b 는 왼쪽이 a 끝(8), 오른쪽이 판 끝, 아래는 d(16~24 열, 6행)까지
  assert.deepEqual(reach(page, 'b'), { x0: 8, x1: 24, y0: 0, y1: 6 })
})

test('guides — 맞추는 변이 같은 쪽 변과 나란하면 기준선, 판 끝은 뺀다', () => {
  // a · b 는 나란히 높이가 같다(위는 판 끝이라 빼고 아래 한 줄), c 는 a 와 왼쪽 · 오른쪽 변이 같다
  const page = [it('a', 2, 0, 8, 4), it('b', 12, 0, 8, 4), it('c', 2, 6, 8, 4)]
  assert.deepEqual(guides(page, 'a', ['l', 'r', 't', 'b']), [
    { vertical: true, at: 2, end: false, from: 0, to: 10 },
    { vertical: true, at: 10, end: true, from: 0, to: 10 },
    { vertical: false, at: 4, end: true, from: 2, to: 20 },
  ])
  // 아래 변만 맞추는 중이면(아래 손잡이) 세로선은 없다
  assert.deepEqual(guides(page, 'a', ['b']), [{ vertical: false, at: 4, end: true, from: 2, to: 20 }])
  // 나란한 변이 없으면 없다
  assert.deepEqual(guides([it('a', 1, 1, 4, 4), it('b', 8, 6, 4, 4)], 'a', ['l', 'r', 't', 'b']), [])
})

test('placeAt — 옆 페이지의 손 아래 칸으로, 판 밖이면 당기고, 덮인 위젯은 비킨다', () => {
  const pages = [[it('a', 0, 0, 8, 4), it('b', 8, 0, 8, 4)], [it('c', 0, 0, 8, 4)]]
  // 빈칸이면 그 자리에
  assert.deepEqual(at(placeAt(pages, 'a', 1, 10, 6)![1], 'a'), it('a', 10, 6, 8, 4))
  // 판 밖으로 나가면 안으로 당긴다
  assert.deepEqual(at(placeAt(pages, 'a', 1, 30, 20)![1], 'a'), it('a', 16, 8, 8, 4))
  // 덮으면 덮인 위젯이 비킨다
  const over = placeAt(pages, 'a', 1, 0, 0)![1]
  assert.ok(valid(over))
  assert.deepEqual(at(over, 'a'), it('a', 0, 0, 8, 4))
  // 혼자 있던 페이지에서 나가 새 페이지로 — 페이지 번호가 하나 당겨진다
  assert.equal(placeAt([[it('a', 0, 0, 8, 4)], [it('c', 0, 0, 8, 4)]], 'a', 2, 0, 0)!.length, 2)
})
