import { useEffect, useState } from 'react'
import { ACCENTS, KEYS, applyAccent, applyGlass, applyMotion, readPref, resolveMode, writePref, type ThemeMode } from '../lib/theme'

/** 밝기가 확 뒤집히지 않게 바꾸는 순간에만 색 전환을 켠다 (portal.css 의 .theme-switching) */
function easeThemeSwitch() {
  const root = document.documentElement
  root.classList.add('theme-switching')
  window.setTimeout(() => root.classList.remove('theme-switching'), 400)
}

export function usePortalTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const t = readPref(KEYS.mode)
    return t === 'light' || t === 'dark' ? t : 'system'
  })
  const [accent, setAccentState] = useState(() => readPref(KEYS.accent) ?? ACCENTS[0].id)
  const [glass, setGlassState] = useState(() => readPref(KEYS.glass) !== 'off')
  const [motion, setMotionState] = useState(() => readPref(KEYS.motion) !== 'off')

  // '시스템'이면 OS 설정이 바뀔 때 따라간다
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.dataset.theme = resolveMode(mode)
    }
    apply()
    if (mode !== 'system') return
    const onChange = () => {
      easeThemeSwitch()
      apply()
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  const setMode = (m: ThemeMode) => {
    easeThemeSwitch()
    writePref(KEYS.mode, m === 'system' ? null : m)
    setModeState(m)
  }

  const setAccent = (id: string) => {
    easeThemeSwitch()
    applyAccent(id)
    writePref(KEYS.accent, id)
    setAccentState(id)
  }

  const setGlass = (on: boolean) => {
    applyGlass(on)
    writePref(KEYS.glass, on ? null : 'off')
    setGlassState(on)
  }

  const setMotion = (on: boolean) => {
    applyMotion(on)
    writePref(KEYS.motion, on ? null : 'off')
    setMotionState(on)
  }

  return { mode, setMode, accent, setAccent, glass, setGlass, motion, setMotion }
}

export type PortalTheme = ReturnType<typeof usePortalTheme>
