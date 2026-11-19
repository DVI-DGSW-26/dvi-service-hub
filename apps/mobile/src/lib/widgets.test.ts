// 앱 홈 위젯 — pnpm test
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { placeStack } from '@dvi/core/widget'
import { defaultWidgets, nextSize } from './widgets.ts'

void test('defaultWidgets — 서비스가 셋보다 적어도 그만큼만, 크기는 그릴 수 있는 것 중에서', () => {
  const list = defaultWidgets(['a'])
  assert.deepEqual(list.map((w) => w.id), ['hero', 'service:a', 'systems'])
  for (const w of list) assert.ok(w.sizes.includes(w.size), w.id)
  // 칸이 겹치지 않게 놓인다
  const cells = placeStack(list.map((w) => w.size))
  assert.equal(cells.length, 3)
})

void test('nextSize — 차례로 돌고 끝에서 처음으로', () => {
  const w = defaultWidgets(['a'])[1]
  assert.equal(nextSize(w), 's')
  assert.equal(nextSize({ ...w, size: 's' }), '1x1')
  assert.equal(nextSize({ ...w, size: 'l' }), '1x1') // 그릴 수 없는 크기면 첫 크기
})
