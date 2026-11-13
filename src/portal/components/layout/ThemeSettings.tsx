import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useId } from 'react'
import type { PortalTheme } from '../../hooks/usePortalTheme'
import { ACCENTS, type ThemeMode } from '../../lib/theme'
import { Segmented } from '../ui/Segmented'

const MODES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: '라이트', icon: Sun },
  { value: 'dark', label: '다크', icon: Moon },
  { value: 'system', label: '시스템', icon: Monitor },
]

/** 화면 모드 · 강조 색 · 유리 효과. 상단 바의 테마 메뉴와 계정 설정 화면이 같이 쓴다. */
export function ThemeSettings({ theme }: { theme: PortalTheme }) {
  const glassLabel = useId()

  return (
    <>
      <p className="mb-2 text-xs font-semibold text-muted">화면 모드</p>
      <Segmented label="화면 모드" value={theme.mode} onChange={theme.setMode} options={MODES} className="w-full" />

      <p className="mt-5 mb-2.5 text-xs font-semibold text-muted">강조 색</p>
      <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="강조 색">
        {ACCENTS.map((a) => {
          const active = a.id === theme.accent
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={a.label}
              title={a.label}
              onClick={() => theme.setAccent(a.id)}
              style={{ background: `oklch(0.6 ${a.c} ${a.h})` }}
              className={`grid size-8 cursor-pointer place-items-center rounded-full text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.35),0_2px_6px_oklch(0_0_0/0.2)] transition-[scale] duration-150 hover:scale-110 active:scale-95 ${
                active ? 'ring-2 ring-fg/70 ring-offset-2 ring-offset-transparent' : ''
              }`}
            >
              {active && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
            </button>
          )
        })}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <span>
          <span id={glassLabel} className="block text-sm font-semibold">
            유리 효과
          </span>
          <span className="block text-xs text-muted">끄면 불투명한 면으로 보여요</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={theme.glass}
          aria-labelledby={glassLabel}
          onClick={() => theme.setGlass(!theme.glass)}
          className={`relative h-7 w-12 flex-none cursor-pointer rounded-full transition-colors duration-200 ${theme.glass ? 'bg-accent-fill' : 'bg-fg/20'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-[0_2px_4px_oklch(0_0_0/0.25)] transition-transform duration-200 ${
              theme.glass ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>
      <p className="mt-3 text-[11px] text-muted">설정은 이 브라우저에 저장됩니다.</p>
    </>
  )
}
