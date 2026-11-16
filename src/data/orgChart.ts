// 조직도. 서버 API 가 없어 화면에 둔다 — 조직이 바뀌면 여기만 고친다.

import type { OrgChart } from '../types/portal'

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
