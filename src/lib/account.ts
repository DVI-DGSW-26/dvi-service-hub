/** 비밀번호·OTP·패스키(지문) 관리 화면. 주소를 외우게 하지 않고 여기서 닿게
 *  한다 — 직원에게 알려주는 주소는 허브 하나라는 원칙(employee-rollout.md).
 *  로그인 도메인과 같아서 SSO 쿠키로 다시 로그인 없이 열린다.
 *
 *  루트(/account/)가 아니라 로그인 수단 화면으로 바로 보낸다. 계정 콘솔이
 *  이 화면 하나로 줄어 있어(DVI-auth 테마 content.json) 루트는 비어 있다.
 *
 *  referrer 파라미터는 콘솔 상단에 "돌아가기" 링크를 만든다(Keycloak 내장).
 *  referrer_uri 는 service-hub client 의 redirect 목록으로 검증된다. */
/**
 * 로그인 함수(/api/auth/*)를 쓰지 않는 화면 — 로컬 vite(함수가 돌지 않는다)와 목업(dev:mock · Vercel preview,
 * 로그인 서버 설정이 없다). 로그아웃 · 통합 로그인 버튼은 흉내만 낸다
 */
const NO_AUTH = import.meta.env.DEV || import.meta.env.VITE_MOCK

/** 전체 로그아웃(SSO 세션까지). 로그인 함수가 없으면 홈으로 */
export const LOGOUT_URL = NO_AUTH ? '#/' : '/api/auth/logout'

export const ACCOUNT_URL =
  'https://api.dvi-ind.com/dauth/realms/dvi/account/account-security/signing-in' +
  '?referrer=service-hub&referrer_uri=' +
  encodeURIComponent('https://dvi-service-hub.vercel.app/')

/**
 * 통합 로그인(Keycloak)에서 할 일 — Application Initiated Action.
 * 허브 로그인 주소에 kc_action 을 실어 보내면 Keycloak 이 그 화면만 띄우고 끝나면 설정으로 돌려보낸다.
 * 이미 로그인돼 있어 다시 로그인하지 않는다(비밀번호 변경처럼 최근 인증이 필요하면 Keycloak 이 비밀번호를 한 번 묻는다).
 * 서버 API 가 필요 없다 — 허용하는 값은 api/auth/login.ts 가 거른다.
 */
export type AccountAction = 'UPDATE_PASSWORD' | 'CONFIGURE_TOTP' | 'webauthn-register-passwordless' | `delete_credential:${string}`

/** 결과는 돌아온 주소의 ?kc_action=&kc_action_status= 로 온다 (api/auth/callback.ts) */
export type AccountActionStatus = 'success' | 'cancelled' | 'error'

export function accountActionUrl(action: AccountAction) {
  // 로그인 함수가 없다 — 다녀온 것처럼 결과만 붙여 다시 연다
  if (NO_AUTH) return `?kc_action=${encodeURIComponent(action.split(':')[0])}&kc_action_status=success#/account`
  return `/api/auth/login?next=${encodeURIComponent('/#/account')}&action=${encodeURIComponent(action)}`
}

/** 통합 로그인에서 돌아왔으면 그 결과. 주소에서 지우는 일은 부르는 쪽이 한다(clearAccountActionResult) */
export function readAccountActionResult(): { action: string; status: AccountActionStatus } | null {
  const q = new URLSearchParams(location.search)
  const action = q.get('kc_action')
  const status = q.get('kc_action_status')
  if (!action || !status) return null
  return { action, status: status === 'success' || status === 'cancelled' ? status : 'error' }
}

/** 새로 고침해도 같은 안내가 다시 뜨지 않게 주소에서 결과를 지운다 */
export function clearAccountActionResult() {
  const q = new URLSearchParams(location.search)
  if (!q.has('kc_action')) return
  q.delete('kc_action')
  q.delete('kc_action_status')
  const rest = q.toString()
  history.replaceState(history.state, '', `${location.pathname}${rest ? `?${rest}` : ''}${location.hash}`)
}
