// 서비스 목록. 새 서비스는 이 배열에 항목을 추가하면 된다.

export type Category = '업무' | '인사' | '정보' | '사내문화'

/** 로그인 방식. SSO 전환이 끝난 서비스는 'sso'로 바꾼다. */
export type AuthMode = 'sso' | 'separate' | 'none'

/**
 * 이 링크를 누구에게 보여줄 것인가.
 * 부서 이름으로 판단하지 않는다 — 부서가 늘 때마다 허브를 고치게 된다.
 * 토큰에 실려온 역할로만 판단한다 (docs/service-hub.md §2).
 *
 *   public    로그인과 무관하게 항상 (회사 홈페이지)
 *   any       항상 표시 — 개별 로그인이라 접근 판단을 그쪽이 한다
 *   employee  realm 역할 employee — 부서가 배정된 재직자 전부
 *   client    해당 서비스의 client 역할이 있어야 보인다
 *
 * 링크를 숨기는 것은 안내이고 차단이 아니다. 실제 차단은 각 서비스가 한다.
 */
export type Access =
  | { type: 'public' }
  | { type: 'any' }
  | { type: 'employee' }
  | { type: 'client'; client: string; role: string }

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
  access: Access
  /** public/logos 아래 파일 경로. 없으면 emoji를 표시 */
  logo?: string
  emoji: string
}

export const services: Service[] = [
  // 회사 홈페이지는 목록에 두지 않는다 — 대외 공개 사이트라 로그인이 필요한
  // 사내 서비스 허브의 대상이 아니다 (2026-09-28 결정).
  {
    id: 'kwak-flow',
    name: '콱플로우',
    description: 'TODO: 서비스 설명을 입력하세요.',
    category: '업무',
    links: [{ label: '열기', url: 'https://dvi-frontend-nine.vercel.app/' }],
    auth: 'separate', // SSO 전환 예정 — client(quality)는 등록돼 있다
    access: { type: 'any' },
    logo: '/logos/kwak-flow.png',
    emoji: '🌊',
  },
  {
    id: 'dding-dong',
    name: '띵동',
    description: '사내 디지털 명함 · 이메일 서명 서비스',
    category: '업무',
    links: [{ label: '열기', url: 'https://ddingdong.dvi-ind.com/' }],
    auth: 'sso',
    access: { type: 'employee' },
    logo: '/logos/dding-dong.png',
    emoji: '🔔',
  },
  {
    id: 'taltal',
    name: '탈탈',
    description: '정부·지자체 지원사업 공고를 지역·카테고리·신청기간으로 검색',
    category: '정보',
    links: [{ label: '열기', url: 'https://dvi-taltal.vercel.app/' }],
    auth: 'sso',
    access: { type: 'employee' },
    logo: '/logos/taltal.svg',
    emoji: '🔎',
  },
  {
    id: 'honey-go',
    name: '자기Go',
    description: '자산·기자재 관리',
    category: '업무',
    links: [{ label: '열기', url: 'https://honey-go.vercel.app/' }],
    auth: 'sso',
    access: { type: 'client', client: 'jagigo', role: 'user' },
    logo: '/logos/honey-go.svg',
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
    auth: 'sso',
    access: { type: 'client', client: 'hi-yo', role: 'user' },
    logo: '/logos/haiyo.png',
    emoji: '👋',
  },
  {
    id: 'company-events',
    name: '행사 아카이브',
    description: '사내 행사 기록 보관소',
    category: '사내문화',
    links: [{ label: '열기', url: 'https://company-events-theta.vercel.app/' }],
    auth: 'sso',
    access: { type: 'employee' },
    emoji: '🎉',
  },
]
