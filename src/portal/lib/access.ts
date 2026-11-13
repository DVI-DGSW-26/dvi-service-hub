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
