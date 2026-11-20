// pnpm dev:mock 의 서비스 위젯 — 각 서비스가 위젯 데이터를 줄 API 가 아직 없어 모양만 먼저 본다.
// main.tsx 가 mock 모드에서만 WIDGETS 뒤에 붙인다(운영 화면에는 지어낸 값을 내보내지 않는다 — docs/adr/0001).
// 서비스 API 가 생기면 그 위젯을 그 서비스의 도메인(src/…)으로 옮기고 view 를 쿼리 결과로 바꾼다.

import type { WidgetDef } from '@/features/home'
import { opsWidgets } from './opsWidgets'
import { rn, series, w } from './widgetKit'

export const mockWidgets: WidgetDef[] = [
  // ------------------------------------------------------------ 콱플로우
  w('kwak-flow', 'inspection', '검사현황', '오늘 검사 진행 · 합격률', ['m', 's', 'l', 'xl'], {
    kind: 'stats',
    tiles: [
      { label: '오늘 검사', value: '128', unit: '건', delta: ['ok', '+12'] },
      { label: '합격률', value: '97.6', unit: '%', delta: ['ok', '+0.4%p'] },
      { label: '재검 대기', value: '5', unit: '건', delta: ['warn', '+2'] },
      { label: '불합격', value: '3', unit: '건', delta: ['danger', '+1'] },
    ],
    trend: series(1, 14, 95, 6),
  }),
  w('kwak-flow', 'equipment-report', '설비 신고', '고장 · 이상 설비를 바로 신고', ['s', 'm'], {
    kind: 'actions',
    lead: '설비 이상을 발견하면 사진과 함께 신고하세요. 담당자에게 바로 알림이 갑니다.',
    actions: ['설비 신고하기', '내 신고 내역'],
  }),
  w('kwak-flow', 'equipment', '설비 관리', '설비 상태 · 정비 예정', ['m', 's', 'l'], {
    kind: 'list',
    rows: [
      { title: '압출기 2호기', sub: '유압 펌프 교체', meta: '오늘 14:00', badge: ['warn', '정비 예정'] },
      { title: '절단기 A', sub: '정기 점검 완료', meta: '어제', badge: ['ok', '정상'] },
      { title: '컨베이어 3번', sub: '벨트 마모 신고', meta: '11/15', badge: ['danger', '고장'] },
      { title: '포장기 1호기', sub: '센서 보정', meta: '11/20', badge: ['warn', '정비 예정'] },
      { title: '공조기 B동', sub: '필터 교체', meta: '11/22', badge: ['neutral', '예정'] },
    ],
  }),
  w('kwak-flow', 'approvals', '승인대기', '내 결재를 기다리는 문서', ['s', 'm', 'l'], {
    kind: 'list',
    rows: [
      { title: '설비 수리비 지출 결의', sub: '생산관리 · 박민수', meta: '2시간 전', badge: ['warn', '대기'] },
      { title: '검사 기준서 개정 v3', sub: '품질 · 이서연', meta: '어제', badge: ['warn', '대기'] },
      { title: '외주 가공 발주', sub: '구매 · 정하늘', meta: '11/14', badge: ['danger', '기한 임박'] },
      { title: '안전 교육 결과 보고', sub: '총무 · 최유진', meta: '11/13', badge: ['warn', '대기'] },
    ],
  }),

  // ------------------------------------------------------------ 띵동
  w('dding-dong', 'my-card', '내 명함', '내 명함 미리보기 · 수정', ['s', 'm'], {
    kind: 'namecard',
    name: '김지현',
    role: '선임연구원',
    team: '연구개발팀',
    phone: '010-1234-5678',
    email: 'jihyun.kim@dvi-ind.com',
  }),

  // ------------------------------------------------------------ 탈탈
  w('taltal', 'watchlist', '관심 목록', '내가 관심 표시한 지원사업', ['m', 's', 'l'], {
    kind: 'list',
    rows: [
      { title: '2027 소재부품 기술개발', sub: '산업통상자원부', meta: 'D-12', badge: ['danger', '마감 임박'] },
      { title: '스마트공장 고도화 지원', sub: '중소벤처기업부', meta: 'D-30', badge: ['ok', '접수 중'] },
      { title: '탄소중립 공정 전환', sub: '한국에너지공단', meta: 'D-45', badge: ['ok', '접수 중'] },
      { title: '수출 바우처 2차', sub: 'KOTRA', meta: '12/02', badge: ['neutral', '예정'] },
    ],
  }),
  w('taltal', 'latest', '최신 지원사업', '새로 올라온 지원사업 공고', ['m', 's', 'l', 'xl'], {
    kind: 'list',
    rows: [
      { title: '알루미늄 경량화 소재 실증', sub: '경기테크노파크', meta: '오늘', badge: ['accent', 'NEW'] },
      { title: '중소기업 R&D 바우처', sub: '중소기업기술정보진흥원', meta: '오늘', badge: ['accent', 'NEW'] },
      { title: '제조 AI 도입 컨설팅', sub: 'NIPA', meta: '어제' },
      { title: '뿌리기업 공정 개선', sub: '한국생산기술연구원', meta: '어제' },
      { title: '그린뉴딜 유망기업', sub: '환경부', meta: '11/15' },
      { title: '지역 특화 산업 육성', sub: '경상북도', meta: '11/14' },
      { title: '해외 인증 획득 지원', sub: 'KOTRA', meta: '11/13' },
      { title: '산학 공동 기술개발', sub: '중소벤처기업부', meta: '11/12' },
    ],
  }),
  w('taltal', 'sources', '수집 대상 사이트', '공고를 모으는 사이트 상태', ['s', 'm', 'l'], {
    kind: 'list',
    rows: [
      { title: '기업마당', sub: '매일 06:00', meta: '214건', badge: ['ok', '정상'] },
      { title: 'NTIS', sub: '매일 06:10', meta: '88건', badge: ['ok', '정상'] },
      { title: '경기테크노파크', sub: '매일 06:20', meta: '17건', badge: ['danger', '수집 실패'] },
      { title: 'K-Startup', sub: '매일 06:30', meta: '41건', badge: ['ok', '정상'] },
    ],
  }),
  w('taltal', 'categories', '카테고리 관리', '공고 분류 · 키워드', ['s', 'm'], {
    kind: 'actions',
    lead: '카테고리 9개 · 키워드 62개. 새 공고는 키워드로 자동 분류됩니다.',
    actions: ['카테고리 편집', '키워드 추가', '미분류 공고 3건'],
  }),

  // ------------------------------------------------------------ 자기고 (자산 관리)
  w('honey-go', 'fixed-assets', '고정자산 리스트', '자산 수 · 장부가', ['m', 's', 'l', 'xl'], {
    kind: 'stats',
    tiles: [
      { label: '등록 자산', value: '1,284', unit: '건' },
      { label: '장부가', value: '84.2', unit: '억 원' },
      { label: '이번 달 취득', value: '12', unit: '건', delta: ['accent', '+3'] },
      { label: '처분 예정', value: '4', unit: '건' },
    ],
    trend: series(2, 12, 80, 8),
  }),
  w('honey-go', 'supplies', '비품', '비품 재고 · 대여 현황', ['s', 'm', 'l'], {
    kind: 'list',
    rows: [
      { title: '노트북 (업무용)', sub: '대여 18 · 보관 4', badge: ['ok', '여유'] },
      { title: '모니터 27"', sub: '대여 31 · 보관 1', badge: ['warn', '부족'] },
      { title: '빔 프로젝터', sub: '대여 2 · 보관 1', badge: ['ok', '여유'] },
      { title: '무전기', sub: '대여 12 · 보관 0', badge: ['danger', '없음'] },
    ],
  }),
  w('honey-go', 'facilities', '사내 설비', '설비 대장 · 위치', ['m', 's', 'l'], {
    kind: 'list',
    rows: [
      { title: '압출기 1호기', sub: 'A동 1층', meta: '2019 도입' },
      { title: '압출기 2호기', sub: 'A동 1층', meta: '2021 도입' },
      { title: '열처리로', sub: 'B동', meta: '2018 도입' },
      { title: 'CNC 가공기 3대', sub: 'C동', meta: '2022 도입' },
    ],
  }),
  w('honey-go', 'instruments', '계측기', '교정 주기 · 만료 예정', ['s', 'm', 'l'], {
    kind: 'list',
    rows: [
      { title: '버니어 캘리퍼스 #12', sub: '교정 만료 11/30', badge: ['danger', 'D-13'] },
      { title: '마이크로미터 #4', sub: '교정 만료 12/15', badge: ['warn', 'D-28'] },
      { title: '경도계 HR-150', sub: '교정 만료 2027/02', badge: ['ok', '정상'] },
      { title: '3차원 측정기', sub: '교정 만료 2027/05', badge: ['ok', '정상'] },
    ],
  }),
  w('honey-go', 'gauge-rr', '게이지 R&R', '측정 시스템 분석 결과', ['m', 's', 'l'], {
    kind: 'chart',
    label: '최근 분석 %GRR',
    value: '8.4%',
    delta: ['ok', '적합'],
    series: [12.1, 11.4, 10.8, 9.9, 9.6, 9.1, 8.8, 8.4],
    labels: ['4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월'],
  }),
  w('honey-go', 'depreciation', '감가상각', '월별 감가상각비', ['m', 'l', 'xl'], {
    kind: 'chart',
    label: '이번 달 감가상각비',
    value: '1억 2,340만',
    delta: ['neutral', '전월 대비 -1.2%'],
    series: [128, 127, 127, 126, 126, 125, 125, 124, 124, 123, 123, 123],
    labels: ['12월', '2월', '4월', '6월', '8월', '10월'],
    bars: true,
  }),
  w('honey-go', 'safety', '안전검사', '법정 안전검사 일정', ['s', 'm', 'l'], {
    kind: 'list',
    rows: [
      { title: '크레인 (5t)', sub: '정기 검사', meta: '11/25', badge: ['warn', 'D-8'] },
      { title: '압력용기', sub: '정기 검사', meta: '12/10', badge: ['neutral', 'D-23'] },
      { title: '지게차 3대', sub: '자체 점검', meta: '완료', badge: ['ok', '완료'] },
    ],
  }),
  w('honey-go', 'alerts', '알림', '자산 관련 새 알림', ['s', 'm'], {
    kind: 'list',
    rows: [
      { title: '계측기 교정 만료 임박 2건', meta: '방금', badge: ['danger', '중요'] },
      { title: '비품 반납 요청 (모니터)', meta: '1시간 전' },
      { title: '자산 실사 일정 안내', meta: '어제' },
    ],
  }),
  w('honey-go', 'approvals', '승인', '자산 취득 · 처분 결재', ['s', 'm'], {
    kind: 'list',
    rows: [
      { title: '노트북 5대 취득', sub: '연구개발팀', badge: ['warn', '대기'] },
      { title: '절단기 B 처분', sub: '생산팀', badge: ['warn', '대기'] },
      { title: '공구 세트 이관', sub: '품질팀', badge: ['ok', '승인'] },
    ],
  }),
  w('honey-go', 'settings', '설정', '자산 분류 · 상각 방법 · 담당자', ['s', 'm'], {
    kind: 'actions',
    lead: '자산 분류, 감가상각 방법, 부서별 담당자를 정합니다.',
    actions: ['자산 분류', '상각 방법', '담당자 지정'],
  }),

  // ------------------------------------------------------------ 연구노트 (역할별)
  w('research-note', 'my-logs', '내 업무일지', '최근 작성한 업무일지', ['m', 's', 'l'], {
    kind: 'list',
    rows: [
      { title: '압출 다이 온도 프로파일 실험 #14', meta: '오늘', badge: ['warn', '작성 중'] },
      { title: '6063 합금 경도 측정 결과', meta: '어제', badge: ['ok', '서명 완료'] },
      { title: '표면 처리 조건 비교', meta: '11/14', badge: ['ok', '서명 완료'] },
      { title: '시편 가공 일정 정리', meta: '11/13', badge: ['ok', '서명 완료'] },
    ],
  }, rn('researcher')),
  w('research-note', 'drive', '드라이브', '최근 올린 연구 파일', ['s', 'm', 'l'], {
    kind: 'list',
    rows: [
      { title: '경도측정_1115.xlsx', sub: '2.4MB', meta: '어제' },
      { title: '다이설계_v5.dwg', sub: '18MB', meta: '11/14' },
      { title: '현미경_사진_묶음.zip', sub: '142MB', meta: '11/12' },
    ],
  }, rn('researcher')),
  w('research-note', 'projects', '프로젝트 내역', '내가 맡은 과제 진행률', ['m', 'l', 'xl'], {
    kind: 'monitor',
    units: [
      { name: '경량 압출재 개발', state: 'run', value: '3차년도 · 노트 128건', load: 72 },
      { name: '표면 처리 공정 개선', state: 'run', value: '2차년도 · 노트 64건', load: 45 },
      { name: '재활용 빌렛 품질', state: 'idle', value: '보고서 대기', load: 90 },
    ],
  }, rn('manager')),
  w('research-note', 'review', '서명 대기 노트', '책임자 확인이 필요한 노트', ['s', 'm'], {
    kind: 'list',
    rows: [
      { title: '열처리 조건 실험 #9', sub: '이서연', badge: ['warn', '확인 필요'] },
      { title: '인장 시험 결과', sub: '박민수', badge: ['warn', '확인 필요'] },
      { title: '금형 수명 분석', sub: '정하늘', badge: ['danger', '7일 경과'] },
    ],
  }, rn('manager')),
  w('research-note', 'archive', '아카이브 내역', '전사 연구노트 보관 현황', ['m', 's', 'l'], {
    kind: 'stats',
    tiles: [
      { label: '보관 노트', value: '4,812', unit: '건' },
      { label: '이번 달 보관', value: '96', unit: '건', delta: ['accent', '+14'] },
      { label: '서명 누락', value: '7', unit: '건', delta: ['danger', '확인'] },
      { label: '보존 기한 도래', value: '21', unit: '건' },
    ],
    trend: series(5, 12, 90, 20),
  }, rn('admin')),
  w('research-note', 'audit', '노트 감사 현황', '작성 · 서명 규정 준수율', ['s', 'm'], {
    kind: 'chart',
    label: '규정 준수율',
    value: '98.2%',
    delta: ['ok', '+0.6%p'],
    series: [95.1, 96, 96.4, 97.2, 97.6, 98.2],
  }, rn('admin')),
  ...opsWidgets,
]
