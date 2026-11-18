// 로컬 개발용 로그인 사용자.

import type { Me } from '../types/portal'

/**
 * 로컬 개발(vite)에서는 Edge 함수가 돌지 않아 /api/auth/me 가 없다. 그때 쓰는 사용자.
 * 화면의 버튼만 정한다 — 실제 권한은 서버가 HUB_SESSION_COOKIE 의 계정으로 판단한다.
 */
export const mockMe: Me = {
  signedIn: true,
  name: '김지현',
  email: 'jihyun.kim@dvi-ind.com',
  department: '연구개발팀',
  realm: ['employee'],
  // service-hub admin — 전사 공지 · 점검 안내 작성 버튼까지 보이도록. 하이요(hi-yo) 권한은 없다 — '권한별' 과 '전체' 가 다르게 보이도록
  // 연구노트는 연구원 · 과제 책임자 — 관리자(admin) 위젯은 갤러리에 안 나온다
  svc: { 'service-hub': ['admin'], jagigo: ['user'], 'research-note': ['researcher', 'manager'] },
}
