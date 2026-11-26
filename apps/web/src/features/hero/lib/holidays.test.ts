// lib/holidays.ts 의 공휴일 판단 — pnpm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isHoliday, lunarHoliday } from './holidays.ts'

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d)

test('설 · 추석 — 당일과 앞뒤 하루가 연휴', () => {
  assert.equal(lunarHoliday(day(2026, 2, 16)), 'seollal')
  assert.equal(lunarHoliday(day(2026, 2, 18)), 'seollal')
  assert.equal(lunarHoliday(day(2026, 2, 19)), null)
  assert.equal(lunarHoliday(day(2026, 9, 25)), 'chuseok')
})

test('연휴가 해를 넘어도 찾는다 — 2028 설 전날은 1월 25일', () => {
  assert.equal(lunarHoliday(day(2028, 1, 25)), 'seollal')
})

test('양력 · 부처님오신날은 공휴일, 평일은 아니다', () => {
  assert.equal(isHoliday(day(2026, 10, 9)), true)
  assert.equal(isHoliday(day(2026, 5, 24)), true)
  assert.equal(isHoliday(day(2026, 11, 26)), false)
})
