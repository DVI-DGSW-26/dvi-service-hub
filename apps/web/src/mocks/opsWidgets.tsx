// 목업 서비스 위젯 — 사내 운영(행사 아카이브 · 사무실 경비 · MES · Debrief). widgets.tsx 가 뒤에 붙인다

import type { WidgetDef } from '@/features/home'
import { series, w } from './widgetKit'

export const opsWidgets: WidgetDef[] = [
  // ------------------------------------------------------------ 행사 아카이브
  w('company-events', 'recent', '최근 행사', '최근 열린 사내 행사', ['m', 's', 'l'], {
    kind: 'list',
    rows: [
      { title: '2026 하반기 워크숍', sub: '사진 214장', meta: '11/07' },
      { title: '창립 12주년 기념식', sub: '사진 96장', meta: '10/15' },
      { title: '추석 선물 전달', sub: '사진 32장', meta: '09/26' },
      { title: '여름 체육대회', sub: '사진 158장', meta: '08/29' },
    ],
  }),
  w('company-events', 'create', '행사 등록', '새 행사와 사진을 올리기', ['s', 'm'], {
    kind: 'actions',
    lead: '행사 이름 · 날짜를 정하고 사진을 올리면 사내 소식에도 실립니다.',
    actions: ['행사 등록', '사진 올리기'],
  }),
  w('company-events', 'manage', '행사 관리', '공개 범위 · 사진 정리', ['s', 'm'], {
    kind: 'stats',
    tiles: [
      { label: '전체 행사', value: '48', unit: '건' },
      { label: '비공개', value: '3', unit: '건' },
      { label: '사진', value: '6,120', unit: '장' },
      { label: '정리 필요', value: '2', unit: '건', delta: ['warn', '확인'] },
    ],
  }),

  // ------------------------------------------------------------ 사무실 경비
  w('expenses', 'history', '경비 내역', '최근 경비 사용', ['m', 's', 'l', 'xl'], {
    kind: 'list',
    rows: [
      { title: '사무용품 구매', sub: '쿠팡 · 법인카드', meta: '84,200원', badge: ['ok', '정산'] },
      { title: '거래처 미팅 식대', sub: '영업팀', meta: '126,000원', badge: ['warn', '증빙 필요'] },
      { title: '택배비', sub: 'CJ대한통운', meta: '32,500원', badge: ['ok', '정산'] },
      { title: '정수기 필터 교체', sub: '코웨이', meta: '45,000원', badge: ['ok', '정산'] },
      { title: '회의실 다과', sub: '총무', meta: '28,700원', badge: ['ok', '정산'] },
    ],
  }),
  w('expenses', 'subscriptions', '구독 내역', '매달 나가는 구독 서비스', ['s', 'm', 'l'], {
    kind: 'list',
    rows: [
      { title: 'Microsoft 365', sub: '42석', meta: '월 1,134,000원' },
      { title: 'Adobe CC', sub: '3석', meta: '월 231,000원' },
      { title: 'Figma', sub: '2석', meta: '월 64,000원' },
      { title: 'Flow', sub: '전사', meta: '월 380,000원' },
    ],
  }),
  w('expenses', 'lease', '임차 관리비 내역', '사무실 · 공장 임차료와 관리비', ['m', 's', 'l'], {
    kind: 'chart',
    label: '이번 달 임차 · 관리비',
    value: '1,820만 원',
    delta: ['warn', '난방비 +6%'],
    series: [1710, 1705, 1720, 1700, 1690, 1695, 1700, 1715, 1740, 1760, 1790, 1820],
    bars: true,
    labels: ['12월', '2월', '4월', '6월', '8월', '10월'],
  }),
  w('expenses', 'yearly', '연간 집계', '올해 경비 합계 · 항목별', ['l', 'm', 'xl'], {
    kind: 'stats',
    tiles: [
      { label: '올해 누적', value: '3.84', unit: '억 원' },
      { label: '예산 대비', value: '82', unit: '%', delta: ['ok', '여유'] },
      { label: '최다 항목', value: '임차료' },
      { label: '전년 대비', value: '+4.1', unit: '%', delta: ['warn', '증가'] },
    ],
    trend: [2800, 3020, 3150, 3080, 3200, 3310, 3290, 3420, 3510, 3600, 3700, 3840],
  }),
  w('expenses', 'vehicles', '차번 계청', '법인 차량별 사용 내역', ['s', 'm', 'l'], {
    kind: 'list',
    rows: [
      { title: '12가 3456', sub: '카니발 · 영업팀', meta: '주유 82,000원' },
      { title: '34나 7890', sub: '포터 · 생산팀', meta: '통행료 12,400원' },
      { title: '56다 1234', sub: '아이오닉5 · 총무', meta: '충전 18,300원' },
    ],
  }),

  // ------------------------------------------------------------ MES — 모니터링은 위젯마다 크기가 다르다
  w('mes', 'monitor-summary', '가동 요약', '설비 상태별 대수', ['s', 'm'], {
    kind: 'monitor',
    units: [
      { name: '압출 1', state: 'run' },
      { name: '압출 2', state: 'run' },
      { name: '압출 3', state: 'alarm' },
      { name: '열처리', state: 'run' },
      { name: '절단 A', state: 'idle' },
      { name: '절단 B', state: 'run' },
      { name: '포장', state: 'off' },
      { name: '검사', state: 'run' },
    ],
  }),
  w('mes', 'monitor-press', '압출기 상태', '압출기별 가동 · 부하', ['m', 'l'], {
    kind: 'monitor',
    units: [
      { name: '압출 1호기', state: 'run', value: '6063 · 42m/min', load: 78 },
      { name: '압출 2호기', state: 'run', value: '6061 · 38m/min', load: 64 },
      { name: '압출 3호기', state: 'alarm', value: '다이 온도 512℃ ↑', load: 96 },
    ],
  }),
  w('mes', 'monitor-sensor', '센서 실시간 추이', '다이 온도 최근 1시간', ['l', 'm', 'xl'], {
    kind: 'chart',
    label: '압출 3호기 다이 온도',
    value: '512℃',
    delta: ['danger', '경고 기준 500℃ 초과'],
    series: [478, 481, 480, 484, 487, 486, 490, 494, 497, 501, 506, 512],
    labels: ['-60분', '-45분', '-30분', '-15분', '지금'],
  }),
  w('mes', 'monitor-floor', '공장 전체 모니터링', '모든 라인 상태를 한눈에', ['xl', 'l'], {
    kind: 'monitor',
    units: [
      { name: '빌렛 가열로', state: 'run', value: '480℃', load: 70 },
      { name: '압출 1호기', state: 'run', value: '42m/min', load: 78 },
      { name: '압출 2호기', state: 'run', value: '38m/min', load: 64 },
      { name: '압출 3호기', state: 'alarm', value: '다이 512℃', load: 96 },
      { name: '냉각 테이블', state: 'run', value: '28℃', load: 40 },
      { name: '스트레처', state: 'idle', value: '자재 대기', load: 0 },
      { name: '절단 A', state: 'idle', value: '금형 교체', load: 0 },
      { name: '절단 B', state: 'run', value: '6m 절단', load: 55 },
      { name: '시효로', state: 'run', value: '185℃', load: 82 },
      { name: '표면 처리', state: 'run', value: '아노다이징', load: 61 },
      { name: '포장', state: 'off', value: '교대 대기' },
      { name: '출하 검사', state: 'run', value: '12건 진행', load: 48 },
    ],
  }),
  w('mes', 'query', '데이터 조회', '생산 · 품질 데이터 검색', ['s', 'm'], {
    kind: 'search',
    placeholder: '로트 번호 · 제품 코드',
    recent: ['LOT-261117-03', 'AL6063-T5', '압출 3호기 11월'],
  }),
  w('mes', 'sensor-rules', '센서 경고 기준', '센서별 경고 · 정지 기준값', ['s', 'm', 'l'], {
    kind: 'list',
    rows: [
      { title: '다이 온도', sub: '경고 500℃ · 정지 530℃', badge: ['danger', '초과 1'] },
      { title: '빌렛 온도', sub: '경고 500℃ · 정지 520℃', badge: ['ok', '정상'] },
      { title: '주 실린더 압력', sub: '경고 210bar · 정지 230bar', badge: ['ok', '정상'] },
      { title: '냉각수 온도', sub: '경고 35℃', badge: ['ok', '정상'] },
    ],
  }),
  w('mes', 'vendor-new', '업체 등록', '거래처 · 외주 업체 등록', ['s', 'm'], {
    kind: 'actions',
    lead: '등록 업체 86곳. 사업자번호로 찾아 바로 등록할 수 있습니다.',
    actions: ['업체 등록', '업체 목록'],
  }),
  w('mes', 'product-new', '제품 등록', '제품 코드 · 규격 등록', ['s', 'm'], {
    kind: 'actions',
    lead: '등록 제품 342종. 도면과 규격을 함께 올리세요.',
    actions: ['제품 등록', '제품 목록'],
  }),
  w('mes', 'die-new', '금형 등록', '새 금형 등록 · 대장', ['s', 'm'], {
    kind: 'actions',
    lead: '보유 금형 218벌. 새 금형은 도면 번호로 등록합니다.',
    actions: ['금형 등록', '금형 대장'],
  }),
  w('mes', 'die-work', '금형 작업', '금형 교체 · 수리 · 질화', ['m', 's', 'l'], {
    kind: 'list',
    rows: [
      { title: 'D-1042 (창호 프레임)', sub: '압출 3호기 교체', meta: '진행 중', badge: ['accent', '교체'] },
      { title: 'D-0877 (방열판)', sub: '베어링 수정', meta: '11/18', badge: ['warn', '수리'] },
      { title: 'D-0915 (레일)', sub: '질화 처리', meta: '11/19', badge: ['neutral', '질화'] },
    ],
  }),
  w('mes', 'billet', '빌렛', '빌렛 재고 · 투입', ['s', 'm'], {
    kind: 'stats',
    tiles: [
      { label: '재고', value: '84.6', unit: '톤', delta: ['warn', '7일분'] },
      { label: '오늘 투입', value: '12.4', unit: '톤' },
      { label: '입고 예정', value: '40', unit: '톤' },
      { label: '회수 스크랩', value: '3.1', unit: '톤' },
    ],
  }),
  w('mes', 'work-orders', '생산 지시서', '오늘 생산 지시 · 진행률', ['m', 's', 'l'], {
    kind: 'list',
    rows: [
      { title: 'WO-1117-01 창호 프레임', sub: '압출 1호기 · 2,400m', meta: '72%', badge: ['accent', '진행'] },
      { title: 'WO-1117-02 방열판', sub: '압출 2호기 · 1,800m', meta: '40%', badge: ['accent', '진행'] },
      { title: 'WO-1117-03 레일', sub: '압출 3호기 · 900m', meta: '정지', badge: ['danger', '중단'] },
      { title: 'WO-1117-04 파이프', sub: '압출 1호기 · 1,200m', meta: '대기', badge: ['neutral', '대기'] },
    ],
  }),
  w('mes', 'daily-report', '압출 작업일보', '오늘 작업일보 작성 현황', ['s', 'm'], {
    kind: 'list',
    rows: [
      { title: '주간조 작업일보', sub: '작성 박민수', badge: ['ok', '제출'] },
      { title: '야간조 작업일보', sub: '작성 대기', badge: ['warn', '미제출'] },
      { title: '금형 교체 기록', sub: '작성 정하늘', badge: ['ok', '제출'] },
    ],
  }),
  w('mes', 'output', '실적 집계', '일별 생산 실적', ['m', 'l', 'xl'], {
    kind: 'chart',
    label: '오늘 생산 실적',
    value: '18.2톤',
    delta: ['ok', '계획 대비 104%'],
    series: [15.2, 16.8, 17.1, 14.9, 16.2, 17.8, 18.2],
    labels: ['11/11', '11/12', '11/13', '11/14', '11/15', '11/16', '11/17'],
    bars: true,
  }),
  w('mes', 'warehouse', '제품창고', '완제품 재고', ['s', 'm', 'l'], {
    kind: 'stats',
    tiles: [
      { label: '완제품 재고', value: '126', unit: '톤' },
      { label: '적재율', value: '78', unit: '%', delta: ['warn', '높음'] },
      { label: '장기 재고', value: '9', unit: '톤' },
      { label: '오늘 입고', value: '17.6', unit: '톤' },
    ],
    trend: series(8, 12, 120, 12),
  }),
  w('mes', 'shipping', '제품 출하', '오늘 출하 예정 · 완료', ['m', 's', 'l'], {
    kind: 'list',
    rows: [
      { title: '㈜한빛창호', sub: '창호 프레임 4.2톤', meta: '10:00', badge: ['ok', '출하 완료'] },
      { title: '대성전자', sub: '방열판 1.8톤', meta: '13:30', badge: ['accent', '상차 중'] },
      { title: '세명레일', sub: '레일 2.6톤', meta: '16:00', badge: ['neutral', '예정'] },
    ],
  }),

  // ------------------------------------------------------------ Debrief
  w('debrief', 'search', '출장 검색', '지난 출장 · 보고서 찾기', ['s', 'm'], {
    kind: 'search',
    placeholder: '지역 · 업체 · 사람 이름',
    recent: ['대구 전시회', '한빛창호', '베트남'],
  }),
  w('debrief', 'people', '만난 사람', '출장에서 만난 사람', ['m', 's', 'l'], {
    kind: 'list',
    rows: [
      { title: '이정호 부장', sub: '㈜한빛창호 · 구매팀', meta: '11/12' },
      { title: 'Nguyen Van An', sub: 'VietAl · Sales', meta: '10/28' },
      { title: '최수민 책임', sub: '대성전자 · 개발팀', meta: '10/21' },
      { title: '박서준 대표', sub: '세명레일', meta: '10/09' },
    ],
  }),
  w('debrief', 'upcoming', '출장 예정', '다가오는 출장', ['s', 'm'], {
    kind: 'list',
    rows: [
      { title: '부산 · 세명레일 납품 협의', meta: '11/20', badge: ['accent', 'D-3'] },
      { title: '호치민 · VietAl 공장 방문', meta: '12/03', badge: ['neutral', 'D-16'] },
    ],
  }),
  w('debrief', 'visited', '다녀온 곳', '올해 다녀온 출장지', ['m', 's', 'l'], {
    kind: 'stats',
    tiles: [
      { label: '올해 출장', value: '23', unit: '회' },
      { label: '방문 지역', value: '11', unit: '곳' },
      { label: '해외', value: '4', unit: '회' },
      { label: '보고서 미작성', value: '1', unit: '건', delta: ['warn', '작성'] },
    ],
  }),
]
