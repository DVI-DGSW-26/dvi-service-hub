// 디비전 로그인 서비스(OAuth 2.0 / OIDC) 연동 공용 코드.
// '_'로 시작하는 폴더는 Vercel이 API 경로로 만들지 않는다.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'hub_session'
export const FLOW_COOKIE = 'hub_oauth'
const SESSION_TTL_SEC = 60 * 60 * 8

export interface SessionUser {
  sub: string
  name?: string
  email?: string
}

function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback
  if (!v) throw new Error(`환경변수 ${name}이(가) 설정되지 않았습니다.`)
  return v
}

export const config = {
  get clientId() { return env('AUTH_CLIENT_ID') },
  get clientSecret() { return env('AUTH_CLIENT_SECRET') },
  get authorizeUrl() { return env('AUTH_AUTHORIZE_URL') },
  get tokenUrl() { return env('AUTH_TOKEN_URL') },
  get userinfoUrl() { return process.env.AUTH_USERINFO_URL },
  get logoutUrl() { return process.env.AUTH_LOGOUT_URL },
  get scope() { return env('AUTH_SCOPE', 'openid profile email') },
  get appUrl() { return env('APP_URL').replace(/\/$/, '') },
  get sessionSecret() { return env('SESSION_SECRET') },
  get redirectUri() { return `${this.appUrl}/api/auth/callback` },
}

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString('base64url')

export const randomToken = () => b64url(randomBytes(32))

export const pkceChallenge = (verifier: string) =>
  b64url(createHash('sha256').update(verifier).digest())

function sign(payload: string) {
  return b64url(createHmac('sha256', config.sessionSecret).update(payload).digest())
}

/** 서명된 값: base64url(JSON).서명 */
export function seal(data: object): string {
  const payload = b64url(JSON.stringify(data))
  return `${payload}.${sign(payload)}`
}

export function unseal<T>(value: string | undefined): T | null {
  if (!value) return null
  const [payload, mac] = value.split('.')
  if (!payload || !mac) return null
  const expected = Buffer.from(sign(payload))
  const actual = Buffer.from(mac)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof data.exp === 'number' && data.exp < Date.now() / 1000) return null
    return data as T
  } catch {
    return null
  }
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get('cookie') ?? ''
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
}

export function cookie(name: string, value: string, maxAgeSec: number): string {
  const secure = config.appUrl.startsWith('https://') ? '; Secure' : ''
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`
}

export function sessionCookie(user: SessionUser): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC
  return cookie(SESSION_COOKIE, seal({ ...user, exp }), SESSION_TTL_SEC)
}

export function getSessionUser(req: Request): SessionUser | null {
  const s = unseal<SessionUser & { exp: number }>(readCookie(req, SESSION_COOKIE))
  return s ? { sub: s.sub, name: s.name, email: s.email } : null
}

export function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: location })
  for (const c of cookies) headers.append('Set-Cookie', c)
  return new Response(null, { status: 302, headers })
}

/** id_token의 payload를 꺼낸다. 토큰 엔드포인트에서 서버 간 통신으로 직접 받은 값이라 서명 검증은 생략한다. */
export function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
  } catch {
    return null
  }
}
