import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * pnpm dev:mock (vite --mode mock) 과 Vercel preview 배포에서만 새 대시보드(src/portal)를 띄운다.
 * index.html 의 진입 스크립트를 바꿔 끼우고 Pretendard 웹폰트를 붙인다.
 * dev · 운영(production) 빌드는 이 플러그인이 꺼져 있어 기존 화면(src/App.tsx) 그대로다.
 */
function mockPortal(): Plugin {
  const font =
    '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />'
  return {
    name: 'mock-portal',
    // 'pre': 빌드에서는 vite 가 진입 스크립트를 먼저 묶어 버리므로 그 전에 바꿔 끼운다
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace('/src/main.tsx', '/src/portal/main.tsx').replace('</head>', `    ${font}\n  </head>`),
    },
  }
}

// VERCEL_ENV 는 Vercel 이 빌드할 때 넣어 준다 (production · preview · development)
const portalPreview = process.env.VERCEL_ENV === 'preview'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), (mode === 'mock' || portalPreview) && mockPortal()],
}))
