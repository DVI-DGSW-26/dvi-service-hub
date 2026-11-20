// 4칸 격자 배치 — pnpm test
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lookOf, placeStack, STACK_CELLS, STACK_SIZES } from './widget.ts'

void test('placeStack — 읽는 순서대로, 줄이 넘치면 다음 줄', () => {
  assert.deepEqual(placeStack(['s', 's', 'w']), [
    { x: 0, y: 0, w: 2, h: 2 },
    { x: 2, y: 0, w: 2, h: 2 },
    { x: 0, y: 2, w: 4, h: 2 },
  ])
  assert.deepEqual(placeStack(['1x1', '4x1']), [
    { x: 0, y: 0, w: 1, h: 1 },
    { x: 0, y: 1, w: 4, h: 1 },
  ])
})

void test('placeStack — 기둥 옆 빈칸은 다음 위젯이 채운다(겹치지 않게)', () => {
  assert.deepEqual(placeStack(['1x1', '2x3', '1x1', '1x1', '1x1']), [
    { x: 0, y: 0, w: 1, h: 1 },
    { x: 1, y: 0, w: 2, h: 3 },
    { x: 3, y: 0, w: 1, h: 1 },
    { x: 0, y: 1, w: 1, h: 1 },
    { x: 3, y: 1, w: 1, h: 1 },
  ])
})

void test('크기 목록 · 칸 수 · 모양이 서로 맞다', () => {
  for (const s of STACK_SIZES) {
    const [w, h] = STACK_CELLS[s]
    assert.ok(w >= 1 && w <= 4 && h >= 1 && h <= 4, s)
  }
  assert.equal(lookOf('2x3'), 's')
  assert.equal(lookOf('3x2'), 'w')
  assert.equal(lookOf('4x1'), '4x1')
})
