// en 사전이 ko 와 같은 모양인지 — 사전 JSON 을 고치면 pnpm test 가 잡는다
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { diffMessages } from './check.ts'

const dir = new URL('./', import.meta.url)
const read = (lang: string) =>
  Object.fromEntries(
    readdirSync(new URL(`${lang}/`, dir))
      .filter((f) => f.endsWith('.json'))
      .map((f) => [f.slice(0, -5), JSON.parse(readFileSync(new URL(`${lang}/${f}`, dir), 'utf8')) as unknown]),
  )

void test('en 사전은 ko 와 키 · 모양 · 자리표시자가 같다', () => {
  assert.deepEqual(diffMessages(read('ko'), read('en')), [])
})

void test('diffMessages — 빠진 키 · 자리표시자 차이를 찾는다', () => {
  assert.deepEqual(diffMessages({ a: '{n}개', b: 'x' }, { a: '{count}' }), ['a: 자리표시자 ko {n} · en {count}', 'b: en 에 없음'])
})
