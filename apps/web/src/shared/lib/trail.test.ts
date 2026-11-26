// lib/trail.ts 의 놓는 순간 빠르기 — pnpm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { releaseSpeed, type Trail } from './trail.ts'

test('손을 떼며 느려진 마지막 움직임이 아니라 최근 움직임으로 잰다', () => {
  const trail: Trail = []
  for (let t = 0; t <= 80; t += 4) trail.push({ t, p: t * 2 }) // 2px/ms 로 던지다
  trail.push({ t: 84, p: 161 }) // 떼는 순간 1px
  assert.ok(releaseSpeed(trail, 86, 100) > 1.5)
})

test('멈췄다 놓으면 0', () => {
  const trail: Trail = [{ t: 0, p: 0 }, { t: 10, p: 50 }]
  assert.equal(releaseSpeed(trail, 300, 100), 0)
})
