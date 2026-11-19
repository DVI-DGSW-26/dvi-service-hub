import type { Me } from '@dvi/core/types'

export const hasNoDepartment = (me: Me | null) => me !== null && !me.realm.includes('employee')

/**
 * 허브 쓰기 권한 — service-hub 클라이언트 롤(명세 1.2). realm 의 admin 은 보지 않는다.
 * 롤은 로그인할 때 쿠키에 담기므로 롤을 바꾼 뒤에는 다시 로그인해야 반영된다.
 * 버튼만 숨긴다, 막는 건 서버가 한다. (임시 관리자 HUB_ADMIN_EMAILS 는 서버만 안다 — 그 사람에게는 버튼이 안 보인다)
 */
const HUB_CLIENT = 'service-hub'
const hasHubRole = (me: Me | null, role: string) => {
  const roles = me?.svc[HUB_CLIENT] ?? []
  return roles.includes(role) || roles.includes('admin')
}

/** 점검 · 안내 등록 · 삭제 — maintenance:write 또는 admin */
export const canWriteMaintenance = (me: Me | null) => hasHubRole(me, 'maintenance:write')

/** 전사 공지 등록 · 삭제 — notice:write 또는 admin */
export const canWriteNotice = (me: Me | null) => hasHubRole(me, 'notice:write')
