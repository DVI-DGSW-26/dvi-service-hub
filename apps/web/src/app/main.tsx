import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { I18nProvider } from '@/shared/i18n'
import { applySavedPrefs } from '@/features/theme'
import { queryClient } from '@/shared/api'
import './styles.css'

// 개발 서버에서만 — 캐시 · 요청 상태를 화면 구석의 꽃 단추로 들여다본다. 운영 빌드에는 들어가지 않는다
const QueryDevtools = import.meta.env.DEV
  ? lazy(() => import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })))
  : null

applySavedPrefs()

// 앱 껍데기 캐시(public/sw.js) — 배포본에서만. 개발 서버는 /assets 가 없고 고친 것이 바로 보여야 한다
if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')

// pnpm dev:mock · Vercel preview — 서버 없이 가짜 API 로 연다. production 빌드에서는 VITE_MOCK 이 false 라 이 import 가 통째로 빠진다
async function prepare() {
  if (!import.meta.env.VITE_MOCK) return
  const [{ installMockApi }, { mockWidgets }, { WIDGETS }] = await Promise.all([
    import('@/mocks/server'),
    import('@/mocks/widgets'),
    import('@/features/home'),
  ])
  installMockApi()
  WIDGETS.push(...mockWidgets)
}

prepare().then(render)

function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <App />
        </I18nProvider>
        {QueryDevtools && (
          <Suspense>
            <QueryDevtools buttonPosition="bottom-left" />
          </Suspense>
        )}
      </QueryClientProvider>
    </StrictMode>,
  )
}
