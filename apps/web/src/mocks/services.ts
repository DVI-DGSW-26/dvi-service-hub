// pnpm dev:mock 의 서비스 목록 · 내 즐겨찾기 · 최근 사용 · 서비스 관리 · 플로우 공유방 글 (허브 서버의 기존 API)

import { services } from '@/features/systems'
import type { FlowPostPage } from '@/features/flow'
import { seedFlowPosts } from './data'
import { HttpError, bad, blank, done, ok, requireText, type Params, type Result } from './respond'

// 새로 고침하면 처음 상태로 돌아간다
const svc = {
  // 서비스 관리에서 고치는 목록 — 내장 목록에서 시작한다. 숨긴 것(enabled false)은 /services 에 안 나온다
  services: services.map((s) => ({ ...s, enabled: true })),
  // 처음 연 사람 — 이 브라우저의 즐겨찾기가 있으면 화면이 한 번 올려 보낸다(import)
  prefs: { favorites: [] as string[], recent: [] as string[] },
  flowPosts: seedFlowPosts(),
}
type AdminService = (typeof svc.services)[number]

/** 점검 등록이 대상 시스템을 찾는 목록 — 숨긴 서비스는 없는 것 */
export const findService = (id: string) => svc.services.find((s) => s.id === id && s.enabled)

// ---------------------------------------------------------------- 서비스 관리

const SERVICE_ID = /^[a-z0-9][a-z0-9-]{0,49}$/

/** 서비스 등록 · 수정 본문 검사 — 칸 이름 · 한도는 화면(ServiceAdmin)과 같다 */
function adminService(input: Record<string, unknown>, isNew: boolean): AdminService {
  const id = typeof input.id === 'string' ? input.id.trim() : ''
  if (isNew && !SERVICE_ID.test(id)) throw bad('id', 'id 형식이 올바르지 않습니다.')
  if (isNew && svc.services.some((s) => s.id === id)) throw new HttpError(409, 'SERVICE_ID_DUPLICATE', '이미 있는 id 입니다.', 'id')
  const links = Array.isArray(input.links) ? (input.links as { label?: unknown; url?: unknown }[]) : []
  if (links.length === 0 || links.length > 5 || links.some((l) => blank(l.label) || !/^https?:\/\/\S+$/.test(String(l.url)))) throw bad('links', '주소를 확인해 주세요.')
  const access = input.access as AdminService['access'] | undefined
  if (!access || (access.type === 'client' && (blank(access.client) || blank(access.role)))) throw bad('access', '공개 범위를 확인해 주세요.')
  const switcher = input.switcher as { position: 'left' | 'right' | null; offset: number | null } | null
  const s: AdminService = {
    id,
    name: requireText(input, 'name', '이름', 100),
    description: typeof input.description === 'string' ? input.description.trim() : '',
    category: requireText(input, 'category', '분류', 20) as AdminService['category'],
    links: links.map((l) => ({ label: String(l.label).trim(), url: String(l.url).trim() })),
    auth: input.auth as AdminService['auth'],
    access,
    emoji: requireText(input, 'emoji', '이모지', 16),
    inDevelopment: input.inDevelopment === true,
    enabled: input.enabled !== false,
  }
  if (typeof input.logo === 'string' && input.logo) s.logo = input.logo
  if (switcher) s.switcher = { position: switcher.position ?? undefined, offset: switcher.offset ?? undefined }
  return s
}

/** 이 파일이 맡는 길이 아니면 undefined — server.ts 가 다음 길을 본다 */
export function servicesRoute(method: string, path: string, params: Params, input: Record<string, unknown>, scenarios: Set<string>): Result | undefined {
  const empty = scenarios.has('empty')
  if (method === 'get' && path === '/services') return ok(svc.services.filter((s) => s.enabled).map((s) => ({ ...s, enabled: undefined })), '서비스 목록 조회 성공')

  // 내 즐겨찾기 · 최근 사용
  if (method === 'get' && path === '/me') return ok({ admin: !scenarios.has('readonly'), ...svc.prefs }, '내 정보 조회 성공')
  if (method === 'post' && path === '/me/favorites/import') {
    const ids = Array.isArray(input.ids) ? input.ids.filter((x): x is string => typeof x === 'string' && svc.services.some((s) => s.id === x)) : []
    svc.prefs.favorites = [...new Set([...svc.prefs.favorites, ...ids])]
    return done('즐겨찾기 가져오기 성공')
  }
  let m: RegExpExecArray | null = /^\/me\/(favorites|recent)\/([^/]+)$/.exec(path)
  if (m) {
    const id = decodeURIComponent(m[2])
    if (!svc.services.some((s) => s.id === id)) throw new HttpError(404, 'SERVICE_NOT_FOUND', '서비스를 찾을 수 없습니다.')
    const fav = svc.prefs.favorites.filter((x) => x !== id)
    if (m[1] === 'favorites' && method === 'put') svc.prefs.favorites = [...fav, id]
    else if (m[1] === 'favorites' && method === 'delete') svc.prefs.favorites = fav
    else if (m[1] === 'recent' && method === 'post') svc.prefs.recent = [id, ...svc.prefs.recent.filter((x) => x !== id)].slice(0, 4)
    else throw new HttpError(405, 'METHOD_NOT_ALLOWED', '지원하지 않는 요청입니다.')
    return done('저장 성공')
  }

  // 서비스 관리
  if (path.startsWith('/admin/') && scenarios.has('readonly')) throw new HttpError(403, 'ACCESS_DENIED', '접근 권한이 없습니다.')
  if (method === 'get' && path === '/admin/services') return ok(svc.services, '서비스 관리 목록 조회 성공')
  if (method === 'post' && path === '/admin/services') {
    const s = adminService(input, true)
    svc.services.push(s)
    return ok(s, '서비스 등록 성공', 201)
  }
  if (method === 'post' && path === '/admin/services/reorder') {
    const ids = Array.isArray(input.ids) ? (input.ids as unknown[]) : []
    if (ids.length !== svc.services.length || !svc.services.every((s) => ids.includes(s.id))) throw bad('ids', '모든 서비스의 id 를 한 번씩 보내 주세요.')
    svc.services.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
    return done('순서 변경 성공')
  }
  m = /^\/admin\/services\/([^/]+)$/.exec(path)
  if (m) {
    const id = decodeURIComponent(m[1])
    const i = svc.services.findIndex((s) => s.id === id)
    if (i < 0) throw new HttpError(404, 'SERVICE_NOT_FOUND', '서비스를 찾을 수 없습니다.')
    if (method === 'put') {
      svc.services[i] = adminService({ ...input, id }, false)
      return ok(svc.services[i], '서비스 수정 성공')
    }
    if (method === 'delete') {
      svc.services.splice(i, 1)
      svc.prefs.favorites = svc.prefs.favorites.filter((x) => x !== id)
      svc.prefs.recent = svc.prefs.recent.filter((x) => x !== id)
      return done('서비스 삭제 성공')
    }
  }

  // 플로우 공유방 글
  if (method === 'get' && path === '/flow/posts') {
    if (scenarios.has('error')) throw new HttpError(503, 'FLOW_NOT_CONFIGURED', '플로우 연동이 설정되지 않았습니다.')
    if (scenarios.has('forbidden')) throw new HttpError(403, 'FLOW_FORBIDDEN', '플로우에서 이 방의 참여자가 아닙니다.')
    const cursor = Number(params.cursor ?? 0)
    const size = Number(params.pageSize ?? 5)
    const all = empty ? [] : svc.flowPosts
    const page: FlowPostPage = { projectTitle: '대외업무 공유방', posts: all.slice(cursor, cursor + size), hasNext: cursor + size < all.length }
    if (page.hasNext) page.nextCursor = cursor + size
    return ok(page, '플로우 글 조회 성공')
  }
  return undefined
}
