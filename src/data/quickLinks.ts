// 홈 '빠른 바로가기'. 서버 API 가 없어 화면에 둔다 — 바꿀 때는 이 배열만 고친다.

import type { QuickLink } from '../types/portal'

// 플로우 PC 앱 주소 — 설치할 때 앱이 직접 등록하는 스킴이다 (레지스트리 HKCU\Software\Classes\flownew).
// 액션 없이 부르면 앱이 창을 앞으로 가져오고, 꺼져 있으면 OS 가 앱을 띄운다. 앱이 없으면 웹으로 넘어간다 (lib/openApp.ts)
const FLOW_APP_URL = 'flownew://'

export const quickLinks: QuickLink[] = [
  { id: 'q-flow', title: '플로우 바로가기', description: '업무 협업 · 공지 · 일정', icon: 'flow', url: 'https://flow.team/', appUrl: FLOW_APP_URL },
  { id: 'q-home', title: '회사 홈페이지', description: 'dvi-ind.com', icon: 'globe', url: 'https://dvi-ind.com/' },
  { id: 'q-org', title: '조직도', description: '부서 · 구성원 정보', icon: 'org', url: '#/info/org', modal: 'org' },
  { id: 'q-mail', title: 'Gmail 바로가기', description: '받은편지함 열기', icon: 'mail', url: 'https://mail.google.com/' },
]
