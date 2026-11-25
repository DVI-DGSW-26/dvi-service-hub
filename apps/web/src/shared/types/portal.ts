// 포털 화면이 쓰는 데이터 모양. 서버 응답은 포털 대시보드 API 명세(v0.5)를 따른다 —
// 값이 없는 칸은 null 이 아니라 빠져서 온다(그래서 ?: 로 둔다).

/** /api/auth/me 응답 */
export interface Me {
  signedIn: boolean
  name: string
  email: string
  /** 토큰에 부서 클레임이 생기면 채운다. 없으면 헤더에 이메일을 보여준다. */
  department?: string
  realm: string[]
  svc: Record<string, string[]>
  /** 세션 만료 시각(초). 화면이 끝나기 전에 늘린다 (shared/api/session.ts) */
  exp?: number
}

/** 아이콘은 문자열 키로 받고 화면에서 lucide 아이콘으로 바꾼다 (shared/ui/Icon.tsx) */
export type IconName =
  | 'flow'
  | 'folder'
  | 'org'
  | 'headset'
  | 'file'
  | 'book'
  | 'gift'
  | 'help'
  | 'globe'
  | 'mail'

/** 전사 공지 (GET /notices) — 종료일이 없어 지울 때까지 보인다 */
export interface Notice {
  /** 숫자로 된 문자열 */
  id: string
  title: string
  /** 공지 줄에 한 줄로 보여줄 요약 */
  summary: string
  /** 펼쳐 보는 전체 내용. 줄바꿈(
)이 든 일반 글자 */
  body: string
  /** 등록한 날 YYYY-MM-DD (서버가 채운다) */
  date: string
  important: boolean
  /** 원문 링크. 없으면 칸이 빠진다 */
  url?: string
}

/** 전사 공지 등록 (POST /notices) */
export interface NoticeInput {
  /** 100자 이하 */
  title: string
  /** 150자 이하 */
  summary: string
  /** 5,000자 이하 */
  body: string
  important: boolean
  /** http:// · https:// 로 시작, 500자 이하. 없으면 null */
  url: string | null
}

/** 점검 종류 — 화면 문구는 사전(home.maintenance.kind)에서 */
export type MaintenanceKind = 'MAINTENANCE' | 'NOTICE' | 'INCIDENT'

/** 시스템 점검 · 안내 (GET /maintenance) — 점검 당일까지 보인다 */
export interface Maintenance {
  id: string
  kind: MaintenanceKind
  /** 대상 업무시스템 id (GET /services 의 id). '기타'면 칸이 빠진다 */
  serviceId?: string
  title: string
  /** YYYY-MM-DD */
  date: string
  /** HH:mm — 입력하지 않았으면 칸이 빠진다 */
  start?: string
  end?: string
  /** 작업 내용 · 영향 범위. 줄바꿈이 든 일반 글자 */
  body: string
  /** 대상 시스템 주소. 없으면 칸이 빠진다 */
  url?: string
}

/** 점검 · 안내 등록 (POST /maintenance) */
export interface MaintenanceInput {
  kind: MaintenanceKind
  /** null 이면 '기타' */
  serviceId: string | null
  /** 100자 이하 */
  title: string
  /** YYYY-MM-DD */
  date: string
  /** HH:mm. end 만 있으면 서버가 거절한다 */
  start: string | null
  end: string | null
  /** 2,000자 이하 */
  body: string
  /** '기타'일 때만 저장된다 */
  url: string | null
}

/**
 * 일정 한 건 (플로우 "대외업무 공유방").
 *   하루 안의 시간 일정  allDay: false, start · end
 *   하루짜리 종일 일정   allDay: true
 *   여러 날 일정         allDay: true, startDate · endDate — 걸친 날마다 나온다
 */
export interface ScheduleItem {
  /** flow-ev-<eventSrno>[-<repeatInstanceId>] */
  id: string
  title: string
  allDay: boolean
  /** HH:mm */
  start?: string
  end?: string
  /** YYYY-MM-DD — 여러 날 일정의 첫날 · 끝나는 날 */
  startDate?: string
  endDate?: string
  /** #RRGGBB — 플로우가 분류 이름을 주지 않아 색으로 구분한다 */
  color?: string
}

/** 하루치 일정 (GET /schedule) — 일정이 없는 날도 items: [] 로 온다 */
export interface ScheduleDay {
  /** YYYY-MM-DD */
  date: string
  items: ScheduleItem[]
}

/** 사내 주요 소식 한 건 (행사 아카이브) */
export interface NewsItem {
  id: string
  title: string
  summary: string
  /** YYYY-MM-DD 행사 날짜 */
  date: string
  /** 줄바꿈이 든 일반 글자. 없으면 빈 문자열 */
  body: string
  /** 작은 그림(긴 변 400px). 주소는 30~60분 뒤 만료된다 */
  image?: string
  /** 큰 그림(긴 변 1920px) */
  imageLarge?: string
  url: string
}

/** GET /news 한 쪽 */
export interface NewsPage {
  /** 전체 행사 수 */
  total: number
  /** 다음 쪽을 물을 값. 뜻을 해석하지 말고 그대로 돌려보낸다. 마지막 쪽이면 없다 */
  nextCursor?: string
  items: NewsItem[]
}

export interface QuickLink {
  id: string
  title: string
  description: string
  icon: IconName
  url: string
  /** 기기별 앱 주소. 있으면 앱으로 먼저 열어 보고, 앱이 없으면 url 을 연다 (lib/openApp.ts). pc 는 스킴, android 는 intent:// */
  app?: { pc?: string; android?: string }
  /** 앱으로 열지 웹으로 열지 먼저 묻는다(다시 묻지 않기를 고르면 그 답대로). 없으면 앱 주소가 있는 기기에서 바로 앱으로 */
  ask?: true
  /** 페이지로 가지 않고 홈에서 바로 여는 창. url 은 새 탭(가운데 누르기)용으로 남긴다 */
  modal?: 'org'
}

/** 회사 캘린더 한 줄 (GET /calendar) — 플로우 방의 일정을 한 건당 한 줄로 */
export interface CalendarEvent {
  id: string
  kind: 'event'
  title: string
  /** 첫날 YYYY-MM-DD */
  date: string
  /** 여러 날 일정의 끝나는 날. 하루짜리면 없다 */
  end?: string
  source: 'flow'
  /** #RRGGBB */
  color?: string
}

/** 팀 아래 담당 하나. 그 아래 담당이 더 있으면 units (예: 생산관리 → AL압출 · 정밀가공) */
export interface OrgUnit {
  name: string
  units?: string[]
}

/** 조직도의 팀 하나와 그 아래 담당 */
export interface OrgTeam {
  id: string
  name: string
  units: OrgUnit[]
}

/** 조직도 — 대표 → 총괄 → (옆 가지) 자문 → 팀들 */
export interface OrgChart {
  head: string
  /** 대표 바로 아래 칸 (총괄관리). 팀들과 자문은 여기서 갈라진다 */
  chief?: string
  advisors: string[]
  teams: OrgTeam[]
}

/**
 * 로그인 수단 하나 (Keycloak credential). 날짜 · 시각은 따로 온다 (명세 1.3).
 * 요청 중인 API — docs/bd.md 3.1
 */
export interface Credential {
  /** Keycloak credential id — 삭제(delete_credential:<id>)에 쓴다 */
  id: string
  /** 등록할 때 붙인 이름. 없으면 칸이 빠진다 */
  label?: string
  /** 패스키를 만든 곳 ('Google Password Manager' · 'Windows Hello' 등). 모르면 칸이 빠진다 */
  provider?: string
  /** YYYY-MM-DD */
  createdDate: string
  /** HH:mm */
  createdTime?: string
}

/** GET /account/credentials — 내 로그인 수단 */
export interface AccountCredentials {
  /** 비밀번호가 없는 계정(외부 로그인만)이면 칸이 빠진다 */
  password?: Credential
  otp: Credential[]
  passkeys: Credential[]
}
