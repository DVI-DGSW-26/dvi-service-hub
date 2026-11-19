import { useI18n } from '@/shared/i18n'

/** 본문으로 건너뛰기 — 해시는 화면 이동에 쓰므로 #main 링크 대신 버튼으로 초점만 옮긴다 */
export function SkipLink() {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={() => document.getElementById('main')?.focus()}
      className="sr-only z-50 rounded-lg bg-accent-fill px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
    >
      {t.layout.skipToContent}
    </button>
  )
}
