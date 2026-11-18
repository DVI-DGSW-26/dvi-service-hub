// lib/wallpaper.ts 의 배경 위치 계산 — pnpm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { panBy } from './wallpaper.ts'

const view = { w: 1000, h: 500 }

test('panBy — 넓은 그림은 가로로만, 손을 1:1 로 따라온다', () => {
  // 2000×500 → cover 1, 가로로 1000px 남는다. 오른쪽으로 100px 끌면 가운데 점이 왼쪽으로 10%
  const p = panBy({ x: 50, y: 50, zoom: 1 }, 100, 100, view, { w: 2000, h: 500 })
  assert.equal(p.x, 40)
  assert.equal(p.y, 50)
})

test('panBy — 확대하면 남는 폭이 없던 쪽도 움직이고, 끝에서 멈춘다', () => {
  // 같은 비율 · 2배 → 세로 span = 500 × 1 + 0 = 500. 위로 50px 끌면 아래쪽이 드러난다(+10%)
  const p = panBy({ x: 50, y: 50, zoom: 2 }, 0, -50, view, { w: 1000, h: 500 })
  assert.equal(p.y, 60)
  assert.equal(panBy({ x: 5, y: 50, zoom: 2 }, 900, 0, view, { w: 1000, h: 500 }).x, 0)
})
