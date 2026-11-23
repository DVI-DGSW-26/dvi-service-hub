/**
 * keycloak.ts — 로그인 토큰으로 세션 쿠키를 만들고, refresh token 으로 갱신한다
 *
 * company-events 의 lib/keycloak.js 와 같은 방식이다 (사내 표준 패턴).
 *
 *   hub_session  서명한 세션          SESSION_SECONDS (10분) — 갱신으로 늘린다
 *   hub_rt       refresh token       refresh_expires_in — SSO 세션 길이
 *   hub_idt      id token            refresh_expires_in — 전체 로그아웃의 id_token_hint
 *   hub_access   역할만 담은 서명값    refresh_expires_in — 다른 사이트의 서비스 이동 버튼
 *
 * ── 갱신을 한 곳에서만 하는 이유 ──────────────────────────────
 * refresh token 은 한 번만 쓸 수 있다 (Keycloak 재사용 탐지). 같은 브라우저에서 두 요청이 동시에
 * 갱신하면 하나가 실패한다. 그래서 갱신은 /api/auth/refresh 에서만 하고, hub_rt 도 그 경로에만 실려 간다.
 * 화면도 한 번에 하나만 부른다 (src/shared/api/session.ts).
 * 갱신이 거절되면(퇴사 · SSO 세션 끝 · 재사용 탐지) 쿠키를 모두 지워 다시 로그인하게 한다.
 */
import { ACCESS_COOKIE, IDTOKEN_COOKIE, REFRESH_COOKIE, SESSION_COOKIE, SESSION_SECONDS, buildAccessCookie, buildCookie,
  signSession, type Session } from './session.js';
import { decodeJwt, type JwtClaims, type OidcMetadata } from './oidc.js';

/** 토큰 엔드포인트 응답 중 이 허브가 쓰는 항목 */
export interface TokenResponse {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  refresh_expires_in?: number;
}

/** refresh_expires_in 이 없거나 0(만료 없는 offline token)일 때 */
const FALLBACK_REFRESH_SECONDS = 12 * 3600;

// Keycloak 내부용이라 화면 판단에 쓰지 않는 역할·클라이언트
const REALM_ROLE_NOISE = new Set(['offline_access', 'uma_authorization']);
const CLIENT_NOISE = new Set(['account', 'account-console', 'broker', 'realm-management']);

/**
 * Keycloak 은 realm_access · resource_access 를 보통 access_token 에만 담는다.
 * (id_token 에 넣으려면 별도 매퍼가 필요하다) 두 토큰을 모두 보고 합친다.
 */
function collectRoles(tokens: (JwtClaims | null)[]): Pick<Session, 'realm' | 'svc'> {
  const realm = new Set<string>();
  const svc: Record<string, string[]> = {};
  for (const t of tokens) {
    if (!t) continue;
    for (const r of t.realm_access?.roles ?? []) {
      if (!REALM_ROLE_NOISE.has(r) && !r.startsWith('default-roles-')) realm.add(r);
    }
    for (const [client, v] of Object.entries(t.resource_access ?? {})) {
      if (CLIENT_NOISE.has(client)) continue;
      svc[client] = [...new Set([...(svc[client] ?? []), ...(v?.roles ?? [])])];
    }
  }
  return { realm: [...realm], svc };
}

/**
 * 받은 토큰으로 로그인 쿠키를 모두 만든다 — 로그인(callback)과 갱신(refresh)이 같이 쓴다.
 * 역할은 매번 새 토큰에서 다시 읽는다. 그래서 권한 변경이 다음 갱신에 반영된다.
 * hub_session 의 모양(sub · email · name · realm · svc · exp)은 service-hub-server 의 HubSession 과 맞춘다.
 */
export async function sessionCookies(
  token: TokenResponse,
  claims: JwtClaims,
  access: JwtClaims | null,
  secret: string,
): Promise<{ cookies: string[]; exp: number }> {
  const now = Math.floor(Date.now() / 1000);
  const keep = Number(token.refresh_expires_in) || FALLBACK_REFRESH_SECONDS;
  const roles = collectRoles([claims, access]);
  /* 사용자 식별은 sub 으로 한다. 이메일은 바뀔 수 있지만 sub 은 바뀌지 않는다. */
  const session: Session = {
    sub: claims.sub ?? '', // 부르는 쪽이 sub 이 있는지 확인한다
    // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/prefer-nullish-coalescing -- 토큰 JSON 값이라 빈 값 · 무엇이 와도 String() 으로 받는다
    email: String(claims.email || '').toLowerCase(),
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 빈 이름도 다음 값으로 넘긴다
    name: claims.name || claims.preferred_username || '사내 계정',
    realm: roles.realm,
    svc: roles.svc,
    exp: now + SESSION_SECONDS,
  };

  const cookies = [buildCookie(SESSION_COOKIE, await signSession(session, secret), SESSION_SECONDS)];
  // 화면 스크립트는 읽지 못한다(HttpOnly). refresh token 을 못 받았으면 세션이 끝날 때 다시 로그인한다
  if (token.refresh_token) cookies.push(buildCookie(REFRESH_COOKIE, token.refresh_token, keep));
  // 전체 로그아웃 때 id_token_hint 로 쓴다
  if (token.id_token) cookies.push(buildCookie(IDTOKEN_COOKIE, token.id_token, keep));
  // 서비스 이동 버튼이 다른 사이트에서 역할을 묻는 데 쓴다 — 허브를 닫아 둔 동안에도 SSO 가 살아 있으면 버튼이 맞게 보이게
  cookies.push(await buildAccessCookie({ realm: session.realm, svc: session.svc, exp: now + keep }, secret));
  return { cookies, exp: session.exp };
}

/** 로그인 쿠키를 모두 지운다 — 갱신이 거절됐을 때 · 로그아웃 */
export const clearSessionCookies = () =>
  [SESSION_COOKIE, REFRESH_COOKIE, IDTOKEN_COOKIE, ACCESS_COOKIE].map((name) => buildCookie(name, '', 0));

/**
 * refresh token 으로 새 토큰을 받는다.
 *   rejected     Keycloak 이 거절했다 — 퇴사 · SSO 세션 끝 · 재사용 탐지. 다시 로그인해야 한다
 *   unreachable  Keycloak 에 닿지 못했다 — 세션은 그대로 두고 나중에 다시 해 본다
 */
export async function refreshTokens(
  meta: OidcMetadata,
  refreshToken: string,
  client: { id: string; secret?: string },
): Promise<TokenResponse | 'rejected' | 'unreachable'> {
  const form = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: client.id });
  if (client.secret) form.set('client_secret', client.secret);
  let res: Response;
  try {
    res = await fetch(meta.token_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: form,
    });
  } catch { return 'unreachable'; }
  // 400 invalid_grant · 401 이 거절이다. 5xx 는 Keycloak 장애라 세션을 지우지 않는다
  if (res.status >= 500) return 'unreachable';
  if (!res.ok) return 'rejected';
  return (await res.json().catch(() => ({}))) as TokenResponse;
}

/** 갱신 응답의 계정 정보. id_token 이 없으면(scope 에 openid 가 빠진 경우) access token 에서 읽는다 */
export function claimsOf(token: TokenResponse): { claims: JwtClaims; access: JwtClaims | null } | null {
  try {
    const access = token.access_token ? decodeJwt(token.access_token) : null;
    const claims = token.id_token ? decodeJwt(token.id_token) : access;
    return claims?.sub ? { claims, access } : null;
  } catch { return null; }
}
