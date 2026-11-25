// lib/session.ts 의 쿠키 서명 — pnpm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ACCESS_COOKIE, AUTH_COOKIE, authCookie, buildCookie, signSession, verifySession } from './session.ts'

const secret = 'test-secret'
const exp = Math.floor(Date.now() / 1000) + 60

test('hub_auth · hub_access 를 hub_session 자리에 넣으면 열리지 않는다', async () => {
  const pending = await signSession({ state: 's', exp }, secret, AUTH_COOKIE)
  const access = await signSession({ realm: [], exp }, secret, ACCESS_COOKIE)
  assert.equal(await verifySession(pending, secret), null)
  assert.equal(await verifySession(access, secret), null)
  assert.equal(await verifySession(access, secret, AUTH_COOKIE), null)
  assert.deepEqual(await verifySession(pending, secret, AUTH_COOKIE), { state: 's', exp })
})

test('hub_session 은 SESSION_SECRET 그대로 — service-hub-server 가 같은 키로 연다', async () => {
  const session = await signSession({ sub: 'u', exp }, secret)
  assert.deepEqual(await verifySession(session, secret), { sub: 'u', exp })
  const body = session.split('.')[0]
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = Buffer.from(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))).toString('base64url')
  assert.equal(session, `${body}.${sig}`)
})

test('로그인 진행 쿠키는 state 마다 따로, 경로는 callback 으로만', () => {
  assert.notEqual(authCookie('a'), authCookie('b'))
  assert.match(buildCookie(authCookie('a'), 'v', 600), /^hub_auth\.a=v; Path=\/api\/auth\/callback;/)
})
