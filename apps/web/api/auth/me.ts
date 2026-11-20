/**
 * /api/auth/me — 화면이 링크를 걸러내는 데 쓰는 로그인 정보
 *
 * sub 은 내부 식별자라 화면에 내보내지 않는다.
 * realm(employee 등)과 서비스별 역할은 링크 필터링에 필요해서 내려준다
 * — 허브는 부서 이름이 아니라 역할로 판단한다 (docs/service-hub.md §2).
 */
import { SESSION_COOKIE, buildAccessCookie, readCookie, verifySession, type Session, type Signed } from '../../lib/session.js';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const secret = process.env.SESSION_SECRET;
  // 예전에 만든 세션 쿠키에는 없는 필드가 있다
  const session = await verifySession<Signed & Partial<Session>>(readCookie(req, SESSION_COOKIE), secret);
  const json = (body: unknown, status: number, cookie?: string) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...(cookie && { 'set-cookie': cookie }) },
    });

  if (!session || !secret) return json({ signedIn: false }, 401);
  // 이 기능 전에 로그인한 사람도 다시 로그인하지 않고 서비스 이동 버튼용 역할 쿠키를 받는다
  return json({
    signedIn: true,
    name: session.name ?? '',
    email: session.email ?? '',
    realm: session.realm ?? [],
    svc: session.svc ?? {},
  }, 200, await buildAccessCookie(session, secret));
}
