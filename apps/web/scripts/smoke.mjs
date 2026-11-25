/**
 * 배포 뒤 점검 — 로그인 없이 운영 허브의 길목을 한 바퀴 돈다. CI 없이 손으로 돌린다.
 *
 *   pnpm --filter @dvi/web smoke                      운영(https://service-hub.dvi-ind.com)
 *   pnpm --filter @dvi/web smoke https://다른-주소     다른 배포
 *
 * 하나라도 실패하면 종료 코드 1 — Vercel 대시보드에서 이전 배포로 Instant Rollback 한다.
 * 화면 · 로그인 후 동작은 보지 않는다(쿠키가 없다). 그건 사람이 한 번 열어 본다.
 */
import { request } from 'node:https'

const BASE = (process.argv[2] ?? 'https://service-hub.dvi-ind.com').replace(/\/+$/, '')
const OLD = 'https://dvi-service-hub.vercel.app'

/**
 * 리다이렉트를 따라가지 않는 GET. fetch 를 쓰지 않는다 — Node fetch 는 Sec-Fetch-Mode 를 늘 cors 로 덮어써
 * 페이지 이동(navigate)을 흉내 낼 수 없다.
 */
const get = (path, headers = {}) =>
  new Promise((resolve, reject) => {
    const req = request(path.startsWith('http') ? path : BASE + path, { headers }, (res) => {
      let text = ''
      res.setEncoding('utf8')
      res.on('data', (c) => (text += c))
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: { get: (k) => [res.headers[k.toLowerCase()]].flat()[0] ?? null },
        text: () => Promise.resolve(text),
        json: () => Promise.resolve(JSON.parse(text)),
      }))
    })
    req.on('error', reject)
    req.setTimeout(15_000, () => req.destroy(new Error('timeout')))
    req.end()
  })
const page = { 'sec-fetch-mode': 'navigate', accept: 'text/html' }
const api = { 'sec-fetch-mode': 'cors', accept: 'application/json' }

const checks = [
  ['가동 감시 /api/health 가 ok', async () => {
    const res = await get('/api/health')
    const body = await res.json()
    return [res.status === 200, `${res.status} ${JSON.stringify(body.checks)}`]
  }],
  ['로그인 없이 연 페이지는 세션 갱신으로', async () => {
    const res = await get('/', page)
    const to = res.headers.get('location') ?? ''
    return [res.status === 302 && to.includes('/api/auth/refresh'), `${res.status} → ${to}`]
  }],
  ['로그인 없는 API 는 JSON 401 (middleware)', async () => {
    const res = await get('/api/hub/smoke', api)
    const body = await res.json().catch(() => ({}))
    return [res.status === 401 && body.source === 'hub-web', `${res.status} ${JSON.stringify(body)}`]
  }],
  ['화면 파일(/assets)은 로그인 검사 밖 — 없는 파일이 401 이 아니라 404', async () => {
    const res = await get('/assets/smoke-missing.js', api)
    return [res.status === 404, String(res.status)]
  }],
  ['로그인 시작 → Keycloak 이 이 주소의 callback 을 받아 준다', async () => {
    const res = await get('/api/auth/login')
    const to = res.headers.get('location') ?? ''
    if (res.status !== 302 || !to.includes('redirect_uri=' + encodeURIComponent(`${BASE}/api/auth/callback`))) return [false, `${res.status} → ${to}`]
    const kc = await get(to)
    const html = await kc.text()
    return [kc.status === 200 && !/invalid parameter|invalid redirect/i.test(html), `Keycloak ${kc.status}`]
  }],
  ['서비스 워커 · 매니페스트 · 서비스 이동 버튼 파일', async () => {
    const rs = await Promise.all(['/sw.js', '/manifest.webmanifest', '/switcher.js'].map((p) => get(p)))
    return [rs.every((r) => r.status === 200), rs.map((r) => r.status).join(' ')]
  }],
  ['보안 헤더 (frame-ancestors · nosniff)', async () => {
    const res = await get('/manifest.webmanifest')
    const csp = res.headers.get('content-security-policy') ?? ''
    return [csp.includes("frame-ancestors 'none'") && res.headers.get('x-content-type-options') === 'nosniff', csp || '없음']
  }],
]
// 운영 점검일 때만 — 옛 Vercel 주소가 회사 도메인으로 넘어가는지
if (BASE === 'https://service-hub.dvi-ind.com') {
  checks.push(['옛 주소(vercel.app)는 회사 도메인으로', async () => {
    const res = await get(`${OLD}/info?x=1`, page)
    const to = res.headers.get('location') ?? ''
    return [res.status === 308 && to === `${BASE}/info?x=1`, `${res.status} → ${to}`]
  }])
}

let failed = 0
for (const [name, run] of checks) {
  let ok = false, detail = ''
  try { [ok, detail] = await run() } catch (e) { detail = e.message }
  if (!ok) failed++
  console.log(`${ok ? '[통과]' : '[실패]'} ${name}  ${detail}`)
}
console.log(failed ? `\n${failed}개 실패 — ${BASE}` : `\n모두 통과 — ${BASE}`)
process.exit(failed ? 1 : 0)
