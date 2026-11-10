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
export const SESSION_HOURS = 12;

export function toB64url(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64url(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const hmacKey = (secret) =>
  crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

/** 세션 값을 서명해 쿠키 문자열로 만든다 */
export async function signSession(payload, secret) {
  const body = toB64url(enc.encode(JSON.stringify(payload)));
  const sig = toB64url(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)));
  return `${body}.${sig}`;
}

/** 서명과 만료를 확인한다. 유효하지 않으면 null */
export async function verifySession(token, secret) {
  if (!token || !secret || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  let ok = false;
  try {
    ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(sig), enc.encode(body));
  } catch { return null; }
  if (!ok) return null;
  try {
    const data = JSON.parse(dec.decode(fromB64url(body)));
    if (!data.exp || data.exp * 1000 < Date.now()) return null;
    return data;
  } catch { return null; }
}

/** Cookie 헤더에서 값 하나를 꺼낸다 */
export function readCookie(req, name) {
  const raw = req.headers.get('cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

/** Set-Cookie 헤더 값을 만든다. maxAge 0 이면 삭제 */
export function buildCookie(name, value, maxAge, { path = '/', sameSite = 'Lax' } = {}) {
  const bits = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    'HttpOnly',
    'Secure',
    `SameSite=${sameSite}`,
    `Max-Age=${maxAge}`,
  ];
  return bits.join('; ');
}

/**
 * 서비스 이동 버튼(switcher.js)이 "이 사람이 쓸 수 있는 서비스"를 묻는 데 쓰는 쿠키.
 *
 * switcher.js 는 탈탈·띵동 같은 다른 사이트 화면에서 돈다. 그 화면에서 허브로 보내는
 * 요청에는 로그인 쿠키(SameSite=Lax)가 따라오지 않는다. 그래서 역할만 담은 쿠키를
 * 따로 두고 SameSite=None 으로 다른 사이트 요청에도 실려 가게 한다.
 *
 * - 세션 쿠키를 None 으로 바꾸지 않는다. 그러면 허브 전체가 다른 사이트 요청에 열린다.
 * - 이 쿠키로는 로그인이 되지 않는다. 담는 것은 역할(realm·svc)뿐이고,
 *   읽는 곳도 /api/switcher 하나다 (Path 로 제한).
 * - 사파리·파이어폭스처럼 다른 사이트 쿠키를 막는 브라우저에서는 안 실려 간다.
 *   그때 switcher 는 전체 목록을 보여준다 — 원래 동작과 같다.
 */
export const ACCESS_COOKIE = 'hub_access';
const ACCESS_COOKIE_OPTS = { path: '/api/switcher', sameSite: 'None' };

/** 세션에서 역할만 떼어 서명한 쿠키를 만든다. 세션과 같은 시각에 끝난다. */
export async function buildAccessCookie(session, secret) {
  const maxAge = Math.max(0, session.exp - Math.floor(Date.now() / 1000));
  const value = await signSession({ realm: session.realm ?? [], svc: session.svc ?? {}, exp: session.exp }, secret);
  return buildCookie(ACCESS_COOKIE, value, maxAge, ACCESS_COOKIE_OPTS);
}

export function clearAccessCookie() {
  return buildCookie(ACCESS_COOKIE, '', 0, ACCESS_COOKIE_OPTS);
}
