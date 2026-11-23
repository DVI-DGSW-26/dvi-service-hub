/**
 * /api/auth/login — 사내 통합 로그인(Keycloak) 시작
 *
 * 다른 사내 서비스와 동일하게 authorization code + PKCE(S256) 방식으로 보낸다.
 * state · nonce · code_verifier 는 서명한 임시 쿠키에 담아 두고 callback 에서 대조한다.
 *
 * ?action= 이 있으면 Keycloak 에 kc_action 으로 넘긴다 (Application Initiated Action) — 설정 화면의
 * 비밀번호 변경 · OTP 등록 · 패스키 등록 · 삭제. 이미 로그인돼 있으면 Keycloak 이 그 화면만 띄우고 돌려보낸다.
 */
import { AUTH_COOKIE, buildCookie, signSession } from '../../lib/session.js';
import { configError, discover, pkceChallenge, randomString, redirect, safePath, type PendingLogin }
  from '../../lib/oidc.js';

export const config = { runtime: 'edge' };

// 허용하는 kc_action — 이 밖의 값은 버리고 보통 로그인으로 한다. credential id 는 Keycloak 의 UUID
const ACTION = /^(UPDATE_PASSWORD|CONFIGURE_TOTP|webauthn-register-passwordless|delete_credential:[A-Za-z0-9-]{1,64})$/;

export default async function handler(req: Request): Promise<Response> {
  const issuer = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  const secret = process.env.SESSION_SECRET;

  if (!issuer || !clientId || !secret) {
    const missing = [
      !issuer && 'OIDC_ISSUER',
      !clientId && 'OIDC_CLIENT_ID',
      !secret && 'SESSION_SECRET',
    ].filter(Boolean).join(', ');
    return configError(`환경변수가 설정되지 않았습니다: ${missing}. 관리자에게 문의해 주세요.`);
  }

  let meta;
  try { meta = await discover(issuer); }
  catch (e) { return configError((e as Error).message); }

  const url = new URL(req.url);
  const next = safePath(url.searchParams.get('next'));
  const requested = url.searchParams.get('action');
  const action = requested && ACTION.test(requested) ? requested : undefined;
  // callback 이 authentication_expired 로 다시 보낸 것 — 한 번만 다시 시작하게 표시해 둔다
  const retried = url.searchParams.get('retried') === '1' || undefined;

  const state = randomString(24);
  const nonce = randomString(24);
  const verifier = randomString(48);

  // 로그인 진행 상태는 10분만 유효하다
  const pending = await signSession(
    { state, nonce, verifier, next, action, retried, exp: Math.floor(Date.now() / 1000) + 600 } satisfies PendingLogin,
    secret,
  );

  const auth = new URL(meta.authorization_endpoint);
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('client_id', clientId);
  auth.searchParams.set('redirect_uri', `${url.origin}/api/auth/callback`);
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 비어 있는 환경변수도 기본값으로
  auth.searchParams.set('scope', process.env.OIDC_SCOPE || 'openid profile email');
  auth.searchParams.set('state', state);
  auth.searchParams.set('nonce', nonce);
  auth.searchParams.set('code_challenge', await pkceChallenge(verifier));
  auth.searchParams.set('code_challenge_method', 'S256');
  if (action) auth.searchParams.set('kc_action', action);

  return redirect(auth.toString(), buildCookie(AUTH_COOKIE, pending, 600));
}
