/**
 * /api/auth/callback — 사내 통합 로그인 결과 처리
 *
 * 1. 임시 쿠키의 state 와 대조해 요청 위조를 막는다
 * 2. code + code_verifier 를 토큰 엔드포인트에 보내 토큰을 받는다
 * 3. iss · aud · nonce · exp 를 확인한다
 * 4. 토큰에 실려온 역할(realm + 서비스별)을 세션에 담는다
 *    — 허브는 이 역할로 "쓸 수 있는 서비스"만 보여준다 (docs/service-hub.md)
 * 5. 서명한 세션 쿠키와 refresh token 쿠키를 심고 원래 보려던 주소로 돌려보낸다
 *    — 세션은 짧고, 끝나기 전에 /api/auth/refresh 가 늘린다 (lib/keycloak.ts)
 *
 * 행사 아카이브와 달리 employee 가 없어도 막지 않는다. 부서 미지정 신규
 * 입사자도 허브에는 들어와서 "부서가 지정되지 않았다"는 안내를 봐야 한다.
 * 빈 화면이나 403 은 본인에게 고장으로 보인다.
 */
import { AUTH_COOKIE, buildCookie, readCookie, verifySession } from '../../lib/session.js';
import { configError, decodeJwt, discover, htmlError, redirect, safePath,
  type JwtClaims, type OidcMetadata, type PendingLogin } from '../../lib/oidc.js';
import { sessionCookies, type TokenResponse } from '../../lib/keycloak.js';
import { errorCode, log } from '../../lib/log.js';

export const config = { runtime: 'edge' };

/**
 * 로그인 탭을 여러 개 열어 둔 채 한쪽에서 로그인하면 나머지 탭은 Keycloak 의 로그인 진행이 끝나
 * error_description=authentication_expired 로 돌아온다. 다시 시작하면 SSO 가 살아 있어 화면 없이 들어간다.
 * 오류 화면 대신 한 번만 다시 시작한다 — 다시 시작한 로그인(retried)이 또 그러면 오류를 보인다.
 */
function retryExpiredLogin(url: URL, pending: PendingLogin | null): Response | null {
  if (url.searchParams.get('error_description') !== 'authentication_expired' || pending?.retried) return null;
  log('info', 'login.retry_expired', 'user');
  const login = new URL('/api/auth/login', url.origin);
  login.searchParams.set('next', safePath(pending?.next));
  if (pending?.action) login.searchParams.set('action', pending.action);
  login.searchParams.set('retried', '1');
  return redirect(login.toString(), buildCookie(AUTH_COOKIE, '', 0));
}

/**
 * 돌아갈 주소. 설정에서 보낸 일(kc_action)이었으면 결과를 ?kc_action=&kc_action_status= 로 붙인다 —
 * 화면이 "비밀번호를 바꿨어요" 같은 안내를 띄운다. credential id 는 붙이지 않는다.
 */
function withActionResult(pending: PendingLogin, status: string | null, origin: string): string {
  const dest = new URL(safePath(pending.next), origin);
  if (pending.action && status) {
    dest.searchParams.set('kc_action', pending.action.split(':')[0]);
    dest.searchParams.set('kc_action_status', status);
  }
  return dest.toString();
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const secret = process.env.SESSION_SECRET;
  const issuer = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;

  if (!secret || !issuer || !clientId) return configError('서버 환경변수가 설정되지 않았습니다.');

  if (url.searchParams.get('error')) {
    // 설정에서 보낸 일(kc_action)을 취소 · 실패한 것이면 로그인은 그대로 두고 설정으로 돌아간다
    const status = url.searchParams.get('kc_action_status');
    const back = await verifySession<PendingLogin>(readCookie(req, AUTH_COOKIE), secret);
    if (status && back?.action && back.state === url.searchParams.get('state')) {
      return redirect(withActionResult(back, status, url.origin), buildCookie(AUTH_COOKIE, '', 0));
    }
    const retry = retryExpiredLogin(url, back);
    if (retry) return retry;
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 빈 설명이면 error 코드를 보인다
    const desc = url.searchParams.get('error_description') || url.searchParams.get('error');
    // URL 쿼리는 누구나 넣을 수 있어 로그에는 코드 모양만 남긴다
    return htmlError('로그인하지 못했습니다', `통합 로그인에서 거절되었습니다. (${desc})`, 400, {
      who: 'keycloak',
      fields: { error: errorCode(url.searchParams.get('error')), description: errorCode(url.searchParams.get('error_description')) },
    });
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const pending = await verifySession<PendingLogin>(readCookie(req, AUTH_COOKIE), secret);

  if (!code || !state || !pending) {
    return htmlError('로그인하지 못했습니다', '로그인 정보가 없거나 만료되었습니다. 처음부터 다시 시도해 주세요.');
  }
  if (pending.state !== state) {
    return htmlError('로그인하지 못했습니다', '로그인 요청이 유효하지 않습니다. 처음부터 다시 시도해 주세요.');
  }

  let meta: OidcMetadata;
  try { meta = await discover(issuer); }
  catch (e) { return configError((e as Error).message); }

  /* 토큰 교환 — 비밀키가 있으면 client_secret_post, 없으면 PKCE 만으로 인증한다 */
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    redirect_uri: `${url.origin}/api/auth/callback`,
    code_verifier: pending.verifier,
  });
  if (clientSecret) form.set('client_secret', clientSecret);

  let res: Response;
  try {
    res = await fetch(meta.token_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: form,
    });
  } catch { return htmlError('로그인하지 못했습니다', '통합 로그인 서버에 연결하지 못했습니다.', 502); }
  if (!res.ok) {
    let detail = '';
    try {
      const err = (await res.json()) as { error?: string; error_description?: string };
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 빈 문자열도 다음 값으로 넘긴다
      detail = err.error_description || err.error || '';
    } catch { /* 본문이 JSON 이 아니면 상태코드만 쓴다 */ }
    // 미리보기 배포는 주소가 매번 달라 redirect_uri 를 등록할 수 없다
    const hint = /redirect/i.test(detail)
      ? ' 미리보기(Preview) 배포에서는 로그인할 수 없습니다. 운영 주소로 접속해 주세요.'
      : '';
    return htmlError('로그인하지 못했습니다',
      `통합 로그인 서버가 토큰 발급을 거절했습니다. (${res.status}${detail ? ` · ${detail}` : ''})${hint}`, 502);
  }

  const token = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!token.id_token) return htmlError('로그인하지 못했습니다', '계정 정보를 받지 못했습니다.', 502);

  let claims: JwtClaims, access: JwtClaims | null = null;
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

  // 세션은 짧게 만들고 refresh token 으로 늘린다 (lib/keycloak.ts)
  const { cookies } = await sessionCookies(token, claims, access, secret);
  return redirect(
    withActionResult(pending, url.searchParams.get('kc_action_status'), url.origin),
    ...cookies,
    buildCookie(AUTH_COOKIE, '', 0),
  );
}
