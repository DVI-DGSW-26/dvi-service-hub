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
import { AUTH_COOKIE, authCookie, buildCookie, readCookie, verifySession } from '../../lib/session.js';
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
function retryExpiredLogin(url: URL, pending: PendingLogin | null, clearPending: string): Response | null {
  if (url.searchParams.get('error_description') !== 'authentication_expired' || pending?.retried) return null;
  log('info', 'login.retry_expired', 'user');
  const login = new URL('/api/auth/login', url.origin);
  login.searchParams.set('next', safePath(pending?.next));
  if (pending?.action) login.searchParams.set('action', pending.action);
  login.searchParams.set('retried', '1');
  return redirect(login.toString(), clearPending);
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

  // 로그인 진행 쿠키는 state 마다 따로다(lib/session.ts) — 돌아온 state 몫만 연다. Keycloak 은 오류에도 state 를 돌려준다
  const state = url.searchParams.get('state') ?? '';
  const pending = await verifySession<PendingLogin>(readCookie(req, authCookie(state)), secret, AUTH_COOKIE);
  const clearPending = buildCookie(authCookie(state), '', 0);

  if (url.searchParams.get('error')) {
    // 설정에서 보낸 일(kc_action)을 취소 · 실패한 것이면 로그인은 그대로 두고 설정으로 돌아간다
    const status = url.searchParams.get('kc_action_status');
    if (status && pending?.action) {
      return redirect(withActionResult(pending, status, url.origin), clearPending);
    }
    const retry = retryExpiredLogin(url, pending, clearPending);
    if (retry) return retry;
    // URL 쿼리는 누구나 넣을 수 있어 화면 · 로그 모두 코드 모양만 쓴다 — 회사 주소에 남이 쓴 문장이 뜨지 않게
    const error = errorCode(url.searchParams.get('error'));
    const description = errorCode(url.searchParams.get('error_description'));
    return htmlError('로그인하지 못했어요', '통합 로그인이 요청을 거절했어요.\n처음부터 다시 로그인해 주세요.', 400, {
      who: 'keycloak',
      fields: { error, description },
      code: [error, description].filter((c) => c && c !== 'other').join(' · '),
    });
  }

  const code = url.searchParams.get('code');

  if (!code || !state || !pending) {
    return htmlError('로그인 시간이 지났어요', '처음부터 다시 로그인해 주세요.');
  }
  if (pending.state !== state) {
    return htmlError('로그인하지 못했어요', '로그인 요청이 맞지 않아요.\n처음부터 다시 로그인해 주세요.');
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
  } catch { return htmlError('통합 로그인에 연결하지 못했어요', '잠시 뒤 다시 시도해 주세요.', 502); }
  if (!res.ok) {
    let detail = '';
    try {
      const err = (await res.json()) as { error?: string; error_description?: string };
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 빈 문자열도 다음 값으로 넘긴다
      detail = err.error_description || err.error || '';
    } catch { /* 본문이 JSON 이 아니면 상태코드만 쓴다 */ }
    // 미리보기 배포는 주소가 매번 달라 redirect_uri 를 등록할 수 없다
    const msg = /redirect/i.test(detail)
      ? '미리보기(Preview) 배포에서는 로그인할 수 없어요.\n운영 주소로 접속해 주세요.'
      : '통합 로그인이 로그인을 거절했어요.\n잠시 뒤 다시 로그인해 주세요.';
    return htmlError('로그인하지 못했어요', msg, 502, { code: `${res.status}${detail ? ` · ${detail}` : ''}` });
  }

  const token = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!token.id_token) return htmlError('로그인하지 못했어요', '계정 정보를 받지 못했어요.\n잠시 뒤 다시 로그인해 주세요.', 502);

  let claims: JwtClaims, access: JwtClaims | null = null;
  try { claims = decodeJwt(token.id_token); }
  catch { return htmlError('로그인하지 못했어요', '계정 정보를 읽지 못했어요.\n잠시 뒤 다시 로그인해 주세요.', 502); }
  try { access = token.access_token ? decodeJwt(token.access_token) : null; }
  catch { /* 역할 정보만 못 읽는 것 — 링크가 덜 보일 뿐 로그인은 된다 */ }

  /* 토큰 검증 */
  const audOk = Array.isArray(claims.aud) ? claims.aud.includes(clientId) : claims.aud === clientId;
  if (!audOk) return htmlError('로그인하지 못했어요', '이 사이트용 계정 정보가 아니에요.\n처음부터 다시 로그인해 주세요.', 401, { code: 'aud' });
  if (claims.iss !== meta.issuer) return htmlError('로그인하지 못했어요', '계정 정보의 발급처가 맞지 않아요.\n처음부터 다시 로그인해 주세요.', 401, { code: 'iss' });
  if (claims.nonce !== pending.nonce) return htmlError('로그인하지 못했어요', '로그인 응답이 요청과 맞지 않아요.\n처음부터 다시 로그인해 주세요.', 401, { code: 'nonce' });
  if (!claims.exp || claims.exp * 1000 < Date.now()) return htmlError('로그인 시간이 지났어요', '처음부터 다시 로그인해 주세요.', 401, { code: 'exp' });
  if (!claims.sub) return htmlError('로그인하지 못했어요', '계정 정보에 식별자가 없어요.\n관리자에게 알려 주세요.', 502, { code: 'sub' });

  // 세션은 짧게 만들고 refresh token 으로 늘린다 (lib/keycloak.ts)
  const { cookies } = await sessionCookies(token, claims, access, secret);
  return redirect(
    withActionResult(pending, url.searchParams.get('kc_action_status'), url.origin),
    ...cookies,
    clearPending,
  );
}
