// 테마 설정(화면 모드 · 강조색 · 유리 효과 · 애니메이션). 이 브라우저의 localStorage 에만 저장한다.

export type ThemeMode = 'light' | 'dark' | 'system'

/** 이름은 사전(t.theme.accents[id])에 있다 */
export type AccentId = 'blue' | 'indigo' | 'violet' | 'pink' | 'orange' | 'green' | 'teal'

export interface AccentPreset {
  id: AccentId
  /** OKLCH 색상각 */
  h: number
  /** OKLCH 채도 — 초록 · 청록은 낮춰야 형광처럼 뜨지 않는다 */
  c: number
}

export const ACCENTS: AccentPreset[] = [
  { id: 'blue', h: 262, c: 0.2 },
  { id: 'indigo', h: 282, c: 0.2 },
  { id: 'violet', h: 305, c: 0.2 },
  { id: 'pink', h: 355, c: 0.19 },
  { id: 'orange', h: 45, c: 0.17 },
  { id: 'green', h: 155, c: 0.15 },
  { id: 'teal', h: 200, c: 0.13 },
]

/** 기존 화면(src/App.tsx)과 같은 키를 써서 모드 선택이 두 화면 사이에 이어진다 */
export const KEYS = { mode: 'theme', accent: 'portal-accent', glass: 'portal-glass', motion: 'portal-motion' } as const

export function readPref(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

export function writePref(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {}
}

export function applyAccent(id: string) {
  const a = ACCENTS.find((x) => x.id === id) ?? ACCENTS[0]
  const s = document.documentElement.style
  s.setProperty('--accent-h', String(a.h))
  s.setProperty('--accent-c', String(a.c))
}

export function applyGlass(on: boolean) {
  document.documentElement.dataset.glass = on ? 'on' : 'off'
}

/** 애니메이션 끄기 — portal.css 가 transition · animation 을 없애고, JS 애니메이션은 motionOff() 를 본다 */
export function applyMotion(on: boolean) {
  document.documentElement.dataset.motion = on ? 'on' : 'off'
}

/** 테마 메뉴에서 껐거나 OS 의 '동작 줄이기'가 켜져 있으면 움직임 없이 바로 바꾼다 */
export const motionOff = () =>
  document.documentElement.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches

export function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** 첫 렌더 전에 저장된 강조색 · 유리 · 애니메이션 설정을 입힌다 (모드는 index.html 인라인 스크립트가 이미 정했다) */
export function applySavedPrefs() {
  applyAccent(readPref(KEYS.accent) ?? ACCENTS[0].id)
  applyGlass(readPref(KEYS.glass) !== 'off')
  applyMotion(readPref(KEYS.motion) !== 'off')
}
