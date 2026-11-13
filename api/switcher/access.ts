/**
 * /api/switcher/access — 서비스 이동 버튼이 "이 사람의 역할"을 묻는 곳
 *
 * 다른 사이트(탈탈·띵동 등) 화면에서 credentials: 'include' 로 부른다.
 * 실려 오는 것은 역할만 담은 hub_access 쿠키다 (lib/session.js). 로그인 쿠키가 아니다.
 *
 * - 응답은 허브 목록에 등록된 서비스 주소에만 연다 (CORS). 모르는 사이트가
 *   불러도 브라우저가 응답을 읽지 못하게 한다.
 * - 쿠키가 없거나(허브에 아직 안 들어옴, 브라우저가 막음) 만료됐으면
 *   { known: false } — switcher 는 전체 목록을 보여준다.
 */
import { ACCESS_COOKIE, readCookie, verifySession } from '../../lib/session.js'
import { serviceOrigins } from '../../src/access'
import { bundledServices, parseServices } from '../../src/services'

// Edge 런타임에도 process.env 는 있다. 이 폴더는 타입 검사(tsc -b) 대상이 아니라 여기서만 선언한다
declare const process: { env: Record<string, string | undefined> }

export const config = { runtime: 'edge' }

// 허브 서버 주소. vercel.json 의 rewrites 에도 같은 주소가 적혀 있다 — 옮기면 둘 다 고친다.
const HUB_API = (process.env.HUB_API_URL || 'https://api.dvi-ind.com/hub').replace(/\/+$/, '')
const ORIGINS_TTL_MS = 60_000

let cached: { at: number; origins: Set<string> } | null = null

/**
 * 역할을 알려줘도 되는 주소 = 지금 허브 목록에 있는 서비스들.
 * 목록은 서버에서 관리하므로 서버에 묻고 잠깐 기억해 둔다. 서버가 응답하지 않으면
 * 마지막으로 받은 것, 그것도 없으면 빌드할 때의 예비 목록으로 판단한다.
 */
async function allowedOrigins(): Promise<Set<string>> {
  if (cached && Date.now() - cached.at < ORIGINS_TTL_MS) return cached.origins
  try {
    const res = await fetch(`${HUB_API}/services`, { signal: AbortSignal.timeout(3000) })
    const list = res.ok ? parseServices((await res.json())?.data) : null
    if (list) {
      cached = { at: Date.now(), origins: serviceOrigins(list) }
      return cached.origins
    }
  } catch { /* 아래 예비 판단으로 */ }
  return cached?.origins ?? serviceOrigins(bundledServices)
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin') ?? ''
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'private, no-store',
    vary: 'Origin, Cookie',
  })
  if (!origin || !(await allowedOrigins()).has(origin)) {
    return new Response(JSON.stringify({ known: false }), { status: 403, headers })
  }
  headers.set('access-control-allow-origin', origin)
  headers.set('access-control-allow-credentials', 'true')

  const data = await verifySession(readCookie(req, ACCESS_COOKIE), process.env.SESSION_SECRET)
  if (!data) return new Response(JSON.stringify({ known: false }), { status: 200, headers })

  return new Response(
    JSON.stringify({ known: true, realm: data.realm ?? [], svc: data.svc ?? {} }),
    { status: 200, headers },
  )
}
