/**
 * middleware.js — 로그인하지 않은 접근을 전부 막는다.
 *
 * 허브에는 공개할 내용이 없다. 들어오면 바로 SSO 로 보내고, 돌아온 뒤에
 * 화면을 그린다 (docs/service-hub.md §2). 로그인 화면을 따로 두지 않고
 * /api/auth/login 이 곧장 Keycloak 으로 보낸다.
 */
import { next } from '@vercel/edge';
import { SESSION_COOKIE, readCookie, verifySession } from './lib/session.js';

export const config = {
  // 인증 API 와 Vercel 내부 경로만 제외하고 전부 검사한다
  matcher: ['/((?!api/auth|_vercel|favicon\\.svg).*)'],
};

export default async function middleware(req) {
  const session = await verifySession(readCookie(req, SESSION_COOKIE), process.env.SESSION_SECRET);
  if (session) return next();

  const url = new URL(req.url);

  // 페이지가 아니라 파일 요청이면 리다이렉트 대신 401 을 준다.
  const wantsHtml = (req.headers.get('accept') || '').includes('text/html');
  if (!wantsHtml) {
    return new Response('로그인이 필요합니다.', {
      status: 401,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const login = new URL('/api/auth/login', url.origin);
  login.searchParams.set('next', url.pathname + url.search);
  return Response.redirect(login.toString(), 302);
}
