/**
 * /api/auth/callback — 사내 통합 로그인 결과 처리
 *
 * 1. 임시 쿠키의 state 와 대조해 요청 위조를 막는다
 * 2. code + code_verifier 를 토큰 엔드포인트에 보내 토큰을 받는다
 * 3. iss · aud · nonce · exp 를 확인한다
 * 4. 토큰에 실려온 역할(realm + 서비스별)을 세션에 담는다
 *    — 허브는 이 역할로 "쓸 수 있는 서비스"만 보여준다 (docs/service-hub.md)
 * 5. 서명한 세션 쿠키를 심고 원래 보려던 주소로 돌려보낸다
 *
 * 행사 아카이브와 달리 employee 가 없어도 막지 않는다. 부서 미지정 신규
 * 입사자도 허브에는 들어와서 "부서가 지정되지 않았다"는 안내를 봐야 한다.
 * 빈 화면이나 403 은 본인에게 고장으로 보인다.
 */
import { IDTOKEN_COOKIE, SESSION_COOKIE, SESSION_HOURS, buildCookie, readCookie, signSession, verifySession }
  from '../../lib/session.js';
import { AUTH_COOKIE, configError, decodeJwt, discover, htmlError, safePath } from '../../lib/oidc.js';

export const config = { runtime: 'edge' };

// Keycloak 내부용이라 화면 판단에 쓰지 않는 역할·클라이언트
const REALM_ROLE_NOISE = new Set(['offline_access', 'uma_authorization']);
const CLIENT_NOISE = new Set(['account', 'account-console', 'broker', 'realm-management']);

/**
 * Keycloak 은 realm_access · resource_access 를 보통 access_token 에만 담는다.
 * (id_token 에 넣으려면 별도 매퍼가 필요하다) 두 토큰을 모두 보고 합친다.
 */
function collectRoles(tokens) {
  const realm = new Set();
  const svc = {};
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

export default async function handler(req) {
  const url = new URL(req.url);
  const secret = process.env.SESSION_SECRET;
  const issuer = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;

  if (!secret || !issuer || !clientId) return configError('서버 환경변수가 설정되지 않았습니다.');

  if (url.searchParams.get('error')) {
    const desc = url.searchParams.get('error_description') || url.searchParams.get('error');
    return htmlError('로그인하지 못했습니다', `통합 로그인에서 거절되었습니다. (${desc})`);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const pending = await verifySession(readCookie(req, AUTH_COOKIE), secret);

  if (!code || !state || !pending) {
    return htmlError('로그인하지 못했습니다', '로그인 정보가 없거나 만료되었습니다. 처음부터 다시 시도해 주세요.');
  }
  if (pending.state !== state) {
    return htmlError('로그인하지 못했습니다', '로그인 요청이 유효하지 않습니다. 처음부터 다시 시도해 주세요.');
  }

  let meta;
  try { meta = await discover(issuer); }
  catch (e) { return configError(e.message); }

  /* 토큰 교환 — 비밀키가 있으면 client_secret_post, 없으면 PKCE 만으로 인증한다 */
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    redirect_uri: `${url.origin}/api/auth/callback`,
    code_verifier: pending.verifier,
  });
  if (clientSecret) form.set('client_secret', clientSecret);

  const res = await fetch(meta.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: form,
  });
  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err.error_description || err.error || '';
    } catch { /* 본문이 JSON 이 아니면 상태코드만 쓴다 */ }
    // 미리보기 배포는 주소가 매번 달라 redirect_uri 를 등록할 수 없다
    const hint = /redirect/i.test(detail)
      ? '<br><br>미리보기(Preview) 배포에서는 로그인할 수 없습니다. 운영 주소로 접속해 주세요.'
      : '';
    return htmlError('로그인하지 못했습니다',
      `통합 로그인 서버가 토큰 발급을 거절했습니다. (${res.status}${detail ? ` · ${detail}` : ''})${hint}`, 502);
  }

  const token = await res.json();
  if (!token.id_token) return htmlError('로그인하지 못했습니다', '계정 정보를 받지 못했습니다.', 502);

  let claims, access = null;
  try { claims = decodeJwt(token.id_token); }
  catch { return htmlError('로그인하지 못했습니다', '계정 정보를 해석하지 못했습니다.', 502); }
  try { access = token.access_token ? decodeJwt(token.access_token) : null; }
  catch { /* 역할 정보만 못 읽는 것 — 링크가 덜 보일 뿐 로그인은 된다 */ }

  /* 토큰 검증 */
  const audOk = Array.isArray(claims.aud) ? claims.aud.includes(clientId) : claims.aud === clientId;
  if (!audOk) return htmlError('로그인하지 못했습니다', '이 사이트를 위해 발급된 계정 정보가 아닙니다.', 401);
  if (claims.iss !== meta.issuer) return htmlError('로그인하지 못했습니다', '발급처가 올바르지 않습니다.', 401);
  if (claims.nonce !== pending.nonce) return htmlError('로그인하지 못했습니다', '로그인 응답이 요청과 맞지 않습니다.', 401);
  if (!claims.exp || claims.exp * 1000 < Date.now()) return htmlError('로그인하지 못했습니다', '계정 정보가 만료되었습니다.', 401);
  if (!claims.sub) return htmlError('로그인하지 못했습니다', '계정 식별자(sub)가 없습니다.', 502);

  /* 사용자 식별은 sub 으로 한다. 이메일은 바뀔 수 있지만 sub 은 바뀌지 않는다. */
  const roles = collectRoles([claims, access]);
  const session = {
    sub: claims.sub,
    email: String(claims.email || '').toLowerCase(),
    name: claims.name || claims.preferred_username || '사내 계정',
    realm: roles.realm,
    svc: roles.svc,
    exp: Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600,
  };

  const headers = new Headers({
    Location: new URL(safePath(pending.next), url.origin).toString(),
    'cache-control': 'no-store',
  });
  headers.append('Set-Cookie', buildCookie(SESSION_COOKIE, await signSession(session, secret), SESSION_HOURS * 3600));
  headers.append('Set-Cookie', buildCookie(AUTH_COOKIE, '', 0));
  // 전체 로그아웃 때 id_token_hint 로 쓴다. 화면 스크립트는 읽지 못한다.
  headers.append('Set-Cookie', buildCookie(IDTOKEN_COOKIE, token.id_token, SESSION_HOURS * 3600));

  return new Response(null, { status: 302, headers });
}
