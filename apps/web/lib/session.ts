/**
 * session.js — 로그인 세션 쿠키 서명·검증
 *
 * company-events 의 검증된 구현을 가져왔다 (사내 표준 패턴).
 * 쿠키 값은  base64url(JSON) + "." + base64url(HMAC-SHA256)  형태다.
 * 비밀키(SESSION_SECRET)는 저장소가 아니라 Vercel 환경변수에 둔다.
 * Edge 런타임에서 돌아가야 하므로 Node 모듈 대신 Web Crypto 만 쓴다.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

export const SESSION_COOKIE = 'hub_session';
export const IDTOKEN_COOKIE = 'hub_idt'; // 전체 로그아웃(id_token_hint)에만 쓴다
export const AUTH_COOKIE = 'hub_auth'; // 로그인 진행 중에만 쓰는 임시 쿠키
/** 로그인 진행 쿠키는 state 마다 따로 둔다 — 한 칸이면 여러 탭이 같이 로그인할 때 서로 덮어 먼저 시작한 탭이 실패한다 */
export const authCookie = (state: string) => `${AUTH_COOKIE}.${state}`;
/** Keycloak refresh token — 세션을 늘리는 /api/auth/refresh 에만 실려 간다 (lib/keycloak.ts) */
export const REFRESH_COOKIE = 'hub_rt';
/**
 * hub_session 이 버티는 시간(초). 일부러 짧다 — 끝나기 전에 /api/auth/refresh 가 Keycloak 에서 갱신해 늘린다.
 * 쿠키 수명만 길게 두지 않는 이유: 퇴사 처리 · 권한 변경이 다음 갱신에서 바로 반영된다.
 * service-hub-server 도 이 exp 로 hub_session 을 거른다 — 화면은 401 이면 한 번 갱신하고 다시 부른다(src/shared/api).
 */
export const SESSION_SECONDS = 10 * 60;
/**
 * 역할만 담은 쿠키 — 서비스 이동 버튼(switcher.js)이 다른 사이트 화면에서 /api/switcher/access 로 묻는다.
 * 그 요청에는 로그인 쿠키(SameSite=Lax)가 따라오지 않아 이것만 SameSite=None 으로 둔다.
 * 세션 쿠키를 None 으로 바꾸지 않는다(허브 전체가 다른 사이트 요청에 열린다). 이 쿠키로는 로그인이 되지 않는다.
 * 다른 사이트 쿠키를 막는 브라우저에서는 안 실려 가고, 그때 switcher 는 전체 목록을 보여준다.
 */
export const ACCESS_COOKIE = 'hub_access';

// 쓰는 경로에만 실어 보낸다 — Path=/ 이면 /api/hub 프록시를 거쳐 백엔드까지 토큰이 간다
const COOKIE_PATH: Record<string, string> = {
  [IDTOKEN_COOKIE]: '/api/auth/logout',
  [AUTH_COOKIE]: '/api/auth/callback',
  [REFRESH_COOKIE]: '/api/auth/refresh',
  [ACCESS_COOKIE]: '/api/switcher',
};

/** 서명해 쿠키에 담는 값은 모두 만료 시각(초)을 가진다 */
export interface Signed {
  exp: number;
}

/** 로그인된 사용자 세션 (hub_session 쿠키) */
export interface Session extends Signed {
  sub: string;
  email: string;
  name: string;
  realm: string[];
  svc: Record<string, string[]>;
}

export function toB64url(bytes: Uint8Array | ArrayBuffer): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64url(str: string): Uint8Array<ArrayBuffer> {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * 쿠키마다 다른 키로 서명한다 — 한 키면 누구나 받는 hub_auth(로그인 시작) · hub_access 를 hub_session 자리에 넣어 로그인 검사를 통과한다.
 * hub_session 만 SESSION_SECRET 그대로 쓴다(service-hub-server 가 이 키로 연다).
 */
const hmacKey = (secret: string, cookie: string) =>
  crypto.subtle.importKey('raw', enc.encode(cookie === SESSION_COOKIE ? secret : `${secret}:${cookie}`),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

/** 값을 cookie 쿠키 몫의 키로 서명해 쿠키 문자열로 만든다 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- T 가 있어야 객체 리터럴에 쿠키 형식 밖의 필드가 섞이면 잡힌다
export async function signSession<T extends Signed>(payload: T, secret: string, cookie = SESSION_COOKIE): Promise<string> {
  const body = toB64url(enc.encode(JSON.stringify(payload)));
  const sig = toB64url(await crypto.subtle.sign('HMAC', await hmacKey(secret, cookie), enc.encode(body)));
  return `${body}.${sig}`;
}

/** 서명을 확인하고 본문을 읽는다. 만료는 보지 않는다. 서명 · 모양이 틀리면 null */
async function openSigned<T extends Signed>(token: string | null, secret: string | undefined, cookie: string): Promise<T | null> {
  if (!token || !secret || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  let ok = false;
  try {
    ok = await crypto.subtle.verify('HMAC', await hmacKey(secret, cookie), fromB64url(sig), enc.encode(body));
  } catch { return null; }
  if (!ok) return null;
  try {
    return JSON.parse(dec.decode(fromB64url(body))) as T;
  } catch { return null; }
}

/** cookie 쿠키 몫의 키로 서명과 만료를 확인한다. 유효하지 않으면 null */
export async function verifySession<T extends Signed = Session>(
  token: string | null,
  secret: string | undefined,
  cookie = SESSION_COOKIE,
): Promise<T | null> {
  const data = await openSigned<T>(token, secret, cookie);
  return data?.exp && data.exp * 1000 >= Date.now() ? data : null;
}

/**
 * verifySession 이 null 일 때 그 이유 — 로그용. verifySession 이 null 인 쿠키에만 부른다.
 *   none     쿠키가 없다
 *   expired  서명은 맞고 끝났다 — 갱신하면 된다
 *   invalid  서명 · 모양이 틀렸다 — 깨지거나 조작된 쿠키, 또는 SESSION_SECRET 이 바뀌었다. 어느 쪽인지는 모른다
 */
export async function sessionProblem(token: string | null, secret: string | undefined): Promise<'none' | 'expired' | 'invalid'> {
  if (!token) return 'none';
  return (await openSigned(token, secret, SESSION_COOKIE)) ? 'expired' : 'invalid';
}

/** Cookie 헤더에서 값 하나를 꺼낸다 */
export function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get('cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(i + 1).trim()); }
    catch { return null; } // 깨진 쿠키 하나로 middleware 가 모든 페이지를 500 으로 만들지 않게
  }
  return null;
}

/** Set-Cookie 헤더 값을 만든다. maxAge 0 이면 삭제 */
export function buildCookie(name: string, value: string, maxAge: number): string {
  const bits = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${COOKIE_PATH[name.split('.')[0]] ?? '/'}`, // hub_auth.<state> 도 hub_auth 의 경로로
    'HttpOnly',
    'Secure',
    `SameSite=${name === ACCESS_COOKIE ? 'None' : 'Lax'}`,
    `Max-Age=${maxAge}`,
  ];
  return bits.join('; ');
}

/** 세션에서 역할만 떼어 서명한 쿠키. exp 에 끝난다 — 짧은 세션이 아니라 refresh token 과 같은 시각을 넘긴다 */
export async function buildAccessCookie(session: Signed & Partial<Pick<Session, 'realm' | 'svc'>>, secret: string): Promise<string> {
  const maxAge = Math.max(0, session.exp - Math.floor(Date.now() / 1000));
  return buildCookie(ACCESS_COOKIE, await signSession({ realm: session.realm, svc: session.svc, exp: session.exp }, secret, ACCESS_COOKIE), maxAge);
}
