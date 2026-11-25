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
import { SESSION_COOKIE, readCookie, sessionProblem, verifySession } from './lib/session.js';
import { redirect } from './lib/oidc.js';
import { log, requestId } from './lib/log.js';

export const config = {
  // 인증 API 와 Vercel 내부 경로, 다른 서비스가 불러가는 파일은 제외하고 전부 검사한다.
  // switcher.js 와 로고는 띵동 · 하이요 등 다른 사이트 화면에서 불러간다 — 허브 로그인 쿠키가 따라오지 않아 막으면 버튼이 안 뜬다.
  // api/switcher 는 그 버튼이 역할을 묻는 곳으로, 역할 쿠키와 출처(CORS)를 스스로 검사한다. api/health 는 가동 감시가 로그인 없이 부른다
  // assets/ 는 sw.js 가 받아 둔 index.html 이 middleware 없이 뜬 뒤 불러간다 — 세션(10분)이 끝났다고 막으면 JS 가 안 떠 갱신도 못 하고 흰 화면이 된다.
  // 이름이 해시라 index.html(로그인 필요) 없이는 주소를 알 수 없다
  matcher: ['/((?!api/auth|api/switcher|api/health|_vercel|assets/|favicon\\.svg|manifest\\.webmanifest|icons/|sw\\.js|switcher\\.js|logos/).*)'],
};

/** 로컬에서 띄운 것(vercel dev). 배포는 *.vercel.app · 회사 도메인으로만 들어와 이 이름이 될 수 없다 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * 운영 주소는 회사 도메인 하나다. Vercel 기본 주소로 들어오면 같은 경로로 보낸다 — 로그인 쿠키가 주소마다 따로라 한 곳에 모은다.
 * /api/auth · /api/switcher · switcher.js 는 matcher 밖이라 옛 주소에서도 돈다(진행 중인 로그인 · 다른 사이트의 서비스 이동 버튼).
 * sw.js 가 받아 둔 화면은 여기를 거치지 않는다 — src/app/main.tsx 가 옮긴다
 */
const OLD_HOST = 'dvi-service-hub.vercel.app';
const HOST = 'service-hub.dvi-ind.com';

export default async function middleware(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.hostname === OLD_HOST) {
    url.hostname = HOST;
    return Response.redirect(url.toString(), 308);
  }

  // 목업으로 띄운 화면 — 로그인할 것이 없으니 막지 않는다. production 은 그대로 막는다.
  //   preview 배포   빌드가 목업이다(vite.config.ts). 로그인 서버(OIDC) 설정 없이 미리보기로 연다.
  //                  바깥 공개를 막는 일은 Vercel 의 Deployment Protection 이 맡는다
  //   로컬 vercel dev  vercel.json 의 devCommand 가 pnpm dev:mock. 프로젝트를 연결하지 않으면 VERCEL_ENV 가 비어 주소로 본다
  if (process.env.VERCEL_ENV === 'preview' || LOCAL_HOSTS.has(url.hostname)) return next();

  const cookie = readCookie(req, SESSION_COOKIE);
  const secret = process.env.SESSION_SECRET;
  const session = await verifySession(cookie, secret);
  if (session) return next();

  // 페이지 이동만 갱신으로 보낸다. fetch 는 리다이렉트를 따라가 Web Locks 밖에서 refresh token 을 쓰게 되니 401 을 준다 —
  // 화면(src/shared/api)이 줄을 세워 늘리고 다시 부른다. Sec-Fetch-Mode 가 없는 옛 브라우저만 Accept 로 가린다
  const mode = req.headers.get('sec-fetch-mode');
  const isPage = mode ? mode === 'navigate' : (req.headers.get('accept') ?? '').includes('text/html');

  // 쿠키가 없거나 끝난 것은 정상 흐름이라 남기지 않는다(만료 순간 API 마다 401 이라 양만 많다) — 화면 로그의 from=hub-web(reason) 으로 보인다
  const reason = await sessionProblem(cookie, secret);
  if (!secret) log('error', 'session.no_secret', 'config', { path: url.pathname, rid: requestId(req) });
  else if (reason === 'invalid') {
    log('warn', 'session.invalid', 'request', { path: url.pathname, rid: requestId(req), hint: '서명이 맞지 않는다 — 깨지거나 조작된 쿠키, 또는 SESSION_SECRET 이 바뀌었다' });
  }

  if (!isPage) {
    // 허브 서버 오류와 같은 모양(명세 1.4) — /api/hub 를 부른 화면이 서버의 401 과 똑같이 다룬다. source · reason 은 화면 로그가 누구 탓인지 보이는 데 쓴다
    return new Response(JSON.stringify({ code: 'UNAUTHORIZED', status: 401, message: '로그인이 필요합니다.', source: 'hub-web', reason }), {
      status: 401,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const refresh = new URL('/api/auth/refresh', url.origin);
  refresh.searchParams.set('next', url.pathname + url.search);
  return redirect(refresh.toString());
}
