import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * 로컬 개발(pnpm dev)의 /api/hub 프록시 — 운영에서 vercel.json rewrites 가 하는 일을 대신한다.
 *
 * 허브 서버는 로그인 쿠키(hub_session)로 사람을 확인한다. 그 쿠키는 /api/auth/* (Vercel Edge 함수)가
 * 로그인 때 만드는데 vite 에서는 그 함수가 돌지 않는다. 그래서 운영 허브에 로그인한 브라우저의
 * hub_session 값을 .env.local 의 HUB_SESSION_COOKIE 에 넣어 두면 프록시가 요청마다 붙여 보낸다.
 * (VITE_ 로 시작하지 않으므로 화면 번들에는 들어가지 않는다)
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // vercel.json 의 rewrites 와 같은 주소 — 옮기면 둘 다 고친다
  const hubApi = (env.HUB_API_URL || 'https://api.dvi-ind.com/hub').replace(/\/+$/, '')
  const cookie = env.HUB_SESSION_COOKIE?.trim()
  // 목업 API 로 띄운다 — pnpm dev:mock, 그리고 Vercel preview 배포(로그인 서버 없이 미리보기. middleware.ts 도 로그인을 건너뛴다).
  // production 빌드는 false 라 목업 코드가 통째로 빠진다
  const mock = mode === 'mock' || process.env.VERCEL_ENV === 'preview'

  return {
    plugins: [react(), tailwindcss()],
    define: { 'import.meta.env.VITE_MOCK': JSON.stringify(mock) },
    server: {
      proxy: {
        '/api/hub': {
          target: hubApi,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/hub/, ''),
          headers: cookie ? { cookie: `hub_session=${cookie}` } : undefined,
        },
      },
    },
  }
})
