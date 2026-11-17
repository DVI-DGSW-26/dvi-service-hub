// 허브 서버의 기존 API — 서비스 목록 · 내 즐겨찾기 · 최근 사용 · 서비스 관리 · 플로우 글.
// feat/flow-posts 브랜치의 src/api.ts(fetch)를 axios 로 옮긴 것이다. 경로 · 모양은 그대로다.

import type { AuthMode, Service, ServiceLink } from '../services'
import { ApiError } from './errors'
import { hubApi, seg } from './http'

type Opts = { signal?: AbortSignal }

/**
 * 서버 응답을 Service[] 로 확인한다. 모양이 어긋난 항목은 버린다 —
 * 화면이 links[0] 을 바로 읽기 때문에, 잘못된 항목 하나가 전체를 깨뜨리면 안 된다.
 * 쓸 수 있는 항목이 하나도 없으면 null.
 */
function parseServices(data: unknown): Service[] | null {
  if (!Array.isArray(data)) return null
  const out = data.filter(isService)
  return out.length > 0 ? out : null
}

const AUTH: AuthMode[] = ['sso', 'separate', 'none']

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
    AUTH.includes(s.auth as AuthMode)
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

/** 서비스 목록. 서버가 응답하지 않거나 모양이 어긋나면 예외 — 호출부가 내장 목록(services.ts)으로 돌아간다 */
export async function fetchServices({ signal }: Opts = {}): Promise<Service[]> {
  const list = parseServices(await hubApi.get<unknown>('/services', { signal }))
  if (!list) throw new ApiError(500, 'UNKNOWN', '서비스 목록을 읽지 못했습니다.') // 모양이 틀린 응답 — 다시 받아도 같으니 재시도(502) 대상이 아니다
  return list
}

export interface HubMe {
  /** "서비스 관리" 버튼을 보여줄지. 실제 차단은 서버가 한다 */
  admin: boolean
  favorites: string[]
  recent: string[]
}

export const meApi = {
  get: ({ signal }: Opts = {}) => hubApi.get<HubMe>('/me', { signal }),
  addFavorite: (serviceId: string) => hubApi.put(`/me/favorites/${seg(serviceId)}`),
  removeFavorite: (serviceId: string) => hubApi.delete(`/me/favorites/${seg(serviceId)}`),
  importFavorites: (ids: string[]) => hubApi.post('/me/favorites/import', { ids }),
  markRecent: (serviceId: string) => hubApi.post(`/me/recent/${seg(serviceId)}`),
}

/** 관리 화면이 다루는 서비스 — 숨김 여부가 붙는다 */
export interface AdminService extends Service {
  enabled: boolean
}

/** 등록 · 수정 요청 본문. id 는 등록할 때만 쓰인다 */
export type ServiceInput = Omit<AdminService, 'logo'> & {
  logo: string | null
  switcher: { position: 'left' | 'right' | null; offset: number | null } | null
}

/** 서비스 관리 (서버가 admin 만 들인다) */
export const adminServicesApi = {
  list: ({ signal }: Opts = {}) => hubApi.get<AdminService[]>('/admin/services', { signal }),
  create: (input: ServiceInput) => hubApi.post<AdminService>('/admin/services', input),
  update: (serviceId: string, input: ServiceInput) => hubApi.put<AdminService>(`/admin/services/${seg(serviceId)}`, input),
  remove: (serviceId: string) => hubApi.delete(`/admin/services/${seg(serviceId)}`),
  reorder: (ids: string[]) => hubApi.post('/admin/services/reorder', { ids }),
}

/** 플로우 "대외업무 공유방"의 글 한 건. 로그인한 본인의 플로우 계정 기준이다 */
export interface FlowPost {
  id: string
  /** post 글 · task 업무 · schedule 일정 · todo 할일 */
  type: 'post' | 'task' | 'schedule' | 'todo' | 'other'
  title: string
  content: string
  author: string
  /** 한국 시각, 예: 2026-05-09T09:30 */
  registeredAt?: string
  commentCount: number
  /** 본인이 읽었는지. 플로우가 알려주지 않은 글에는 없다 */
  read?: boolean
}

export interface FlowPostPage {
  projectTitle?: string
  posts: FlowPost[]
  hasNext: boolean
  nextCursor?: number
}

export const flowApi = {
  posts: (cursor: number, pageSize: number, { signal }: Opts = {}) => hubApi.get<FlowPostPage>('/flow/posts', { params: { cursor, pageSize }, signal }),
}

/**
 * 그 방을 본인 계정으로 플로우에서 여는 주소. 서버가 플로우의 본인용 로그인 링크로 넘겨 보낸다(302).
 * axios 로 부르지 않고 링크의 href 로 쓴다 — 브라우저가 따라가야 플로우가 열린다.
 * 일정 원문도 이 주소로 연다(명세 9장).
 */
export const FLOW_OPEN_URL = '/api/hub/flow/open'
