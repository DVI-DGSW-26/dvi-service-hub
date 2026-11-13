// 테마 설정(화면 모드 · 강조색 · 유리 효과). 이 브라우저의 localStorage 에만 저장한다.

export type ThemeMode = 'light' | 'dark' | 'system'

export interface AccentPreset {
  id: string
  label: string
  /** OKLCH 색상각 */
  h: number
  /** OKLCH 채도 — 초록 · 청록은 낮춰야 형광처럼 뜨지 않는다 */
  c: number
}

export const ACCENTS: AccentPreset[] = [
  { id: 'blue', label: '블루', h: 262, c: 0.2 },
  { id: 'indigo', label: '인디고', h: 282, c: 0.2 },
  { id: 'violet', label: '바이올렛', h: 305, c: 0.2 },
  { id: 'pink', label: '핑크', h: 355, c: 0.19 },
  { id: 'orange', label: '오렌지', h: 45, c: 0.17 },
  { id: 'green', label: '그린', h: 155, c: 0.15 },
  { id: 'teal', label: '틸', h: 200, c: 0.13 },
]

/** 기존 화면(src/App.tsx)과 같은 키를 써서 모드 선택이 두 화면 사이에 이어진다 */
export const KEYS = { mode: 'theme', accent: 'portal-accent', glass: 'portal-glass' } as const

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

export function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** 첫 렌더 전에 저장된 강조색 · 유리 설정을 입힌다 (모드는 index.html 인라인 스크립트가 이미 정했다) */
export function applySavedPrefs() {
  applyAccent(readPref(KEYS.accent) ?? ACCENTS[0].id)
  applyGlass(readPref(KEYS.glass) !== 'off')
}
