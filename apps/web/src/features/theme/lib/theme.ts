// 테마 설정(화면 모드 · 강조색 · 유리 효과 · 애니메이션). 이 브라우저의 localStorage 에만 저장한다.

import { KEYS, readPref } from '@/shared/lib'

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

export function applyAccent(id: string) {
  const a = ACCENTS.find((x) => x.id === id) ?? ACCENTS[0]
  const s = document.documentElement.style
  s.setProperty('--accent-h', String(a.h))
  s.setProperty('--accent-c', String(a.c))
  // 상태색이 강조색과 겹치는지 CSS 가 알 수 있게 (styles/theme.css 의 [data-accent='green'])
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

/** 애니메이션 정도 — 가볍게는 무거운 것(위젯 크기 · 메뉴 방울 필터 · 어두운 막 흐림)만 빼고, 끄기는 styles/base.css 가 transition · animation 을 모두 없앤다(JS 애니메이션은 motionOff() 를 본다) */
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

export function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// 앱(apps/mobile)이 페이지에 넣어 주는 Capacitor 연결 통로 — 웹 브라우저에는 없다
declare global {
  interface Window {
    Capacitor?: { nativePromise: (plugin: string, method: string, options?: object) => Promise<unknown> }
  }
}

/**
 * 앱의 상태 표시줄 · 아래 내비 바를 테마에 맞춘다(바탕 bg · 아이콘 색). 둘 다 그냥 두면 휴대폰 설정을 따라서
 * 휴대폰은 라이트 · 허브는 다크면 바 · 아이콘이 허브와 따로 논다.
 * - 바탕: WebView 140 이상은 웹이 바 뒤까지 그려 저절로 맞는다. 그 아래는 앱의 HubTheme 플러그인(apps/mobile)이 창 색을 칠한다
 * - 아이콘: Capacitor 8 코어 SystemBars. DARK = 어두운 바탕용 밝은 아이콘
 * @capacitor/core 를 들이지 않고 앱이 넣어 주는 통로로 바로 부른다 — 웹 브라우저에서는 그냥 지나간다
 */
export function applySystemBars(t: 'light' | 'dark', bg: string) {
  const cap = window.Capacitor
  if (!cap) return
  // 순서가 중요하다 — SystemBars.setStyle 이 창 바탕을 기본색으로 되돌리므로 바탕은 그 뒤에 칠한다
  cap
    .nativePromise('SystemBars', 'setStyle', { style: t === 'dark' ? 'DARK' : 'LIGHT' })
    .finally(() => cap.nativePromise('HubTheme', 'setBackground', { color: bg }))
    .catch(() => undefined)
}

/** 첫 렌더 전에 저장된 강조색 · 유리 · 애니메이션 설정을 입힌다 (모드는 index.html 인라인 스크립트가 이미 정했다) */
export function applySavedPrefs() {
  applyAccent(readPref(KEYS.accent) ?? ACCENTS[0].id)
  applyGlass(savedGlass())
  applyMotion(savedMotion())
}
