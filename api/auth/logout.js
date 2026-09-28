/**
 * /api/auth/logout — 전체 로그아웃
 *
 * 허브에서 로그아웃하면 SSO 세션까지 끊는다. 그래서 다른 사내 서비스도
 * 다음 요청부터 다시 로그인해야 한다. 의도한 동작이다 — 화면의 버튼
 * 문구도 "전체 로그아웃"이다 (docs/service-hub.md §3).
 *
 * id_token_hint 를 함께 보내면 Keycloak 이 확인 화면 없이 바로 끝낸다.
 */
import { IDTOKEN_COOKIE, SESSION_COOKIE, buildCookie, readCookie } from '../../lib/session.js';
import { configError, discover } from '../../lib/oidc.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const issuer = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  if (!issuer || !clientId) return configError('서버 환경변수가 설정되지 않았습니다.');

  let meta;
  try { meta = await discover(issuer); }
  catch (e) { return configError(e.message); }

  const url = new URL(req.url);
  const end = new URL(meta.end_session_endpoint);
  end.searchParams.set('client_id', clientId);
  end.searchParams.set('post_logout_redirect_uri', `${url.origin}/`);
  const idToken = readCookie(req, IDTOKEN_COOKIE);
  if (idToken) end.searchParams.set('id_token_hint', idToken);

  const headers = new Headers({ Location: end.toString(), 'cache-control': 'no-store' });
  headers.append('Set-Cookie', buildCookie(SESSION_COOKIE, '', 0));
  headers.append('Set-Cookie', buildCookie(IDTOKEN_COOKIE, '', 0));
  return new Response(null, { status: 302, headers });
}
