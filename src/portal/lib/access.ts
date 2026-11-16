import type { Service } from '../../services'
import type { Me } from '../types/portal'

/** 링크를 숨기는 것은 안내이고 차단이 아니다. 실제 차단은 각 서비스가 한다. */
export function canSee(s: Service, me: Me | null): boolean {
  // 로그인 정보를 아직 못 받았으면 일단 모두 보여준다
  if (!me) return true
  switch (s.access.type) {
    case 'public':
    case 'any':
      return true
    case 'employee':
      return me.realm.includes('employee')
    case 'client':
      return (me.svc[s.access.client] ?? []).includes(s.access.role)
  }
}

export function matchesQuery(s: Service, q: string) {
  const text = `${s.name} ${s.description} ${s.category}`.toLowerCase()
  return text.includes(q.trim().toLowerCase())
}

/** 즐겨찾기를 앞으로, 나머지는 services.ts 순서대로 */
export function sortByFavorite(list: Service[], favorites: string[]) {
  return [...list].sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)))
}

export const hasNoDepartment = (me: Me | null) => me !== null && !me.realm.includes('employee')

/**
 * 시스템 점검 · 안내를 쓸 수 있는 부서. 지금 토큰에는 부서 클레임이 없어서(/api/auth/me 에 department 가 없다)
 * 실제로는 admin 만 쓸 수 있다 — 부서 클레임이나 부서 역할이 생기면 여기만 바꾼다.
 */
const MAINTENANCE_DEPARTMENTS = ['연구개발팀', 'IT개발팀']

/** 점검 · 안내 작성 — admin 또는 연구개발 · IT개발. 버튼만 숨긴다, 막는 건 서버가 한다 */
export const canWriteMaintenance = (me: Me | null) =>
  me !== null && (me.realm.includes('admin') || MAINTENANCE_DEPARTMENTS.includes(me.department ?? ''))

/** 전사 공지 작성 — admin 만 */
export const canWriteNotice = (me: Me | null) => me !== null && me.realm.includes('admin')

/** 회사 캘린더 직접 등록 — admin 또는 행사 아카이브 관리자(company-events: admin) */
export const canWriteCalendar = (me: Me | null) => me !== null && (me.realm.includes('admin') || (me.svc['company-events'] ?? []).includes('admin'))
