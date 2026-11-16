import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useId } from 'react'
import type { PortalTheme } from '../../hooks/usePortalTheme'
import { LANGS, useI18n } from '../../i18n'
import { ACCENTS, type ThemeMode } from '../../lib/theme'
import { Segmented } from '../ui/Segmented'

const MODES: { value: ThemeMode; icon: typeof Sun }[] = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
]

/** 화면 모드 · 언어 · 강조 색 · 유리 효과 · 애니메이션. 상단 바의 테마 메뉴와 설정 화면이 같이 쓴다. */
export function ThemeSettings({ theme }: { theme: PortalTheme }) {
  const { t, lang, setLang } = useI18n()
  const modes = MODES.map((m) => ({ ...m, label: t.theme.modes[m.value] }))

  return (
    <>
      <p className="mb-2 text-xs font-semibold text-muted">{t.theme.mode}</p>
      <Segmented label={t.theme.mode} value={theme.mode} onChange={theme.setMode} options={modes} className="w-full" />

      <p className="mt-5 mb-2 text-xs font-semibold text-muted">{t.theme.language}</p>
      <Segmented label={t.theme.language} value={lang} onChange={setLang} options={LANGS} className="w-full" />

      <p className="mt-5 mb-2.5 text-xs font-semibold text-muted">{t.theme.accent}</p>
      <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={t.theme.accent}>
        {ACCENTS.map((a) => {
          const active = a.id === theme.accent
          const label = t.theme.accents[a.id]
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={label}
              title={label}
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

      <div className="mt-5 space-y-4 border-t border-line pt-4">
        <SwitchRow label={t.theme.glass.label} hint={t.theme.glass.hint} on={theme.glass} onChange={theme.setGlass} />
        <SwitchRow label={t.theme.motion.label} hint={t.theme.motion.hint} on={theme.motion} onChange={theme.setMotion} />
      </div>
      <p className="mt-3 text-[11px] text-muted">{t.theme.savedLocally}</p>
    </>
  )
}

/** 이름 · 설명 + 켜고 끄는 스위치 한 줄 */
function SwitchRow({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (on: boolean) => void }) {
  const labelId = useId()
  return (
    <div className="flex items-center justify-between gap-3">
      <span>
        <span id={labelId} className="block text-sm font-semibold">
          {label}
        </span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={labelId}
        onClick={() => onChange(!on)}
        className={`relative h-7 w-12 flex-none cursor-pointer rounded-full transition-colors duration-200 ${on ? 'bg-accent-fill' : 'bg-fg/20'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-[0_2px_4px_oklch(0_0_0/0.25)] transition-transform duration-200 ${on ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  )
}
