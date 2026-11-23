/**
 * /api/auth/me — 화면이 링크를 걸러내는 데 쓰는 로그인 정보
 *
 * sub 은 내부 식별자라 화면에 내보내지 않는다.
 * realm(employee 등)과 서비스별 역할은 링크 필터링에 필요해서 내려준다
 * — 허브는 부서 이름이 아니라 역할로 판단한다 (docs/service-hub.md §2).
 *
 * 세션이 끝났으면 401 이다. 화면은 /api/auth/refresh 로 한 번 늘려 보고 다시 묻는다 —
 * 갱신은 그 경로 하나에서만 한다 (lib/keycloak.ts). exp 는 화면이 끝나기 전에 늘리는 데 쓴다.
 */
import { SESSION_COOKIE, readCookie, verifySession, type Session, type Signed } from '../../lib/session.js';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const secret = process.env.SESSION_SECRET;
  // 예전에 만든 세션 쿠키에는 없는 필드가 있다
  const session = await verifySession<Signed & Partial<Session>>(readCookie(req, SESSION_COOKIE), secret);
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });

  if (!session || !secret) return json({ signedIn: false }, 401);
  return json({
    signedIn: true,
    name: session.name ?? '',
    email: session.email ?? '',
    realm: session.realm ?? [],
    svc: session.svc ?? {},
    exp: session.exp,
  }, 200);
}
