import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 로컬에서 띄운 허브 서버(service-hub-server, SECURITY_MODE=dev). 운영에서는 vercel.json 의
// rewrites 가 같은 경로를 실제 서버로 넘긴다 — 경로를 바꾸면 둘 다 고친다.
const LOCAL_HUB_SERVER = 'http://localhost:8086'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/hub': {
        target: LOCAL_HUB_SERVER,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hub/, ''),
      },
      '/api/switcher/services': {
        target: LOCAL_HUB_SERVER,
        changeOrigin: true,
        rewrite: () => '/services',
      },
    },
  },
})
