import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { I18nProvider } from '@/shared/i18n'
import { applySavedPrefs } from '@/features/theme'
import { keepSessionAlive, queryClient } from '@/shared/api'
import './styles.css'

// 개발 서버에서만 — 캐시 · 요청 상태를 화면 구석의 꽃 단추로 들여다본다. 운영 빌드에는 들어가지 않는다
const QueryDevtools = import.meta.env.DEV
  ? lazy(() => import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })))
  : null

applySavedPrefs()

// 앱 껍데기 캐시(public/sw.js) — 배포본에서만. 개발 서버는 /assets 가 없고 고친 것이 바로 보여야 한다
if (import.meta.env.PROD && 'serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js')

// 로그인 세션(10분)을 끝나기 전에 늘린다 — 배포본에서만. 목업 · 개발 서버에는 로그인 함수가 없다
if (import.meta.env.PROD && !import.meta.env.VITE_MOCK) keepSessionAlive()

// 새 배포 뒤 첫 실행은 받아 둔 옛 껍데기로 떠서, 아직 안 연 지연 로딩 화면(지난 해시 파일)이 서버에 없어 못 연다 — 한 번 새로 고친다.
// sw.js 가 새 index.html 을 아직 못 받았을 수 있어, 받아 둔 껍데기를 비우고 서버 것으로 뜨게 한다. 10초 안에 또 나면 그냥 둔다(계속 새로 고치지 않게)
window.addEventListener('vite:preloadError', (e) => {
  try {
    if (Date.now() - Number(sessionStorage.getItem('reloadedAt') ?? 0) < 10_000) return
    sessionStorage.setItem('reloadedAt', String(Date.now()))
  } catch {
    return
  }
  e.preventDefault()
  // 이름은 public/sw.js 의 SHELL · ASSETS
  const clear = 'caches' in window ? Promise.all(['shell', 'assets'].map((n) => caches.delete(n))) : Promise.resolve()
  void clear.finally(() => location.reload())
})

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

void prepare().then(render)

function render() {
  const root = document.getElementById('root')
  if (!root) throw new Error('#root 가 없습니다')
  createRoot(root).render(
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
