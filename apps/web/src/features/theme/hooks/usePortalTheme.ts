import { useEffect, useState } from 'react'
import { ACCENTS, applyAccent, applyGlass, applySystemBars, applyMotion, resolveMode, savedGlass, savedMotion, type Motion, type ThemeMode } from '../lib/theme'
import { KEYS, motionOff, readPref, writePref } from '@/shared/lib'

/**
 * 밝기가 확 뒤집히지 않게 화면 전체를 한 장으로 겹쳐 넘긴다(View Transition, styles/widgets/stack.css 의 .theme-fade) — 애니메이션 '켜기'에서만.
 * '가볍게' · '끄기'는 바로 바뀐다. 요소마다 색 전환을 걸면 바뀌는 동안 매 프레임 화면 전체를 다시 칠해 휴대폰에서 0.5초씩 멈췄다
 */
function switchTheme(change: () => void) {
  const root = document.documentElement
  if (root.dataset.motion !== 'full' || motionOff() || !('startViewTransition' in document)) {
    change()
    return
  }
  root.classList.add('theme-fade')
  void document.startViewTransition(change).finished.finally(() => root.classList.remove('theme-fade'))
}

function applyMode(t: 'light' | 'dark') {
  document.documentElement.dataset.theme = t
  // 폰 상태 표시줄 · 앱 전환 화면 색 — styles/theme.css 의 --color-bg 와 맞춘다
  const bg = t === 'dark' ? '#0d0e12' : '#f3f4f7'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
  applySystemBars(t, bg)
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
    const apply = () => applyMode(resolveMode(mode))
    apply()
    if (mode !== 'system') return
    const onChange = () => switchTheme(apply)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  const setMode = (m: ThemeMode) => {
    // 겹쳐 넘기기는 바뀐 화면을 바로 찍어야 해서 여기서 칠한다 — 뒤의 effect 는 같은 값을 한 번 더 칠할 뿐이다
    switchTheme(() => applyMode(resolveMode(m)))
    writePref(KEYS.mode, m === 'system' ? null : m)
    setModeState(m)
  }

  const setAccent = (id: string) => {
    switchTheme(() => applyAccent(id))
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
