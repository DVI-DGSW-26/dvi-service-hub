/**
 * middleware.js — 로그인하지 않은 접근을 전부 막는다.
 *
 * 허브에는 공개할 내용이 없다. 들어오면 바로 SSO 로 보내고, 돌아온 뒤에
 * 화면을 그린다 (docs/service-hub.md §2). 로그인 화면을 따로 두지 않고
 * /api/auth/login 이 곧장 Keycloak 으로 보낸다.
 *
 * 세션(hub_session)은 짧게 끝나고 refresh token 으로 늘린다. 세션이 끝난 페이지 이동은
 * /api/auth/refresh 로 보내 늘린 뒤 돌아온다 — 거절되면 거기서 통합 로그인으로 보낸다.
 * 여기서 직접 갱신하지 않는다. 갱신은 그 경로 하나에서만 한다 (lib/keycloak.ts).
 */
import { next } from '@vercel/edge';
import { SESSION_COOKIE, readCookie, verifySession } from './lib/session.js';

export const config = {
  // 인증 API 와 Vercel 내부 경로, 다른 서비스가 불러가는 파일은 제외하고 전부 검사한다.
  // switcher.js 와 로고는 띵동 · 하이요 등 다른 사이트 화면에서 불러간다 — 허브 로그인 쿠키가 따라오지 않아 막으면 버튼이 안 뜬다.
  // api/switcher 는 그 버튼이 역할을 묻는 곳으로, 역할 쿠키와 출처(CORS)를 스스로 검사한다
  matcher: ['/((?!api/auth|api/switcher|_vercel|favicon\\.svg|manifest\\.webmanifest|icons/|sw\\.js|switcher\\.js|logos/).*)'],
};

/** 로컬에서 띄운 것(vercel dev). 배포는 *.vercel.app · 회사 도메인으로만 들어와 이 이름이 될 수 없다 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export default async function middleware(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // 목업으로 띄운 화면 — 로그인할 것이 없으니 막지 않는다. production 은 그대로 막는다.
  //   preview 배포   빌드가 목업이다(vite.config.ts). 로그인 서버(OIDC) 설정 없이 미리보기로 연다.
  //                  바깥 공개를 막는 일은 Vercel 의 Deployment Protection 이 맡는다
  //   로컬 vercel dev  vercel.json 의 devCommand 가 pnpm dev:mock. 프로젝트를 연결하지 않으면 VERCEL_ENV 가 비어 주소로 본다
  if (process.env.VERCEL_ENV === 'preview' || LOCAL_HOSTS.has(url.hostname)) return next();

  const session = await verifySession(readCookie(req, SESSION_COOKIE), process.env.SESSION_SECRET);
  if (session) return next();

  // 페이지가 아니라 파일 요청이면 리다이렉트 대신 401 을 준다.
  const wantsHtml = (req.headers.get('accept') ?? '').includes('text/html');
  if (!wantsHtml) {
    return new Response('로그인이 필요합니다.', {
      status: 401,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const refresh = new URL('/api/auth/refresh', url.origin);
  refresh.searchParams.set('next', url.pathname + url.search);
  return Response.redirect(refresh.toString(), 302);
}
