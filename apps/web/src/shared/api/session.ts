// 허브 로그인 유지 — 세션 갱신(/api/auth/refresh)과 통합 로그인으로 보내기.
//
// hub_session 은 10분이면 끝나고 /api/auth/refresh 가 refresh token 으로 늘린다 (api/auth/refresh.ts).
// refresh token 은 한 번만 쓸 수 있어 두 요청이 같이 갱신하면 하나가 실패한다. 그래서
//   - 이 탭 안에서는 진행 중인 갱신 하나를 모두 같이 기다리고
//   - 탭끼리는 Web Locks 로 차례를 세운다. 기다리는 동안 앞 탭이 이미 늘렸으면(저장해 둔 만료 시각이 바뀜) 다시 하지 않는다
//
// 갱신이 거절되면 버튼 없이 바로 통합 로그인으로 보낸다. SSO 가 살아 있으면 화면 없이 돌아온다.
// 다녀온 지 1분 안에 또 보내게 되면 반복으로 보고 멈춘 뒤 안내한다.

import { apiLog, newId } from './logger'

/** 세션 만료 시각(초) — 탭끼리 나눠 보려고 localStorage 에 둔다 */
const EXP_KEY = 'hub:session-exp'
/** 마지막으로 로그인에 보낸 시각 (sessionStorage) */
const LOGIN_KEY = 'hub:login-redirect'
/** 로그인에 보낸 뒤 이 안에 또 보내게 되면 반복으로 보고 멈춘다 */
const LOGIN_LOOP_MS = 60_000
/** 끝나기 이만큼(초) 전부터 미리 늘린다 */
const RENEW_BEFORE_S = 120

/**
 *   renewed  늘렸다(다른 탭이 늘린 것 포함) — 같은 요청을 다시 보내면 된다
 *   expired  거절됐다 — 통합 로그인으로 보내야 한다
 *   failed   통합 로그인 서버에 닿지 못했다 · 함수가 없다(로컬 vite) — 세션은 그대로 두고 오류만 보인다
 */
export type Renewal = 'renewed' | 'expired' | 'failed'

function readExp(): number {
  try {
    return Number(localStorage.getItem(EXP_KEY)) || 0
  } catch {
    return 0
  }
}

/** 받은 세션 만료 시각을 적어 둔다 (/api/auth/me · /api/auth/refresh 응답) */
export function noteSessionExp(exp: number | undefined) {
  if (!exp) return
  try {
    localStorage.setItem(EXP_KEY, String(exp))
  } catch {
    // 저장소를 못 쓰면 미리 늘리지 못할 뿐 — 401 에서 늘린다
  }
}

async function callRefresh(): Promise<Renewal> {
  const id = newId()
  let res: Response
  try {
    res = await fetch('/api/auth/refresh', { method: 'POST', headers: { Accept: 'application/json', 'X-Request-Id': id } })
  } catch {
    apiLog.hint(`세션 갱신 실패 from=network #${id} — /api/auth/refresh 에 닿지 못했습니다`)
    return 'failed'
  }
  // #id 로 Vercel Logs 를 찾으면 이유(refresh.rejected · refresh.missing 줄의 rid)가 나온다. Vercel 이 직접 낸 오류면 x-vercel-error 가 붙는다
  const vercelError = res.headers.get('x-vercel-error')
  const where = `from=${vercelError ? `vercel(${vercelError})` : 'hub-web'} #${id} vercel=${res.headers.get('x-vercel-id') ?? '-'}`
  if (res.status === 401) {
    apiLog.hint(`세션 갱신 거절(401) ${where} — 통합 로그인으로 보냅니다`)
    return 'expired'
  }
  // 로컬 vite 에는 함수가 없어 index.html 이 온다
  if (!res.ok || !String(res.headers.get('content-type')).includes('application/json')) {
    apiLog.hint(`세션 갱신 실패(${res.status}) ${where} — 세션은 그대로 두고 요청만 실패로 둡니다`)
    return 'failed'
  }
  const body = (await res.json().catch(() => null)) as { exp?: number } | null
  noteSessionExp(body?.exp)
  return 'renewed'
}

let inflight: Promise<Renewal> | null = null

/** 세션을 한 번 늘린다. 이 탭에서 이미 늘리는 중이면 그 결과를 같이 기다린다 */
export function renewSession(): Promise<Renewal> {
  if (inflight) return inflight
  const seen = readExp()
  const run = (): Promise<Renewal> => (readExp() !== seen ? Promise.resolve('renewed') : callRefresh())
  // Web Locks 가 없는 브라우저는 탭끼리 줄을 세우지 못한다 — 겹치면 한쪽이 로그인을 한 번 다녀온다
  const locks = (navigator as Partial<Navigator>).locks
  inflight = (locks ? locks.request('hub:session-renew', run) : run()).finally(() => {
    inflight = null
  })
  return inflight
}

/** 화면을 여는 동안 세션이 끝나기 전에 늘린다. 숨긴 탭은 쉬고, 다시 보일 때 확인한다 */
export function keepSessionAlive() {
  const check = () => {
    if (document.visibilityState !== 'visible') return
    const exp = readExp()
    if (!exp || exp - Date.now() / 1000 > RENEW_BEFORE_S) return
    void renewSession().then((r) => {
      if (r === 'expired') toLogin()
    })
  }
  setInterval(check, 30_000)
  document.addEventListener('visibilitychange', check)
}

let leaving = false

/** 허브 로그인으로 보낸다. 돌아오면 지금 보던 화면(주소 · 쿼리 · 해시)으로 */
export function toLogin() {
  // 패널마다 401 이 오므로 한 번만
  if (leaving) return
  leaving = true
  try {
    if (Date.now() - Number(sessionStorage.getItem(LOGIN_KEY) ?? 0) < LOGIN_LOOP_MS) {
      showLoginStuck()
      return
    }
    sessionStorage.setItem(LOGIN_KEY, String(Date.now()))
  } catch {
    // 저장소를 못 쓰면(시크릿 모드 등) 반복을 막지 못하지만 보낸다
  }
  window.location.href = loginUrl()
}

const loginUrl = () => '/api/auth/login?next=' + encodeURIComponent(location.pathname + location.search + location.hash)

/** 로그인을 다녀왔는데 또 세션이 거절됐다 — 끝없이 오가지 않게 멈추고 알린다. 링크는 사람이 눌러 다시 시도한다 */
function showLoginStuck() {
  const en = document.documentElement.lang.startsWith('en')
  const box = document.createElement('div')
  box.setAttribute('role', 'alert')
  box.style.cssText =
    'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;max-width:calc(100% - 32px);' +
    'padding:12px 16px;border-radius:10px;background:#1B2428;color:#fff;font:14px/1.6 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.25)'
  box.textContent = en
    ? 'Could not keep you signed in. Please try again in a moment. '
    : '로그인을 이어가지 못했습니다. 잠시 뒤 다시 시도해 주세요. '
  const link = document.createElement('a')
  link.href = loginUrl()
  link.textContent = en ? 'Sign in again' : '다시 로그인'
  link.style.cssText = 'color:#FFB38A;text-decoration:underline'
  box.append(link)
  document.body.append(box)
}
