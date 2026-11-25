import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DownloadPage } from '@/features/app-release'
import { applySavedPrefs } from '@/features/theme'
import { I18nProvider } from '@/shared/i18n'
import './styles.css'

// 앱 받기 페이지(app/index.html)의 시작 — 허브와 같은 테마 · 강조색 · 언어를 따른다
applySavedPrefs()

const root = document.getElementById('root')
if (!root) throw new Error('#root 가 없습니다')
createRoot(root).render(
  <StrictMode>
    <I18nProvider>
      <DownloadPage />
    </I18nProvider>
  </StrictMode>,
)
