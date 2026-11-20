// 조직도 ('26년 DVISION 조직도). 서버 API 가 없어 화면에 둔다 — 조직이 바뀌면 여기만 고친다.

import type { OrgChart } from '@/shared/types'

export const orgChart: OrgChart = {
  head: '대표이사',
  chief: '총괄관리',
  advisors: ['기술고문'],
  teams: [
    { id: 'management', name: '경영관리팀', units: [{ name: '회계재무' }, { name: '인사총무' }] },
    {
      id: 'operations',
      name: '사업운영팀',
      units: [{ name: '구매' }, { name: '사업관리' }, { name: '영업운영' }, { name: '생산관리', units: ['AL압출', '정밀가공'] }],
    },
    { id: 'sales', name: '기술영업팀', units: [{ name: '개발영업' }, { name: '품질관리' }] },
    { id: 'lab', name: '기업부설연구소', units: [{ name: '기술개발' }, { name: '기술지원' }] },
  ],
}
