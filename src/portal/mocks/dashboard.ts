// 홈 화면 목업 데이터. 플로우 · 사내 게시판 연동 전까지 화면을 채우는 용도다.
// 실제 데이터로 바꿀 때는 src/api/portal.ts 만 고친다.

import newsResearchNote from '../assets/news-research-note.svg'
import newsSeminar from '../assets/news-seminar.svg'
import newsWorkshop from '../assets/news-workshop.svg'
import type { Maintenance, NewsItem, Notice, PortalNotification, QuickLink, ScheduleColor, ScheduleDay, ScheduleItem } from '../types/portal'

export const notices: Notice[] = [
  {
    id: 'n-2026-1113',
    title: '2026년 연말 정산 관련 안내',
    summary: '연말 정산 일정 및 제출 서류, 유의사항을 안내드립니다.',
    date: '2026-11-13',
    important: true,
    url: 'https://flow.team/',
  },
  {
    id: 'n-2026-1110',
    title: '사내 보안 점검 협조 요청',
    summary: '11월 셋째 주 PC 보안 점검이 진행됩니다. 자리 비움 시 화면 잠금을 해주세요.',
    date: '2026-11-10',
    important: false,
    url: 'https://flow.team/',
  },
  {
    id: 'n-2026-1104',
    title: '동절기 사무실 난방 운영 시간 변경',
    summary: '11월부터 난방은 평일 08:00 ~ 19:00 에 운영합니다.',
    date: '2026-11-04',
    important: false,
    url: 'https://flow.team/',
  },
]

export const maintenance: Maintenance[] = [
  {
    id: 'm-mes-1116',
    kind: '점검',
    title: 'MES 정기 점검 안내',
    when: '11.16 (일) 02:00 ~ 06:00',
    url: 'https://dvision.dvi-ind.com/',
  },
  {
    id: 'm-rn-1114',
    kind: '안내',
    title: '연구노트 버전 업데이트 안내',
    when: '11.14 (금)',
    url: 'https://research-note.dvi-ind.com/',
  },
]

// 하루 일정이 많은 날을 가정 — 패널은 지금부터 3건만, 나머지는 전체 일정 모달에서 본다
export const schedule: ScheduleItem[] = [
  { id: 's-1', title: '팀 아침 스탠드업', start: '08:30', end: '08:50', color: 'accent', place: '연구개발팀 자리' },
  { id: 's-2', title: '협력사 납품 일정 확인', start: '09:00', end: '09:30', color: 'teal', place: '전화' },
  { id: 's-3', title: '연구개발 정례회의', start: '10:00', end: '11:00', color: 'violet', place: '본사 대회의실' },
  { id: 's-4', title: '시제품 시험 결과 검토', start: '11:10', end: '11:50', color: 'amber', place: '시험실 2' },
  { id: 's-5', title: '점심 · 신규 입사자 환영', start: '12:00', end: '13:00', color: 'teal', place: '구내식당' },
  { id: 's-6', title: '특허 출원 서류 검토', start: '13:30', end: '14:00', color: 'accent', place: '화상 회의' },
  { id: 's-7', title: '신규 과제 착수 논의', start: '14:00', end: '15:00', color: 'amber', place: '소회의실 B' },
  { id: 's-8', title: '정부 과제 중간 보고 준비', start: '15:10', end: '16:00', color: 'violet', place: '연구개발팀 자리' },
  { id: 's-9', title: '월간 성과 공유', start: '16:30', end: '17:30', color: 'teal', place: '본사 대회의실' },
  { id: 's-10', title: '설비 점검 일정 협의', start: '17:30', end: '17:50', color: 'accent', place: '생산동 사무실' },
  { id: 's-11', title: '해외 협력사 화상 미팅', start: '18:00', end: '18:40', color: 'violet', place: '화상 회의' },
  { id: 's-12', title: '주간 업무 일지 작성', start: '18:40', end: '19:00', color: 'amber', place: '연구노트' },
]

// 지난 날짜 일정을 만들 재료. 같은 날짜는 언제 열어도 같은 일정이 나오도록 날짜로 씨앗을 정한다
const PAST_TITLES: [string, string][] = [
  ['팀 아침 스탠드업', '연구개발팀 자리'],
  ['연구개발 정례회의', '본사 대회의실'],
  ['시제품 시험 결과 검토', '시험실 2'],
  ['협력사 납품 일정 확인', '전화'],
  ['특허 출원 서류 검토', '화상 회의'],
  ['정부 과제 중간 보고 준비', '연구개발팀 자리'],
  ['설비 점검 일정 협의', '생산동 사무실'],
  ['해외 협력사 화상 미팅', '화상 회의'],
  ['품질 이슈 원인 분석', '품질팀 회의실'],
  ['신규 장비 도입 검토', '소회의실 A'],
  ['안전 교육 (정기)', '교육장'],
  ['구매 요청 승인 검토', '그룹웨어'],
  ['고객사 기술 문의 회신', '메일'],
  ['연구노트 주간 점검', '연구노트'],
  ['부서 간 협업 회의', '소회의실 B'],
  ['시험 성적서 작성', '연구개발팀 자리'],
]
const SLOTS = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30']
const COLORS: ScheduleColor[] = ['violet', 'amber', 'teal', 'accent']

/** 날짜 씨앗으로 매번 같은 순서를 내는 난수 */
function seeded(seed: number) {
  let x = seed
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648
    return x / 2147483648
  }
}

const pad = (n: number) => String(n).padStart(2, '0')
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function pastDay(d: Date): ScheduleItem[] {
  const iso = isoDate(d)
  const rand = seeded(Number(iso.replaceAll('-', '')))
  const weekend = d.getDay() === 0 || d.getDay() === 6
  const count = weekend ? Math.floor(rand() * 2) : 3 + Math.floor(rand() * 7)
  const slots = [...SLOTS].sort(() => rand() - 0.5).slice(0, count).sort()
  return slots.map((start, i) => {
    const [title, place] = PAST_TITLES[Math.floor(rand() * PAST_TITLES.length)]
    const [h, m] = start.split(':').map(Number)
    const end = `${pad(h + (m === 30 ? 1 : 0))}:${m === 30 ? '00' : '30'}`
    return { id: `${iso}-${i}`, title, place, start, end, color: COLORS[Math.floor(rand() * COLORS.length)] }
  })
}

/** 오늘부터 지난 days 일까지, 최근 날짜가 먼저 */
export function scheduleHistory(days = 14): ScheduleDay[] {
  const today = new Date()
  return Array.from({ length: days + 1 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    return { date: isoDate(d), items: i === 0 ? schedule : pastDay(d) }
  })
}

export const news: NewsItem[] = [
  {
    id: 'nw-1110',
    title: '사내 기술 세미나 성료',
    summary: '최신 연구 동향과 기술 사례를 공유한 사내 세미나가 성황리에 마무리되었습니다.',
    date: '2026-11-10',
    body: '11월 10일 본사 대회의실에서 하반기 사내 기술 세미나가 열렸습니다. 연구개발팀의 신규 과제 소개와 생산 현장의 개선 사례 발표가 이어졌고, 발표 자료는 행사 아카이브에서 다시 볼 수 있습니다.',
    image: newsSeminar,
    url: 'https://company-events-theta.vercel.app/',
  },
  {
    id: 'nw-1028',
    title: '하반기 워크숍 사진 공개',
    summary: '10월 하반기 워크숍 현장 사진이 행사 아카이브에 올라왔습니다.',
    date: '2026-10-28',
    body: '10월 하반기 워크숍에서 찍은 단체 사진과 프로그램 사진이 행사 아카이브에 올라왔습니다. 원본 사진은 행사 아카이브에서 내려받을 수 있습니다.',
    image: newsWorkshop,
    url: 'https://company-events-theta.vercel.app/',
  },
  {
    id: 'nw-1015',
    title: '연구노트 서비스 정식 오픈',
    summary: '연구노트 · 업무일지를 회사 계정으로 바로 작성할 수 있습니다.',
    date: '2026-10-15',
    body: '연구노트 서비스가 정식으로 열렸습니다. 별도 가입 없이 회사 계정으로 로그인해 연구노트와 업무일지를 작성할 수 있습니다. 사용법은 사내정보의 업무 매뉴얼을 참고해 주세요.',
    image: newsResearchNote,
    url: 'https://research-note.dvi-ind.com/',
  },
]

export const quickLinks: QuickLink[] = [
  { id: 'q-flow', title: '플로우 바로가기', description: '업무 협업 · 공지 · 일정', icon: 'flow', url: 'https://flow.team/' },
  { id: 'q-forms', title: '업무 서식함', description: '공통 서식 및 양식', icon: 'folder', url: '#/info/forms' },
  { id: 'q-org', title: '조직도', description: '부서 · 구성원 정보', icon: 'org', url: '#/info/org' },
  { id: 'q-help', title: '시스템 문의', description: '계정 · 접속 · 장애 문의', icon: 'headset', url: '#/guide' },
]

export const notifications: PortalNotification[] = [
  { id: 'nt-1', title: '연말 정산 안내가 등록되었습니다.', time: '오늘 09:12', read: false, url: 'https://flow.team/' },
  { id: 'nt-2', title: 'MES 정기 점검이 예정되어 있습니다.', time: '어제 17:40', read: false, url: 'https://dvision.dvi-ind.com/' },
  { id: 'nt-3', title: '사내 기술 세미나 후기가 올라왔습니다.', time: '11.10 (화)', read: true, url: 'https://company-events-theta.vercel.app/' },
]
