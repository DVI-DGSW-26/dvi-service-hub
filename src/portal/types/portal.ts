// 포털 화면이 쓰는 데이터 모양. 지금은 src/mocks 가 채우고,
// 실제 API 가 생기면 같은 모양으로 내려주면 화면은 고칠 필요가 없다.

/** /api/auth/me 응답 */
export interface Me {
  signedIn: boolean
  name: string
  email: string
  /** 토큰에 부서 클레임이 생기면 채운다. 없으면 헤더에 이메일을 보여준다. */
  department?: string
  realm: string[]
  svc: Record<string, string[]>
}

/** 아이콘은 문자열 키로 받고 화면에서 lucide 아이콘으로 바꾼다 (components/ui/Icon.tsx) */
export type IconName =
  | 'flow'
  | 'folder'
  | 'org'
  | 'headset'
  | 'file'
  | 'book'
  | 'gift'
  | 'help'

/** 전사 공지 (플로우 연동 예정) */
export interface Notice {
  id: string
  title: string
  summary: string
  /** YYYY-MM-DD */
  date: string
  important: boolean
  url: string
}

export type MaintenanceKind = '안내' | '점검' | '장애'

/** 시스템 점검 · 업데이트 안내 */
export interface Maintenance {
  id: string
  kind: MaintenanceKind
  title: string
  /** 화면에 그대로 보여줄 일정 문구 */
  when: string
  url: string
}

export type ScheduleColor = 'violet' | 'amber' | 'teal' | 'accent'

/** 오늘의 일정 (플로우 캘린더 연동 예정) */
export interface ScheduleItem {
  id: string
  title: string
  /** HH:mm */
  start: string
  end: string
  color: ScheduleColor
  /** 장소 · 방식 (전체 일정 모달에 보여준다) */
  place?: string
}

/** 하루치 일정 — 전체 일정 모달에서 지난 날짜를 넘겨 보고 검색한다 */
export interface ScheduleDay {
  /** YYYY-MM-DD */
  date: string
  items: ScheduleItem[]
}

export interface NewsItem {
  id: string
  title: string
  summary: string
  date: string
  /** 소식 모달에 보여줄 본문 */
  body: string
  /** 그림 주소. 없으면 자리표시 그림을 보여준다 */
  image?: string
  url: string
}

export interface QuickLink {
  id: string
  title: string
  description: string
  icon: IconName
  url: string
}

export interface InfoDocument {
  id: string
  title: string
  updated: string
  url: string
}

/** 사내정보센터 분류 */
export interface InfoCategory {
  id: string
  title: string
  description: string
  icon: IconName
  documents: InfoDocument[]
}

export interface Faq {
  id: string
  question: string
  answer: string
}

export interface PortalNotification {
  id: string
  title: string
  /** 화면에 그대로 보여줄 시각 문구 */
  time: string
  read: boolean
  url: string
}

/** 등록한 패스키(지문 · 얼굴 · 보안키) 하나 */
export interface Passkey {
  id: string
  /** 등록할 때 붙인 이름 또는 기기 이름 */
  name: string
  /** YYYY-MM-DD */
  added: string
  /** 화면에 그대로 보여줄 마지막 사용 문구 */
  lastUsed: string
}

/** 로그인한 기기 (SSO 세션) */
export interface SignInSession {
  id: string
  device: 'desktop' | 'mobile'
  /** 'Windows · Chrome' 처럼 화면에 그대로 */
  client: string
  /** 'IP 대략 위치' — 사내망이면 '사내망' */
  place: string
  /** 화면에 그대로 보여줄 마지막 활동 문구 */
  lastActive: string
  /** 지금 이 브라우저 */
  current: boolean
}

/** 계정 설정 화면의 로그인 수단 · 기기 요약 (Keycloak 계정 API 연동 예정) */
export interface AccountSecurity {
  password: {
    /** YYYY-MM-DD */
    changed: string
  }
  otp: {
    registered: boolean
    /** 'Google Authenticator' 처럼 등록할 때 붙인 이름 */
    label?: string
    added?: string
  }
  passkeys: Passkey[]
  sessions: SignInSession[]
}
