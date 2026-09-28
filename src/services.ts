// 서비스 목록. 새 서비스는 이 배열에 항목을 추가하면 된다.

export type Category = '업무' | '인사' | '정보' | '사내문화'

/** 로그인 방식. SSO 전환이 끝난 서비스는 'sso'로 바꾼다. */
export type AuthMode = 'sso' | 'separate' | 'none'

export interface ServiceLink {
  label: string
  url: string
}

export interface Service {
  id: string
  name: string
  description: string
  category: Category
  /** 첫 번째 링크가 카드의 기본 이동 대상 */
  links: ServiceLink[]
  auth: AuthMode
  emoji: string
}

export const services: Service[] = [
  {
    id: 'kwak-flow',
    name: '콱플로우',
    description: 'TODO: 서비스 설명을 입력하세요.',
    category: '업무',
    links: [{ label: '열기', url: 'https://dvi-frontend-nine.vercel.app/' }],
    auth: 'separate',
    emoji: '🌊',
  },
  {
    id: 'dding-dong',
    name: '띵동',
    description: '사내 디지털 명함 · 이메일 서명 서비스',
    category: '업무',
    links: [{ label: '열기', url: 'https://dding-dong.vercel.app/' }],
    auth: 'separate',
    emoji: '🔔',
  },
  {
    id: 'taltal',
    name: '탈탈',
    description: '정부·지자체 지원사업 공고를 지역·카테고리·신청기간으로 검색',
    category: '정보',
    links: [{ label: '열기', url: 'https://dvi-taltal.vercel.app/' }],
    auth: 'separate',
    emoji: '🔎',
  },
  {
    id: 'honey-go',
    name: '자기Go',
    description: '자산·기자재 관리',
    category: '업무',
    links: [{ label: '열기', url: 'https://honey-go.vercel.app/' }],
    auth: 'separate',
    emoji: '📦',
  },
  {
    id: 'haiyo',
    name: '하이요',
    description: 'HR 서비스 (구성원용 / 관리자용)',
    category: '인사',
    links: [
      { label: '구성원', url: 'https://hr.dvi-ind.com/' },
      { label: '관리자', url: 'https://hr-admin.dvi-ind.com/' },
    ],
    auth: 'separate',
    emoji: '👋',
  },
  {
    id: 'company-events',
    name: '행사 아카이브',
    description: '사내 행사 기록 보관소',
    category: '사내문화',
    links: [{ label: '열기', url: 'https://company-events-theta.vercel.app/' }],
    auth: 'separate',
    emoji: '🎉',
  },
]
