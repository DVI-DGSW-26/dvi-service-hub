/**
 * 앱 껍데기 캐시 — 홈 화면 아이콘으로 열 때 서버(미들웨어의 로그인 검사)를 기다리지 않고 바로 뜬다.
 *
 * 받아 두는 것은 index.html 과 /assets/*(이름에 해시가 붙어 바뀌지 않는다)뿐이다. API 응답은 손대지 않는다.
 * 로그인이 풀렸으면 껍데기는 뜨지만 첫 API 가 401 이라 http.ts 의 toLogin 이 로그인으로 보낸다.
 * 새로 배포하면 그다음 실행부터 새 화면이 뜬다(이번 실행은 받아 둔 것으로 뜨고 뒤에서 새것을 받는다).
 */
const SHELL = 'shell'
const ASSETS = 'assets'
/** 새 배포를 받았다는 표시 — 지난 해시 파일은 다음 실행에서 비운다 */
const STALE = '/__stale'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin) return
  // /api/auth(로그인 · 로그아웃) 같은 이동은 그대로 서버로
  if (req.mode === 'navigate' && url.pathname === '/') {
    const fresh = update(req)
    e.respondWith(prune().then(() => caches.match('/', { cacheName: SHELL })).then((cached) => cached ?? fresh))
    e.waitUntil(fresh.catch(() => {}))
  } else if (url.pathname.startsWith('/assets/')) e.respondWith(asset(req))
})

/** 서버에서 index.html 을 받아 다음 실행을 위해 넣어 둔다 */
async function update(req) {
  const res = await fetch(req)
  // 로그인으로 보내는 302 는 opaqueredirect — 받아 두지 않는다
  if (!res.ok || res.type !== 'basic') return res
  const cache = await caches.open(SHELL)
  const old = await cache.match('/')
  const [html, before] = await Promise.all([res.clone().text(), old?.text()])
  await cache.put('/', res.clone())
  // 새 배포 — 지금 화면은 받아 둔 옛 껍데기로 떠 옛 파일을 찾으니 바로 비우지 않고 표시만 해 둔다
  if (before !== undefined && before !== html) await cache.put(STALE, new Response(''))
  return res
}

/** 지난 실행에서 새 배포를 받았으면 — 새 껍데기를 내주기 전에 옛 해시 파일을 비운다 */
async function prune() {
  const cache = await caches.open(SHELL)
  if (!(await cache.match(STALE))) return
  await caches.delete(ASSETS)
  await cache.delete(STALE)
}

async function asset(req) {
  const cache = await caches.open(ASSETS)
  const hit = await cache.match(req)
  if (hit) return hit
  const res = await fetch(req)
  if (res.ok) await cache.put(req, res.clone())
  return res
}
