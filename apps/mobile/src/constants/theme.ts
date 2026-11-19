import { useColorScheme } from 'react-native'

// 웹 테마(apps/web/src/app/styles/theme.css)의 색을 sRGB 로 옮긴 것 — RN 은 oklch 를 모른다
const light = { bg: '#f3f5f9', card: '#ffffff', fg: '#111827', muted: '#6b7280', line: '#e5e7eb', accent: '#2f6bf2', accentSoft: '#e6eeff', danger: '#c8302a', dangerSoft: '#fde8e7' }
const dark: typeof light = { bg: '#0d1117', card: '#171c24', fg: '#f3f4f6', muted: '#9ca3af', line: '#2a313c', accent: '#6d9bff', accentSoft: '#1c2a4a', danger: '#ff7b72', dangerSoft: '#3a1d1d' }

export type Palette = typeof light

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light
}
