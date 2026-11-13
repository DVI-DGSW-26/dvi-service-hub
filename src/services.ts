// 서비스의 모양과, 서버가 응답하지 않을 때 쓰는 내장 목록.
//
// 목록의 원본은 허브 서버(service-hub-server)의 DB 다. 화면과 서비스 이동 버튼은
// 서버에서 목록을 받아 쓰고, 서비스 추가·수정은 허브의 "서비스 관리" 화면에서 한다.
// 이 파일의 bundledServices 는 서버가 죽었을 때도 입구가 비지 않게 하는 예비본이다.

/** 서버에서 관리하므로 정해진 값이 아니다. 화면은 목록에 나온 것으로 탭을 만든다. */
export type Category = string

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
  /** 아직 개발 중인 서비스. 카드에 로그인 방식 대신 '개발 중'을 표시한다 */
  inDevelopment?: boolean
  /**
   * 이 서비스 화면에 붙는 "서비스 이동" 버튼(switcher.js)의 자리.
   * 서비스의 버튼·탭바를 가리면 여기서 고친다 — 그 서비스 코드를 다시 고치지 않아도 된다.
   *   position  왼쪽(기본) / 오른쪽 아래
   *   offset    화면 아래에서 버튼까지 px (기본 20). 하단 탭바가 있으면 그 높이 + 20
   */
  switcher?: { position?: 'left' | 'right'; offset?: number }
}

/**
 * 서버 응답을 Service[] 로 확인한다. 모양이 어긋난 항목은 버린다 —
 * 화면과 이동 버튼이 links[0] 을 바로 읽기 때문에, 잘못된 항목 하나가 전체를 깨뜨리면 안 된다.
 * 쓸 수 있는 항목이 하나도 없으면 null (호출부가 내장 목록으로 돌아간다).
 */
export function parseServices(data: unknown): Service[] | null {
  if (!Array.isArray(data)) return null
  const out = data.filter(isService)
  return out.length > 0 ? out : null
}

function isService(x: unknown): x is Service {
  if (typeof x !== 'object' || x === null) return false
  const s = x as Record<string, unknown>
  const access = s.access as Record<string, unknown> | null | undefined
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    typeof s.description === 'string' &&
    typeof s.category === 'string' &&
    typeof s.emoji === 'string' &&
    Array.isArray(s.links) &&
    s.links.length > 0 &&
    s.links.every(isLink) &&
    typeof access === 'object' &&
    access !== null &&
    (access.type === 'public' ||
      access.type === 'any' ||
      access.type === 'employee' ||
      (access.type === 'client' && typeof access.client === 'string' && typeof access.role === 'string')) &&
    (s.auth === 'sso' || s.auth === 'separate' || s.auth === 'none')
  )
}

function isLink(x: unknown): x is ServiceLink {
  if (typeof x !== 'object' || x === null) return false
  const l = x as Record<string, unknown>
  if (typeof l.label !== 'string' || typeof l.url !== 'string') return false
  try {
    const protocol = new URL(l.url).protocol
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * 서버가 응답하지 않을 때만 쓰는 예비 목록 (2026-11-13 서버로 옮긴 시점의 내용).
 * 서버 목록을 크게 바꿨다면 여기도 맞춰 두면 좋지만, 어긋나도 평소 화면에는 영향이 없다.
 */
export const bundledServices: Service[] = [
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
    switcher: { offset: 76 }, // 모바일 하단 탭바(56px) 위로
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
    id: 'research-note',
    name: '연구노트',
    description: '연구노트 · 업무일지 작성',
    category: '업무',
    links: [{ label: '열기', url: 'https://research-note.dvi-ind.com/' }],
    auth: 'sso', 
    access: { type: 'any' },
    logo: '/logos/research-note.png',
    emoji: '📓',
    inDevelopment: false, // 2026-10-29 결정: 개발 완료.
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
  {
    id: 'expenses',
    name: '사무실 경비',
    description: '경비 · 임차관리비 · 구독 결제 관리와 연간 집계',
    category: '업무',
    links: [{ label: '열기', url: 'https://expense-management-zefa.vercel.app/' }],
    auth: 'sso',
    // client(expenses)는 등록돼 있다. 권한 역할 이름이 정해지면 client 로 좁힌다
    access: { type: 'employee' },
    inDevelopment: false, // 2026-11-10 결정: 개발 완료.
    logo: '/logos/expenses.png',
    emoji: '🧾',
  },
  {
    id: 'mes',
    name: 'MES',
    description: '제조 실행 시스템',
    category: '업무',
    links: [{ label: '열기', url: 'https://dvision.dvi-ind.com/' }],
    auth: 'sso',
    access: { type: 'employee' },
    logo: '/logos/homepage.png',
    emoji: '🏭',
  }
]
