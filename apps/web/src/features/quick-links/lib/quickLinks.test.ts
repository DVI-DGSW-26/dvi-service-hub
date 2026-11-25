// lib/quickLinks.ts 의 Android 앱 주소(intent://) 모양 — pnpm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { quickLinks } from './quickLinks.ts'

const byId = (id: string) => quickLinks.find((q) => q.id === id)!

test('플로우: 스킴 주소를 intent 로, 앱이 없으면 로그인한 화면(main.act)으로', () => {
  assert.equal(
    byId('q-flow').app?.android,
    'intent://#Intent;scheme=flownew;package=com.webcash.bizplay.collabo;S.browser_fallback_url=https%3A%2F%2Fflow.team%2Fmain.act;end',
  )
})

test('Gmail: 앱 링크(https)를 호스트 · 경로는 그대로, 스킴만 따로', () => {
  assert.equal(
    byId('q-mail').app?.android,
    'intent://gmail.app.goo.gl/#Intent;scheme=https;package=com.google.android.gm;S.browser_fallback_url=https%3A%2F%2Fmail.google.com%2F;end',
  )
})
