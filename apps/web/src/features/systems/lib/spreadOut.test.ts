// lib/spreadOut.ts 의 칸 채우기 열 · 줄 고르기 — pnpm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spreadOut } from './spreadOut.ts'

test('넓고 낮은 칸은 4 × 2 처럼 가로로 긴 카드가 되게 고른다', () => {
  assert.deepEqual(spreadOut(8, { cols: 8, lines: 5 }, { w: 1460, h: 290, colGap: 8, rowGap: 8 }), [4, 2])
})

test('최소 크기 한도(열 · 줄) 안에서만 고른다', () => {
  const [c, r] = spreadOut(9, { cols: 3, lines: 4 }, { w: 440, h: 240, colGap: 8, rowGap: 8 })
  assert.ok(c <= 3 && r <= 4 && c * r >= 9)
})

test('한 장이면 한 칸', () => {
  assert.deepEqual(spreadOut(1, { cols: 5, lines: 3 }, { w: 800, h: 200, colGap: 8, rowGap: 8 }), [1, 1])
})
