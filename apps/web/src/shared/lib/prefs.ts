// 이 브라우저의 localStorage 에 저장하는 설정 — 키 이름 · 읽기 · 쓰기

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
  /** 좁은 화면 배치(쌓는 순서 · 위젯별 크기) — 넓은 화면 칸 배치와 따로 */
  widgetsStack: 'portal-widgets-stack',
  /** 12 × 6 칸(또는 그 전 줄 비율)으로 저장하던 홈 배치 — 읽어서 옮기기만 한다 */
  widgetsOld: 'portal-widgets',
  header: 'portal-header',
  /** 홈 꾸미기 그림(data URL) — decor/hooks/useDecor.ts */
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
