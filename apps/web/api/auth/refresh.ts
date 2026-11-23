/**
 * /api/auth/refresh — 세션 늘리기. Keycloak 갱신은 여기에서만 한다
 *
 * hub_session 은 짧게(10분) 끝난다. refresh token(hub_rt)으로 Keycloak 에서 새 토큰을 받아
 * 세션 · 역할 쿠키를 다시 만든다. refresh token 은 한 번만 쓸 수 있어 여러 곳에서 갱신하면
 * 하나가 실패한다 — 그래서 갱신하는 곳은 이 경로 하나이고, hub_rt 도 이 경로에만 실려 온다 (lib/keycloak.ts).
 *
 *   POST  화면(src/shared/api/session.ts)이 세션이 끝나기 전이나 401 을 받았을 때 부른다
 *         200 { exp }   늘렸다
 *         401           거절됐다 — 쿠키를 지웠다. 화면이 통합 로그인으로 보낸다
 *         502           Keycloak 에 닿지 못했다 — 세션은 그대로 둔다
 *   GET   middleware 가 세션이 끝난 페이지 이동을 보낸다. 늘리고 ?next= 로 돌려보내거나, 거절되면 통합 로그인으로
 *
 * 갱신이 거절되면(퇴사 · SSO 세션 끝 · 재사용 탐지) 쿠키를 모두 지운다 — 그래야 퇴사 처리 · 권한 변경이 바로 반영된다.
 */
import { REFRESH_COOKIE, readCookie } from '../../lib/session.js';
import { configError, discover, htmlError, redirect, safePath, type OidcMetadata } from '../../lib/oidc.js';
import { claimsOf, clearSessionCookies, refreshTokens, sessionCookies } from '../../lib/keycloak.js';

export const config = { runtime: 'edge' };

type Outcome = { cookies: string[]; exp: number } | 'rejected' | 'missing' | 'unreachable';

async function renew(req: Request, secret: string, issuer: string, clientId: string): Promise<Outcome> {
  const refreshToken = readCookie(req, REFRESH_COOKIE);
  if (!refreshToken) return 'missing';

  let meta: OidcMetadata;
  try { meta = await discover(issuer); }
  catch { return 'unreachable'; }

  const token = await refreshTokens(meta, refreshToken, { id: clientId, secret: process.env.OIDC_CLIENT_SECRET });
  if (typeof token === 'string') return token;
  const read = claimsOf(token);
  if (!read) return 'rejected';
  return sessionCookies(token, read.claims, read.access, secret);
}

const json = (body: unknown, status: number, cookies: string[] = []) => {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  for (const c of cookies) headers.append('Set-Cookie', c);
  return new Response(JSON.stringify(body), { status, headers });
};

export default async function handler(req: Request): Promise<Response> {
  const secret = process.env.SESSION_SECRET;
  const issuer = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  const url = new URL(req.url);
  const page = req.method === 'GET';
  const next = safePath(url.searchParams.get('next'));

  if (!secret || !issuer || !clientId) {
    return page ? configError('서버 환경변수가 설정되지 않았습니다.') : json({ error: '서버 환경변수가 설정되지 않았습니다.' }, 500);
  }

  const outcome = await renew(req, secret, issuer, clientId);

  if (outcome === 'unreachable') {
    return page
      ? htmlError('로그인을 이어가지 못했습니다', '통합 로그인 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.', 502)
      : json({ error: '통합 로그인 서버에 연결하지 못했습니다.' }, 502);
  }
  if (outcome === 'rejected' || outcome === 'missing') {
    // 거절됐을 때만 쿠키를 지운다. hub_rt 가 없는 요청(다른 사이트에서 보낸 POST 등)으로 로그아웃되지 않게
    const cookies = outcome === 'rejected' ? clearSessionCookies() : [];
    if (!page) return json({ signedIn: false }, 401, cookies);
    const login = new URL('/api/auth/login', url.origin);
    login.searchParams.set('next', next);
    return redirect(login.toString(), ...cookies);
  }

  return page ? redirect(new URL(next, url.origin).toString(), ...outcome.cookies) : json({ exp: outcome.exp }, 200, outcome.cookies);
}
