// 조직도 · 로그인 사용자 목업 데이터.

import type { Me, OrgChart } from '../types/portal'

export const orgChart: OrgChart = {
  head: '대표이사',
  advisors: ['기술고문'],
  teams: [
    { id: 'production', name: '생산관리팀', units: ['생산팀', '생산 · 공무 · 현장'] },
    { id: 'purchase', name: '구매팀', units: ['원소재', '소모품'] },
    { id: 'sales', name: '해외영업팀', units: ['고객관리 · 해외물류'] },
    { id: 'quality', name: '품질팀', units: ['품질보증', '시험 · 측정'] },
    { id: 'management', name: '경영관리팀', units: ['재무 · 인사 · 노무', '안전보건 · 환경'] },
    { id: 'lab', name: '기술부설연구소', units: ['R&D · 신규제품개발'] },
  ],
}

/** 로컬 개발(vite)에서는 Edge 함수가 돌지 않아 /api/auth/me 가 없다. 그때 쓰는 사용자. */
export const mockMe: Me = {
  signedIn: true,
  name: '김지현',
  email: 'jihyun.kim@dvi-ind.com',
  department: '연구개발팀',
  // admin — 목업에서 전사 공지 · 점검 안내 작성 버튼까지 보이도록
  realm: ['employee', 'admin'],
  // 하이요(hi-yo) 권한은 없다 — 업무시스템의 '권한별' 과 '전체' 가 다르게 보이도록
  svc: { jagigo: ['user'] },
}
