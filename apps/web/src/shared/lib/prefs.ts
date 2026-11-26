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
  /** 이 브라우저의 즐겨찾기를 서버와 한 번 맞췄다 — systems/api/queries.ts */
  favoritesSynced: 'favorites-synced',
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
  /** 빠른 바로가기를 웹 · 앱 중 어디로 열지 '다시 묻지 않기'로 정한 답 — quick-links/lib/openApp.ts */
  openWith: 'portal-open-with',
  /** 인사 문구를 고르는 데 쓰는 마지막 방문 · 받아 둔 날씨 — hero/lib/greetingContext.ts */
  greetVisit: 'portal-greet-visit',
  greetWeather: 'portal-greet-weather',
} as const

export function readPref(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

export function writePref(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch { /* 저장 공간을 못 쓰면 그냥 넘어간다 */ }
}
