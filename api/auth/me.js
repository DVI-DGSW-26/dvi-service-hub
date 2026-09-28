/**
 * /api/auth/me — 화면이 링크를 걸러내는 데 쓰는 로그인 정보
 *
 * sub 은 내부 식별자라 화면에 내보내지 않는다.
 * realm(employee 등)과 서비스별 역할은 링크 필터링에 필요해서 내려준다
 * — 허브는 부서 이름이 아니라 역할로 판단한다 (docs/service-hub.md §2).
 */
import { SESSION_COOKIE, readCookie, verifySession } from '../../lib/session.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const session = await verifySession(readCookie(req, SESSION_COOKIE), process.env.SESSION_SECRET);
  const json = (body, status) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });

  if (!session) return json({ signedIn: false }, 401);
  return json({
    signedIn: true,
    name: session.name ?? '',
    email: session.email ?? '',
    realm: session.realm ?? [],
    svc: session.svc ?? {},
  }, 200);
}
