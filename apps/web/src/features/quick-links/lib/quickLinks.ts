// 홈 '빠른 바로가기'. 서버 API 가 없어 화면에 둔다 — 바꿀 때는 이 배열만 고친다.

import type { QuickLink } from '../../../shared/types/index.ts' // Node 테스트(quickLinks.test.ts)도 읽어 상대 경로

/**
 * Android 앱 주소. Chrome(앱 껍데기는 IntentLinks.java)이 앱이 없거나 주소를 못 받으면 web 으로 대신 연다 — 모르는 앱이어도 안전하다.
 * data 는 앱이 받는 주소(스킴 또는 앱 링크)
 */
const android = (pkg: string, data: string, web: string) => {
  const [scheme, rest] = data.split('://')
  return `intent://${rest}#Intent;scheme=${scheme};package=${pkg};S.browser_fallback_url=${encodeURIComponent(web)};end`
}

// flow.team/ 은 로그인해 있어도 소개 페이지로 간다 — 로그인한 화면은 main.act(세션이 없으면 로그인 화면으로 넘긴다)
const FLOW_WEB = 'https://flow.team/main.act'
const GMAIL_WEB = 'https://mail.google.com/'

export const quickLinks: QuickLink[] = [
  {
    id: 'q-flow',
    title: '플로우 바로가기',
    description: '업무 협업 · 공지 · 일정',
    icon: 'flow',
    url: FLOW_WEB,
    // pc: 설치할 때 앱이 직접 등록하는 스킴(레지스트리 HKCU\Software\Classes\flownew)
    // shortcut: Android 앱이 flownew 를 받는지는 확인 못 했다 — 안 받으면 웹으로 열린다. 앱이 받는 주소를 알게 되면 바꾼다
    app: { pc: 'flownew://', android: android('com.webcash.bizplay.collabo', 'flownew://', FLOW_WEB) },
    ask: true,
  },
  { id: 'q-home', title: '회사 홈페이지', description: 'dvi-ind.com', icon: 'globe', url: 'https://dvi-ind.com/' },
  { id: 'q-org', title: '조직도', description: '부서 · 구성원 정보', icon: 'org', url: '#/info/org', modal: 'org' },
  // 휴대폰은 앱으로 — gmail.app.goo.gl 은 Gmail 앱이 검증받은 앱 링크다. PC 는 앱이 없어 웹
  { id: 'q-mail', title: 'Gmail 바로가기', description: '받은편지함 열기', icon: 'mail', url: GMAIL_WEB, app: { android: android('com.google.android.gm', 'https://gmail.app.goo.gl/', GMAIL_WEB) } },
]
