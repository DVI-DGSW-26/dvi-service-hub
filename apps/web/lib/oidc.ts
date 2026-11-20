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

/** 로그인 진행 상태 (hub_auth 쿠키). callback 에서 대조한다 */
export interface PendingLogin extends Signed {
  state: string;
  nonce: string;
  verifier: string;
  next: string;
  /** 통합 로그인에서 할 일(kc_action). 있으면 callback 이 결과를 돌아갈 주소에 붙인다 */
  action?: string;
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

/** 설정이 빠졌을 때 사람이 읽을 수 있는 화면을 돌려준다 */
export function configError(msg: string): Response {
  return htmlError('설정이 필요합니다', msg, 500);
}

/** title · msg 는 평문이다 — 쿼리값(error_description)이 들어오므로 반드시 이스케이프한다 */
export function htmlError(title: string, msg: string, status = 400): Response {
  title = esc(title);
  msg = esc(msg);
  return new Response(
    `<!doctype html><html lang="ko"><meta charset="utf-8"><title>${title}</title>` +
    `<div style="font:15px/1.7 system-ui,'Malgun Gothic',sans-serif;max-width:34rem;margin:12vh auto;padding:0 1.5rem;color:#1B2428">` +
    `<h1 style="font-size:1.25rem;margin:0 0 .5rem">${title}</h1>` +
    `<p style="margin:0 0 1.25rem;color:#48545A">${msg}</p>` +
    `<p style="margin:0"><a href="/api/auth/login" style="color:#B23F05">다시 로그인</a></p></div></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}
