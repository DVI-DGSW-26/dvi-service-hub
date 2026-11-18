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

/** 이 브라우저에 저장하는 키 전부 — 이름이 겹치면 서로 덮어쓰므로 여기서만 정한다. mode 는 index.html 인라인 스크립트도 읽는다 */
export const KEYS = {
  mode: 'theme',
  accent: 'portal-accent',
  glass: 'portal-glass',
  motion: 'portal-motion',
  lang: 'portal-lang',
  sidebar: 'portal-sidebar',
  systemsView: 'portal-systems-view',
  favorites: 'favorites',
  widgets: 'portal-widgets-v2',
  /** 12 × 6 칸(또는 그 전 줄 비율)으로 저장하던 홈 배치 — 읽어서 옮기기만 한다 */
  widgetsOld: 'portal-widgets',
  header: 'portal-header',
  /** 홈 꾸미기 그림(data URL) — hooks/useDecor.ts */
  wallpaper: 'portal-wallpaper',
  wallpaperPos: 'portal-wallpaper-pos',
  heroImage: 'portal-hero-image',
  heroPos: 'portal-hero-pos',
  apiLog: 'portal-api-log',
} as const

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
  // 상태색이 강조색과 겹치는지 CSS 가 알 수 있게 (styles.css 의 [data-accent='green'])
  document.documentElement.dataset.accent = a.id
}

/** 저사양(코어 4개 이하 · 메모리 4GB 이하)은 유리 흐림을 기본으로 끄고 애니메이션은 '가볍게'로 — 흐림 면 · 크기 애니메이션이 화면을 그릴 때마다 GPU 를 크게 쓴다 */
const LOW_END = navigator.hardwareConcurrency <= 4 || ((navigator as { deviceMemory?: number }).deviceMemory ?? 8) <= 4

/** 유리 효과 — 테마 메뉴에서 고른 값, 고른 적 없으면 기기에 맞춰 */
export const savedGlass = () => {
  const v = readPref(KEYS.glass)
  return v ? v !== 'off' : !LOW_END
}

export function applyGlass(on: boolean) {
  document.documentElement.dataset.glass = on ? 'on' : 'off'
}

/** 애니메이션 정도 — 가볍게는 무거운 것(위젯 크기 · 메뉴 방울 필터 · 어두운 막 흐림)만 빼고, 끄기는 styles.css 가 transition · animation 을 모두 없앤다(JS 애니메이션은 motionOff() 를 본다) */
export type Motion = 'full' | 'lite' | 'off'
export const MOTIONS: Motion[] = ['full', 'lite', 'off']

/** 테마 메뉴에서 고른 값, 고른 적 없으면 기기에 맞춰 */
export const savedMotion = (): Motion => {
  const v = readPref(KEYS.motion)
  return MOTIONS.includes(v as Motion) ? (v as Motion) : LOW_END ? 'lite' : 'full'
}

export function applyMotion(m: Motion) {
  document.documentElement.dataset.motion = m
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
  applyGlass(savedGlass())
  applyMotion(savedMotion())
}
