/**
 * "이 사람에게 이 서비스를 보여줄 것인가" — 허브 화면과 서비스 이동 버튼이 같이 쓴다.
 * 두 곳이 따로 판단하면 허브에는 안 보이는데 이동 메뉴에는 보이는 일이 생긴다.
 *
 * 숨기는 것은 안내이고 차단이 아니다. 실제 차단은 각 서비스가 한다 (services.ts).
 */
import type { Service } from './services'

/** 토큰에서 꺼낸 역할 (api/auth/callback.js 의 collectRoles) */
export interface Roles {
  realm: string[]
  svc: Record<string, string[]>
}

export function canSee(s: Service, r: Roles): boolean {
  switch (s.access.type) {
    case 'public':
    case 'any':
      return true
    case 'employee':
      return r.realm.includes('employee')
    case 'client':
      return (r.svc[s.access.client] ?? []).includes(s.access.role)
  }
}

/** 서비스들이 돌고 있는 주소(origin) 목록. 허브가 역할을 알려줘도 되는 곳이다. */
export function serviceOrigins(services: Service[]): Set<string> {
  const out = new Set<string>()
  for (const s of services) {
    for (const l of s.links) {
      try { out.add(new URL(l.url).origin) } catch { /* 잘못된 주소는 건너뛴다 */ }
    }
  }
  return out
}
