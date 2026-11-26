/**
 * oidc.js — 사내 통합 로그인(Keycloak) 연동에 필요한 조각들
 *
 * company-events 의 검증된 구현을 가져왔다 (사내 표준 패턴).
 *   realm 주소:  https://api.dvi-ind.com/dauth/realms/dvi
 *
 * 엔드포인트를 코드에 박지 않고 표준 discovery 문서에서 읽는다.
 * realm 주소나 Keycloak 버전이 바뀌어도 환경변수만 고치면 된다.
 */
import { toB64url, fromB64url, type Signed } from './session.js';
import { clip, log, type Who } from './log.js';

/** 로그인 진행 상태 (hub_auth.<state> 쿠키). callback 에서 대조한다 */
export interface PendingLogin extends Signed {
  state: string;
  nonce: string;
  verifier: string;
  next: string;
  /** 통합 로그인에서 할 일(kc_action). 있으면 callback 이 결과를 돌아갈 주소에 붙인다 */
  action?: string;
  /** authentication_expired 로 한 번 다시 시작한 로그인. 또 그러면 다시 시작하지 않고 오류를 보인다 (callback) */
  retried?: boolean;
}

/** discovery 문서 중 이 허브가 쓰는 항목 */
export interface OidcMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint: string;
}

/** id_token · access_token 본문 중 이 허브가 읽는 클레임 */
export interface JwtClaims {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nonce?: string;
  email?: unknown; // 문자열이 아닌 값이 와도 callback 에서 String() 으로 받는다
  name?: string;
  preferred_username?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] } | undefined>;
}

let cached: Promise<OidcMetadata> | undefined;

/** discovery 문서에서 엔드포인트를 읽는다. 같은 인스턴스 안에서는 한 번만 받고, 실패는 기억하지 않는다 */
export function discover(issuer: string): Promise<OidcMetadata> {
  return (cached ??= fetchMetadata(issuer).catch((e: unknown) => { cached = undefined; throw e; }));
}

async function fetchMetadata(issuer: string): Promise<OidcMetadata> {
  const url = `${issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`통합 로그인 설정을 읽지 못했습니다 (${res.status})`);
  const meta = (await res.json()) as OidcMetadata;
  if (!meta.authorization_endpoint || !meta.token_endpoint) {
    throw new Error('통합 로그인 설정에 필요한 주소가 없습니다.');
  }
  return meta;
}

/** 무작위 문자열 (state · nonce · PKCE verifier 용) */
export function randomString(bytes = 48) {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return toB64url(b);
}

/** PKCE — verifier 를 SHA-256 해시해 challenge 로 만든다 (S256) */
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return toB64url(new Uint8Array(digest));
}

/**
 * JWT 본문을 읽는다.
 * 토큰 엔드포인트에서 TLS 로 직접 받은 것이라 서명 재검증은 하지 않는다.
 * 대신 호출부에서 iss · aud · nonce · exp 를 반드시 확인한다.
 * 응답 JSON 에서 바로 받은 값이라 문자열이 아닐 수도 있다.
 */
export function decodeJwt(token: unknown): JwtClaims {
  // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/prefer-nullish-coalescing -- 빈 값 · 무엇이 와도 String() 으로 받아 아래 형식 검사에 맡긴다
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('토큰 형식이 올바르지 않습니다.');
  return JSON.parse(new TextDecoder().decode(fromB64url(parts[1]))) as JwtClaims;
}

/** 같은 사이트 안의 경로만 허용한다 (열린 리다이렉트 방지) */
export function safePath(p: unknown): string {
  // URL 파서는 `\` 를 `/` 로 읽고 탭 · 줄바꿈을 지워서 "/\evil.com" 도 //evil.com 이 된다
  // eslint-disable-next-line no-control-regex -- 제어 문자를 막으려고 일부러 넣었다
  return typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && !/[\\\x00-\x1f\x7f]/.test(p) ? p : '/';
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** 302 이동. 로그인 응답은 캐시하지 않는다 */
export function redirect(location: string, ...cookies: string[]): Response {
  const headers = new Headers({ Location: location, 'cache-control': 'no-store' });
  for (const c of cookies) headers.append('Set-Cookie', c);
  return new Response(null, { status: 302, headers });
}

/** 설정이 빠졌을 때 사람이 읽을 수 있는 화면을 돌려준다 — 무엇이 빠졌는지(msg)는 작은 글씨로 */
export function configError(msg: string): Response {
  return htmlError('설정이 필요해요', '허브 설정이 빠져 로그인할 수 없어요.\n관리자에게 알려 주세요.', 500, { code: msg });
}

/** 허브 로고(public/favicon.svg 에서 메타데이터를 뺀 것) — 오류 화면은 로그인 전이라 그림 파일 대신 글에 넣는다 */
const LOGO =
  '<svg viewBox="0 0 100 100" aria-hidden="true"><g transform="translate(17,17) scale(.66)">' +
  '<path id="m" d="M28,5.10 A50,50 0 0 1 84.5,86.19 L84.5,65.94 A38,38 0 0 0 40,13.34 L40,49.8 A10,10 0 0 0 50,59.8 L55.8,59.8 L55.8,71.8 L50,71.8 A22,22 0 0 1 28,49.8 Z" fill="#2F5BFF"/>' +
  '<use href="#m" transform="rotate(180 50 50)"/></g>' +
  '<circle cx="50" cy="50" r="47" fill="none" stroke="#8EA5FF" stroke-width="2" stroke-linecap="round" stroke-dasharray="0 5.2"/>' +
  '<circle cx="83.23" cy="16.77" r="6.5" fill="#fff"/><circle cx="83.23" cy="16.77" r="4" fill="#2F5BFF"/></svg>';

/**
 * 오류 화면 모양 — 앱의 오류 화면(apps/mobile/www/index.html)과 같다. 색은 허브 테마(src/app/styles/theme.css)의 기본 파랑에서 왔다.
 * 허브에서 고른 테마(localStorage 'theme')가 있으면 따르고, 없으면 시스템 설정
 */
const PAGE_HEAD =
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="color-scheme" content="light dark">' +
  '<link rel="icon" href="/favicon.svg" type="image/svg+xml">' +
  '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" media="print" onload="this.media=\'all\'">' +
  `<script>try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>` +
  '<style>' +
  ':root{--bg:oklch(.968 .004 262);--fg:oklch(.23 .01 262);--muted:oklch(.5 .012 262);--fill:oklch(.53 .2 262);color-scheme:light}' +
  '@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:oklch(.16 .008 262);--fg:oklch(.97 .003 262);--muted:oklch(.76 .01 262);color-scheme:dark}}' +
  ':root[data-theme=dark]{--bg:oklch(.16 .008 262);--fg:oklch(.97 .003 262);--muted:oklch(.76 .01 262);color-scheme:dark}' +
  "body{margin:0;min-height:100dvh;box-sizing:border-box;display:grid;place-items:center;padding:24px max(24px,env(safe-area-inset-right)) 24px max(24px,env(safe-area-inset-left));background:var(--bg);color:var(--fg);font:15px/1.6 'Pretendard Variable',Pretendard,system-ui,-apple-system,'Segoe UI','Malgun Gothic',sans-serif;text-align:center;word-break:keep-all}" +
  'main{max-width:22rem;display:grid;justify-items:center}' +
  '.logo{display:grid;place-items:center;width:64px;height:64px;margin-bottom:24px;border-radius:18px;background:#fff;box-shadow:0 2px 8px oklch(0 0 0/.12),0 0 0 1px oklch(0 0 0/.05)}.logo svg{width:46px;height:46px}' +
  'h1{margin:0 0 8px;font-size:20px;font-weight:700;text-wrap:balance}p{margin:0 0 28px;color:var(--muted);text-wrap:balance}' +
  '.code{margin:-18px 0 28px;font:12px/1.5 ui-monospace,Consolas,monospace;opacity:.75;overflow-wrap:anywhere}' +
  '.btn{display:inline-flex;align-items:center;min-height:48px;padding:0 28px;border:0;border-radius:14px;background:var(--fill);color:#fff;font:inherit;font-weight:600;text-decoration:none;cursor:pointer}' +
  '.btn:active{scale:.97}.btn:focus-visible{outline:2px solid var(--fill);outline-offset:3px}' +
  '</style>';

/**
 * title · msg · code 는 평문이다 — 이스케이프해서 넣는다. msg 의 \n 은 줄바꿈. 짧게 쓰고 줄은 직접 나눈다(휴대폰 폭).
 * code 는 오류 코드 · 상태처럼 사람이 읽을 필요는 적은 값 — 설명 아래 작은 글씨로 따로 둔다.
 * 로그인 흐름이 실패한 화면은 모두 여기를 지나 로그를 남긴다. who 를 안 주면 상태로 정한다 — 500 설정 · 502 Keycloak · 4xx 요청.
 * 로그에는 msg 를 줄여 남긴다. msg 에 누구나 넣을 수 있는 값(URL 쿼리)이 섞였으면 부르는 쪽이 fields 로 대신 줄 것을 넘긴다.
 * 응답 상태는 200 이다 — 앱(Capacitor errorPath)은 화면 주소가 4xx · 5xx 를 받으면 이 화면 대신 '허브를 열지 못했습니다'를 띄운다.
 * 실제 상태(status)는 로그에 남는다
 */
export function htmlError(
  title: string,
  msg: string,
  status = 400,
  opts: { who?: Who; fields?: Record<string, unknown>; code?: string } = {},
): Response {
  log(status >= 500 ? 'error' : 'warn', 'auth.error_page', opts.who ?? (status === 500 ? 'config' : status >= 500 ? 'keycloak' : 'request'),
    { status, title, ...(opts.fields ?? { detail: clip(msg), code: clip(opts.code) }) });
  title = esc(title);
  msg = esc(msg).replace(/\n/g, '<br>');
  const code = opts.code ? `<p class="code">${esc(opts.code)}</p>` : '';
  return new Response(
    `<!doctype html><html lang="ko"><meta charset="utf-8"><title>${title}</title>${PAGE_HEAD}` +
    `<main><span class="logo">${LOGO}</span><h1>${title}</h1><p>${msg}</p>${code}` +
    '<a class="btn" href="/api/auth/login">다시 로그인</a></main></html>',
    { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  );
}
