/**
 * 서비스 워커 긴급 정지 — 받아 둔 화면이 깨져 Vercel 에서 되돌려도 사용자 기기에서 안 풀릴 때 쓴다.
 *
 * 쓰는 법: 이 파일을 apps/web/public/sw.js 에 덮어쓰고 배포한다. 다 풀리면 public/sw.js 를 git 으로 되돌려 다시 배포한다.
 *   cp apps/web/scripts/sw-kill.js apps/web/public/sw.js
 *
 * 브라우저는 페이지를 열 때마다 sw.js 를 새로 받아 본다(캐시하지 않는 파일). 내용이 바뀌었으니 이 파일이 설치되고,
 * 받아 둔 캐시를 모두 지운 뒤 스스로 해제하고, 열린 화면을 서버에서 새로 받게 다시 연다.
 * 다시 연 화면이 main.tsx 에서 이 파일을 또 등록하지만 지울 캐시가 없어 다시 열지 않는다 — 계속 새로 고치지 않는다.
 * fetch 처리기가 없어 모든 요청은 그대로 서버로 간다.
 */
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      // 해제하기 전에 열린 화면을 맡아야 navigate 로 다시 열 수 있다
      await self.clients.claim()
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
      await self.registration.unregister()
      if (!keys.length) return
      for (const c of await self.clients.matchAll({ type: 'window' })) void c.navigate(c.url)
    })(),
  )
})
