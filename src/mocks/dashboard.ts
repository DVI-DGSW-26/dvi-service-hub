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
    body: '올해 연말 정산은 12월 1일(화)부터 12월 19일(금)까지 진행합니다.\n\n1. 홈택스 간소화 자료를 PDF로 내려받아 경영관리팀 메일로 보내 주세요.\n2. 부양가족이 바뀐 분은 가족관계증명서를 함께 내 주세요.\n3. 의료비 · 교육비 중 간소화 자료에 없는 항목은 영수증 원본이 필요합니다.\n\n기한을 넘기면 1월 급여 정산에 반영되지 않으니 꼭 기한 안에 내 주세요. 문의: 경영관리팀 내선 210',
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
    date: '2026-11-22',
    when: '11.22 (일) 02:00 ~ 06:00',
    body: 'DB 서버 보안 패치와 백업 장비 교체를 진행합니다.\n점검 시간에는 MES 접속과 생산 실적 입력이 되지 않습니다. 야간 근무조는 실적을 종이 일지에 적어 두었다가 점검이 끝난 뒤 입력해 주세요.\n\n문의: 기술부설연구소 IT 담당',
    url: 'https://dvision.dvi-ind.com/',
  },
  {
    id: 'm-rn-1114',
    kind: '안내',
    title: '연구노트 버전 업데이트 안내',
    date: '2026-11-19',
    when: '11.19 (목)',
    url: 'https://research-note.dvi-ind.com/',
  },
  {
    id: 'm-hr-1125',
    kind: '안내',
    title: '하이요 연차 신청 화면 개편',
    date: '2026-11-25',
    when: '11.25 (수)',
    body: '연차 · 반차 신청 화면이 한 장으로 합쳐집니다. 남은 연차가 신청 화면 위에 바로 보입니다.',
    url: 'https://hr.dvi-ind.com/',
  },
  {
    id: 'm-exp-1128',
    kind: '점검',
    title: '사무실 경비 서버 이전',
    date: '2026-11-28',
    when: '11.28 (토) 09:00 ~ 12:00',
    url: 'https://expenses.dvi-ind.com/',
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
  // 아래는 그림 없는 소식 — 소식이 많을 때 패널이 길어지지 않는지 보는 용도
  {
    id: 'nw-1002',
    title: '3분기 우수 제안 시상',
    summary: '공정 개선 · 원가 절감 제안 5건이 3분기 우수 제안으로 뽑혔습니다.',
    date: '2026-10-02',
    body: '3분기 사내 제안 제도에서 공정 개선과 원가 절감 제안 5건이 우수 제안으로 뽑혔습니다. 시상은 10월 정례회의에서 진행했습니다.',
    url: 'https://flow.team/',
  },
  {
    id: 'nw-0918',
    title: '신규 입사자 환영회',
    summary: '9월 입사한 구성원 4명을 위한 환영회가 열렸습니다.',
    date: '2026-09-18',
    body: '9월에 입사한 연구개발팀 · 생산팀 구성원 4명을 위한 환영회가 본사 구내식당에서 열렸습니다.',
    url: 'https://company-events-theta.vercel.app/',
  },
  {
    id: 'nw-0905',
    title: '띵동 디지털 명함 개편',
    summary: '이메일 서명에 회사 로고와 연락처가 새 양식으로 들어갑니다.',
    date: '2026-09-05',
    body: '띵동 디지털 명함과 이메일 서명이 새 양식으로 바뀌었습니다. 띵동에서 내 명함을 열어 새 서명을 복사해 쓰면 됩니다.',
    url: 'https://ddingdong.dvi-ind.com/',
  },
  {
    id: 'nw-0822',
    title: '여름 휴가 사진 공모 결과',
    summary: '임직원 투표로 고른 여름 휴가 사진 다섯 점을 소개합니다.',
    date: '2026-08-22',
    body: '여름 휴가 사진 공모에 34점이 올라왔고, 임직원 투표로 다섯 점을 골랐습니다. 뽑힌 사진은 본사 로비에 한 달 동안 걸립니다.',
    url: 'https://company-events-theta.vercel.app/',
  },
  {
    id: 'nw-0808',
    title: '품질팀 ISO 9001 갱신 심사 통과',
    summary: '3년 주기 갱신 심사를 지적 사항 없이 마쳤습니다.',
    date: '2026-08-08',
    body: '품질팀이 ISO 9001 갱신 심사를 지적 사항 없이 마쳤습니다. 준비에 함께한 생산 · 구매 · 연구소 담당자분들께 감사드립니다.',
    url: 'https://flow.team/',
  },
  {
    id: 'nw-0725',
    title: '구내식당 메뉴 사전 투표 시작',
    summary: '다음 달 특식 메뉴를 띵동에서 미리 골라 주세요.',
    date: '2026-07-25',
    body: '구내식당 특식 메뉴를 사전 투표로 정합니다. 매달 마지막 주 금요일까지 띵동에서 투표할 수 있습니다.',
    url: 'https://ddingdong.dvi-ind.com/',
  },
]

// 플로우 PC 앱 주소 — 설치할 때 앱이 직접 등록하는 스킴이다 (레지스트리 HKCU\Software\Classes\flownew).
// 액션 없이 부르면 앱이 창을 앞으로 가져오고, 꺼져 있으면 OS 가 앱을 띄운다. 앱이 없으면 웹으로 넘어간다 (lib/openApp.ts)
const FLOW_APP_URL = 'flownew://'
export const quickLinks: QuickLink[] = [
  { id: 'q-flow', title: '플로우 바로가기', description: '업무 협업 · 공지 · 일정', icon: 'flow', url: 'https://flow.team/', appUrl: FLOW_APP_URL },
  { id: 'q-home', title: '회사 홈페이지', description: 'dvi-ind.com', icon: 'globe', url: 'https://dvi-ind.com/' },
  { id: 'q-org', title: '조직도', description: '부서 · 구성원 정보', icon: 'org', url: '#/info/org', modal: 'org' },
  { id: 'q-mail', title: 'Gmail 바로가기', description: '받은편지함 열기', icon: 'mail', url: 'https://mail.google.com/' },
]

export const notifications: PortalNotification[] = [
  { id: 'nt-1', title: '연말 정산 안내가 등록되었습니다.', time: '오늘 09:12', read: false, url: 'https://flow.team/' },
  { id: 'nt-2', title: 'MES 정기 점검이 예정되어 있습니다.', time: '어제 17:40', read: false, url: 'https://dvision.dvi-ind.com/' },
  { id: 'nt-3', title: '사내 기술 세미나 후기가 올라왔습니다.', time: '11.10 (화)', read: true, url: 'https://company-events-theta.vercel.app/' },
]
