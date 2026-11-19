import { useEffect, useState } from 'react'
import { ACCENTS, KEYS, applyAccent, applyGlass, applyMotion, readPref, resolveMode, savedGlass, savedMotion, writePref, type Motion, type ThemeMode } from '../lib/theme'

/** 밝기가 확 뒤집히지 않게 바꾸는 순간에만 색 전환을 켠다 (styles.css 의 .theme-switching) */
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
  const [glass, setGlassState] = useState(savedGlass)
  const [motion, setMotionState] = useState(savedMotion)

  // '시스템'이면 OS 설정이 바뀔 때 따라간다
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const t = resolveMode(mode)
      document.documentElement.dataset.theme = t
      // 폰 상태 표시줄 · 앱 전환 화면 색 — styles.css 의 --color-bg 와 맞춘다
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#0d0e12' : '#f3f4f7')
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
    // 기본값이 기기마다 달라 켬 · 끔을 둘 다 적어 둔다
    writePref(KEYS.glass, on ? 'on' : 'off')
    setGlassState(on)
  }

  const setMotion = (m: Motion) => {
    applyMotion(m)
    // 기본값이 기기마다 달라 고른 값을 늘 적어 둔다
    writePref(KEYS.motion, m)
    setMotionState(m)
  }

  return { mode, setMode, accent, setAccent, glass, setGlass, motion, setMotion }
}

export type PortalTheme = ReturnType<typeof usePortalTheme>
