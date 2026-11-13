// dev:mock 전용 진입점. vite.config.ts 의 mockPortal 플러그인이 --mode mock 일 때만
// index.html 의 /src/main.tsx 를 이 파일로 바꿔 끼운다. dev · 운영 빌드에는 들어가지 않는다.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PortalApp from './PortalApp'
import { I18nProvider } from './i18n'
import { applySavedPrefs } from './lib/theme'
import './portal.css'

applySavedPrefs()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <PortalApp />
    </I18nProvider>
  </StrictMode>,
)
