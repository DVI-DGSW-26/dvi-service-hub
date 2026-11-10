/**
 * /api/auth/me — 화면이 링크를 걸러내는 데 쓰는 로그인 정보
 *
 * sub 은 내부 식별자라 화면에 내보내지 않는다.
 * realm(employee 등)과 서비스별 역할은 링크 필터링에 필요해서 내려준다
 * — 허브는 부서 이름이 아니라 역할로 판단한다 (docs/service-hub.md §2).
 *
 * 서비스 이동 버튼용 역할 쿠키(hub_access)도 여기서 다시 심는다. 그 쿠키가 생기기
 * 전에 로그인해 둔 사람도 허브를 한 번 열면 다른 서비스 메뉴가 걸러지게 된다.
 */
import { SESSION_COOKIE, buildAccessCookie, readCookie, verifySession } from '../../lib/session.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const secret = process.env.SESSION_SECRET;
  const session = await verifySession(readCookie(req, SESSION_COOKIE), secret);
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });

  if (!session) return new Response(JSON.stringify({ signedIn: false }), { status: 401, headers });

  headers.append('Set-Cookie', await buildAccessCookie(session, secret));
  return new Response(JSON.stringify({
    signedIn: true,
    name: session.name ?? '',
    email: session.email ?? '',
    realm: session.realm ?? [],
    svc: session.svc ?? {},
  }), { status: 200, headers });
}
