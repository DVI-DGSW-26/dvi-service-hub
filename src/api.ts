/**
 * 허브 서버(service-hub-server) 호출.
 *
 * 화면은 서버를 직접 부르지 않고 같은 주소의 /api/hub 로 부른다. Vercel 이 그 요청을
 * 서버로 넘기면서(vercel.json rewrites) 허브 로그인 쿠키를 함께 실어 보내고, 서버는
 * 그 쿠키를 검증한다. 그래서 여기서는 토큰을 다루지 않는다.
 */
import { parseServices, type Service } from './services'

const HUB_API = '/api/hub'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

async function call<T>(path: string, init?: { method: string; body?: unknown }): Promise<T> {
  const res = await fetch(HUB_API + path, {
    method: init?.method ?? 'GET',
    headers: init?.body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  let json: { data?: T; message?: string } | null = null
  try { json = await res.json() } catch { /* 본문이 JSON 이 아니면 상태코드만 쓴다 */ }
  if (!res.ok) throw new ApiError(res.status, json?.message || `요청을 처리하지 못했습니다. (${res.status})`)
  return json?.data as T
}

/** 서비스 목록. 서버가 응답하지 않거나 모양이 어긋나면 예외 — 호출부가 내장 목록으로 돌아간다. */
export async function fetchServices(): Promise<Service[]> {
  const list = parseServices(await call<unknown>('/services'))
  if (!list) throw new ApiError(502, '서비스 목록을 읽지 못했습니다.')
  return list
}

export interface HubMe {
  /** "서비스 관리" 버튼을 보여줄지. 실제 차단은 서버가 한다 */
  admin: boolean
  favorites: string[]
  recent: string[]
}

export const fetchHubMe = () => call<HubMe>('/me')

const id = encodeURIComponent

export const addFavorite = (serviceId: string) => call<void>(`/me/favorites/${id(serviceId)}`, { method: 'PUT' })
export const removeFavorite = (serviceId: string) => call<void>(`/me/favorites/${id(serviceId)}`, { method: 'DELETE' })
export const importFavorites = (ids: string[]) => call<void>('/me/favorites/import', { method: 'POST', body: { ids } })
export const markRecent = (serviceId: string) => call<void>(`/me/recent/${id(serviceId)}`, { method: 'POST' })

/** 관리 화면이 다루는 서비스 — 숨김 여부가 붙는다 */
export interface AdminService extends Service {
  enabled: boolean
}

/** 등록·수정 요청 본문. id 는 등록할 때만 쓰인다 */
export type ServiceInput = Omit<AdminService, 'logo' | 'switcher'> & {
  logo: string | null
  switcher: { position: 'left' | 'right' | null; offset: number | null } | null
}

export const fetchAdminServices = () => call<AdminService[]>('/admin/services')
export const createService = (input: ServiceInput) => call<AdminService>('/admin/services', { method: 'POST', body: input })
export const updateService = (serviceId: string, input: ServiceInput) =>
  call<AdminService>(`/admin/services/${id(serviceId)}`, { method: 'PUT', body: input })
export const deleteService = (serviceId: string) => call<void>(`/admin/services/${id(serviceId)}`, { method: 'DELETE' })
export const reorderServices = (ids: string[]) => call<void>('/admin/services/reorder', { method: 'POST', body: { ids } })
