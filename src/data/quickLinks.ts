// 홈 '빠른 바로가기'. 서버 API 가 없어 화면에 둔다 — 바꿀 때는 이 배열만 고친다.

import type { QuickLink } from '../types/portal'

export const quickLinks: QuickLink[] = [
  { id: 'q-flow', title: '플로우 바로가기', description: '업무 협업 · 공지 · 일정', icon: 'flow', url: 'https://flow.team/' }, // 앱(flownew://) 대신 웹으로 연다
  { id: 'q-home', title: '회사 홈페이지', description: 'dvi-ind.com', icon: 'globe', url: 'https://dvi-ind.com/' },
  { id: 'q-org', title: '조직도', description: '부서 · 구성원 정보', icon: 'org', url: '#/info/org', modal: 'org' },
  { id: 'q-mail', title: 'Gmail 바로가기', description: '받은편지함 열기', icon: 'mail', url: 'https://mail.google.com/' },
]
