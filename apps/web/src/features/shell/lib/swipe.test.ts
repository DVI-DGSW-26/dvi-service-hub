// 탭 넘기기 판정 — pnpm test
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { axisOf, resist, swipeStep } from './swipe.ts'

void test('axisOf — 조금 움직이면 모르고, 가로가 뚜렷해야 x', () => {
  assert.equal(axisOf(3, 4), null)
  assert.equal(axisOf(30, 5), 'x')
  assert.equal(axisOf(-30, 5), 'x')
  assert.equal(axisOf(12, 11), 'y') // 비스듬하면 세로 스크롤에 양보
  assert.equal(axisOf(2, 40), 'y')
})

void test('resist — 끝 탭 너머로만 버틴다', () => {
  assert.equal(resist(40, 0, 4), 10)
  assert.equal(resist(-40, 3, 4), -10)
  assert.equal(resist(-40, 0, 4), -40)
})

void test('swipeStep — 멀리 밀거나 빠르게 튕기면 옆 탭, 아니면 제자리', () => {
  assert.equal(swipeStep(-120, 0, 400), 1)
  assert.equal(swipeStep(120, 0, 400), -1)
  assert.equal(swipeStep(-30, 0, 400), 0)
  assert.equal(swipeStep(-30, -0.8, 400), 1) // 짧아도 빠르면
  assert.equal(swipeStep(-30, 0.8, 400), 0) // 민 방향과 반대로 튕기면 제자리
  assert.equal(swipeStep(0, 0, 400), 0)
})
