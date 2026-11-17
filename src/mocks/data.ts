// pnpm dev:mock 의 가짜 데이터. 날짜는 모두 오늘을 기준으로 만든다 — 언제 열어도 '오늘 일정' · '이번 달' 이 차 있다.
// 모양은 포털 대시보드 API 명세 v0.5 를 따른다 (빈 칸은 null 이 아니라 뺀다).

import type { AccountCredentials, Maintenance, NewsItem, Notice } from '../types/portal'
import { addDays, fromIso, pad, toIso } from '../lib/calendar'

export const today = () => toIso(new Date())

/** 날짜 씨앗으로 매번 같은 순서를 내는 난수 — 같은 날은 언제 열어도 같은 일정 */
function seeded(seed: number) {
  let x = seed
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648
    return x / 2147483648
  }
}

// ---------------------------------------------------------------- 공지 · 점검

export function seedNotices(): Notice[] {
  const t = today()
  return [
    {
      id: '21',
      title: '2026년 연말 정산 관련 안내',
      summary: '연말 정산 일정 및 제출 서류, 유의사항을 안내드립니다.',
      body: '올해 연말 정산은 12월 1일(화)부터 12월 19일(금)까지 진행합니다.\n\n1. 홈택스 간소화 자료를 PDF로 내려받아 경영관리팀 메일로 보내 주세요.\n2. 부양가족이 바뀐 분은 가족관계증명서를 함께 내 주세요.\n3. 간소화 자료에 없는 의료비 · 교육비는 영수증 원본이 필요합니다.\n\n문의: 경영관리팀 내선 210',
      date: t,
      important: true,
      url: 'https://flow.team/',
    },
    {
      id: '20',
      title: '사내 보안 점검 협조 요청',
      summary: '이번 주 PC 보안 점검이 진행됩니다. 자리를 비울 때는 화면 잠금을 해 주세요.',
      body: '점검 담당자가 자리로 찾아갑니다.\n자리를 비울 때는 Windows + L 로 화면을 잠가 주세요.',
      date: addDays(t, -3),
      important: false,
    },
    {
      id: '19',
      title: '동절기 사무실 난방 운영 시간 변경',
      summary: '이번 달부터 난방은 평일 08:00 ~ 19:00 에 운영합니다.',
      body: '주말 · 공휴일 근무가 있으면 하루 전까지 경영관리팀에 알려 주세요.',
      date: addDays(t, -9),
      important: false,
      url: 'https://flow.team/',
    },
  ]
}

export function seedMaintenance(): Maintenance[] {
  const t = today()
  return [
    {
      id: '104',
      kind: 'MAINTENANCE',
      serviceId: 'mes',
      title: 'MES 정기 점검 안내',
      date: addDays(t, 6),
      start: '02:00',
      end: '06:00',
      body: 'DB 서버 보안 패치와 백업 장비 교체를 진행합니다.\n점검 시간에는 MES 접속과 생산 실적 입력이 되지 않습니다.',
      url: 'https://dvision.dvi-ind.com/',
    },
    {
      id: '105',
      kind: 'INCIDENT',
      title: '사내 메일 수신 지연',
      date: t,
      start: '09:10',
      body: '외부에서 오는 메일이 10~20분 늦게 도착하고 있습니다. 원인을 확인하고 있습니다.',
    },
    {
      id: '106',
      kind: 'NOTICE',
      serviceId: 'research-note',
      title: '연구노트 버전 업데이트 안내',
      date: addDays(t, 3),
      body: '첨부 파일 미리보기와 검색이 빨라집니다. 업데이트 뒤 한 번 새로 고침해 주세요.',
      url: 'https://research-note.dvi-ind.com/',
    },
    // 지난 점검 — 목록에서 빠져야 한다 (명세 3.1)
    { id: '90', kind: 'MAINTENANCE', title: '지난 점검', date: addDays(t, -2), body: '보이면 안 된다' },
  ]
}

// ---------------------------------------------------------------- 플로우 일정 (오늘의 일정 · 캘린더 공통)

/** 플로우에서 받아 정리한 일정 한 건 — 서버 안쪽 모양. 화면 모양으로는 server.ts 가 바꾼다 */
export interface FlowEvent {
  id: string
  title: string
  startDate: string
  endDate: string
  allDay: boolean
  start?: string
  end?: string
  color?: string
}

const COLORS = ['#4F8EF7', '#FF5733', '#2BB673', '#9B59B6', '#F5A623', '#14B8A6']
const TITLES = [
  '팀 아침 스탠드업',
  '연구개발 정례회의',
  '시제품 시험 결과 검토',
  '협력사 납품 일정 확인',
  '특허 출원 서류 검토',
  '정부 과제 중간 보고 준비',
  '설비 점검 일정 협의',
  '해외 협력사 화상 미팅',
  '품질 이슈 원인 분석',
  '신규 장비 도입 검토',
  '구매 요청 승인 검토',
  '부서 간 협업 회의',
]
const SLOTS = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30']

const plus = (hhmm: string, minutes: number) => {
  const [h, m] = hhmm.split(':').map(Number)
  const t = h * 60 + m + minutes
  return `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`
}

/** 오늘 — 지금 진행 중 · 끝남 · 남음이 고루 보이도록 하루를 채운다 */
function todayEvents(t: string): FlowEvent[] {
  const timed: [string, string, string][] = [
    ['팀 아침 스탠드업', '08:30', '08:50'],
    ['협력사 납품 일정 확인', '09:00', '09:30'],
    ['연구개발 정례회의', '10:00', '11:00'],
    ['시제품 시험 결과 검토', '11:10', '11:50'],
    ['점심 · 신규 입사자 환영', '12:00', '13:00'],
    ['신규 과제 착수 논의', '14:00', '15:00'],
    ['월간 성과 공유', '16:30', '17:30'],
    ['해외 협력사 화상 미팅', '18:00', '18:40'],
    // 자정에 끝나는 일정 — end 가 start 보다 작게 온다 (명세 4.1)
    ['야간 설비 교체 입회', '22:00', '00:00'],
  ]
  const ymd = t.replaceAll('-', '')
  return [
    ...timed.map(([title, start, end], i) => ({ id: `flow-ev-${ymd}${i}`, title, startDate: t, endDate: t, allDay: false, start, end, color: COLORS[i % COLORS.length] })),
    { id: `flow-ev-${ymd}a`, title: '창립기념일 행사 준비', startDate: t, endDate: t, allDay: true, color: '#F5A623' },
    // 플로우가 제목을 빈 문자열로 줄 수 있다 (명세 4.1)
    { id: `flow-ev-${ymd}b`, title: '', startDate: t, endDate: t, allDay: false, start: '15:10', end: '15:40' },
  ]
}

/** 하루에 시작하는 일정들. 여러 날 일정은 시작하는 날에만 만든다 */
function dayEvents(date: string, t: string): FlowEvent[] {
  if (date === t) return todayEvents(t)
  const d = fromIso(date)
  const ymd = date.replaceAll('-', '')
  const rand = seeded(Number(ymd))
  const weekend = d.getDay() === 0 || d.getDay() === 6
  const count = weekend ? Math.floor(rand() * 2) : 2 + Math.floor(rand() * 5)
  const slots = [...SLOTS].sort(() => rand() - 0.5).slice(0, count)
  const out: FlowEvent[] = slots.map((start, i) => ({
    id: `flow-ev-${ymd}${i}`,
    title: TITLES[Math.floor(rand() * TITLES.length)],
    startDate: date,
    endDate: date,
    allDay: false,
    start,
    end: plus(start, rand() < 0.5 ? 30 : 60),
    // 색이 없는 일정도 있다 — 칸이 빠진다
    color: rand() < 0.85 ? COLORS[Math.floor(rand() * COLORS.length)] : undefined,
  }))
  // 매달 1일 · 15일 즈음 여러 날 일정, 가끔 하루 종일 일정
  if (d.getDate() === 3) out.push({ id: `flow-ev-${ymd}h`, title: '임직원 건강검진', startDate: date, endDate: addDays(date, 2), allDay: true, color: '#4F8EF7' })
  if (d.getDate() === 17) out.push({ id: `flow-ev-${ymd}w`, title: '해외 전시회 출장', startDate: date, endDate: addDays(date, 3), allDay: true, color: '#9B59B6' })
  if (!weekend && rand() < 0.15) out.push({ id: `flow-ev-${ymd}d`, title: '외부 교육 (종일)', startDate: date, endDate: date, allDay: true, color: '#2BB673' })
  return out
}

/** from ~ to 에 걸친 일정 — 앞서 시작해 이어지는 여러 날 일정도 넣는다 */
export function flowEvents(from: string, to: string): FlowEvent[] {
  const t = today()
  const out: FlowEvent[] = []
  for (let date = addDays(from, -7); date <= to; date = addDays(date, 1)) {
    for (const e of dayEvents(date, t)) if (e.endDate >= from && e.startDate <= to) out.push(e)
  }
  return out
}

// ---------------------------------------------------------------- 사내 소식

const PHOTO_TONES = [
  ['#1e3a8a', '#60a5fa'],
  ['#14532d', '#4ade80'],
  ['#7c2d12', '#fb923c'],
  ['#581c87', '#c084fc'],
  ['#134e4a', '#2dd4bf'],
  ['#78350f', '#fbbf24'],
]

/** 행사 사진 대신 쓰는 그림 — 바깥 주소를 부르지 않게 data: 주소로 만든다 */
function photo(label: string, i: number, w: number, h: number) {
  const [a, b] = PHOTO_TONES[i % PHOTO_TONES.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 400 260"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="260" fill="url(#g)"/><circle cx="320" cy="60" r="90" fill="#fff" opacity=".08"/><text x="24" y="232" font-family="sans-serif" font-size="22" font-weight="700" fill="#fff" opacity=".9">${label}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function seedNews(): NewsItem[] {
  const t = today()
  const url = 'https://company-events-theta.vercel.app/'
  const raw: [string, string, string, number][] = [
    ['사내 기술 세미나 성료', '최신 연구 동향과 기술 사례를 공유한 사내 세미나가 성황리에 마무리되었습니다.', '발표 6건 · 참석 48명\n질의응답이 길어져 30분 연장했습니다.', 2],
    ['하반기 워크숍 개최', '팀 간 협업을 주제로 1박 2일 워크숍을 진행했습니다.', '1일차: 팀별 과제 발표\n2일차: 협업 개선안 정리', 9],
    ['연구노트 우수 작성자 시상', '이번 분기 연구노트 우수 작성자 3명을 시상했습니다.', '', 15],
    ['신규 시험 장비 도입', '정밀 측정 장비 2대를 시험실에 새로 들였습니다.', '사용 교육은 다음 주 화요일에 있습니다.', 22],
    ['창립 기념 봉사활동', '창립 기념일을 맞아 지역 복지관에서 봉사활동을 했습니다.', '', 30],
    ['안전 보건 캠페인', '동절기 안전 수칙을 함께 점검했습니다.', '미끄럼 주의 구역 표시를 새로 붙였습니다.', 41],
    ['해외 전시회 참가', '해외 전시회에서 신제품을 선보였습니다.', '상담 건수 120건', 55],
    ['', '', '제목과 요약이 없는 행사 — 서버는 summary 가 비면 body 앞 150자를 준다(명세 6.2).', 63],
    ['사내 동호회 발표회', '동호회 활동 사진과 소감을 나누는 자리를 가졌습니다.', '', 70],
  ]
  return raw.map(([title, summary, body, ago], i) => {
    const item: NewsItem = {
      id: `e${20 - i}`,
      title,
      summary: summary.trim() || body.slice(0, 150),
      body,
      date: addDays(t, -ago),
      url,
    }
    // 사진 한쪽만 오는 행사 · 사진이 없는 행사도 섞는다 (명세 6.2)
    if (i === 3) item.imageLarge = photo(title, i, 1920, 1248)
    else if (i !== 5) {
      item.image = photo(title || '행사', i, 400, 260)
      item.imageLarge = photo(title || '행사', i, 1920, 1248)
    }
    return item
  })
}

// ---------------------------------------------------------------- 설정 › 로그인 수단 (docs/bd.md 3.1)

export function seedCredentials(): AccountCredentials {
  return {
    password: { id: '8d1f2c4e-0a6b-4f1e-9c3d-1b2a3c4d5e6f', createdDate: '2026-09-30', createdTime: '08:31' },
    otp: [{ id: '3e7a9b1c-2d4f-4a6b-8c0d-9e8f7a6b5c4d', label: 'otp', createdDate: '2026-09-30', createdTime: '08:33' }],
    passkeys: [
      { id: '5c2b8a7d-1e3f-4b5a-9d6c-7e8f9a0b1c2d', provider: 'Google Password Manager', createdDate: '2026-09-30', createdTime: '08:33' },
      { id: '9a1b2c3d-4e5f-4a6b-8c7d-6e5f4a3b2c1d', label: '업무용 노트북', provider: 'Windows Hello', createdDate: '2026-10-14', createdTime: '17:02' },
    ],
  }
}
