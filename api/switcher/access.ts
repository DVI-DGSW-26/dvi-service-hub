/**
 * /api/switcher/access — 서비스 이동 버튼이 "이 사람의 역할"을 묻는 곳
 *
 * 다른 사이트(탈탈·띵동 등) 화면에서 credentials: 'include' 로 부른다.
 * 실려 오는 것은 역할만 담은 hub_access 쿠키다 (lib/session.js). 로그인 쿠키가 아니다.
 *
 * - 응답은 services.ts 에 등록된 서비스 주소에만 연다 (CORS). 모르는 사이트가
 *   불러도 브라우저가 응답을 읽지 못하게 한다.
 * - 쿠키가 없거나(허브에 아직 안 들어옴, 브라우저가 막음) 만료됐으면
 *   { known: false } — switcher 는 전체 목록을 보여준다.
 */
import { ACCESS_COOKIE, readCookie, verifySession } from '../../lib/session.js'
import { serviceOrigins } from '../../src/access'

// Edge 런타임에도 process.env 는 있다. 이 폴더는 타입 검사(tsc -b) 대상이 아니라 여기서만 선언한다
declare const process: { env: Record<string, string | undefined> }

export const config = { runtime: 'edge' }

const ORIGINS = serviceOrigins()

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin') ?? ''
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'private, no-store',
    vary: 'Origin, Cookie',
  })
  if (!ORIGINS.has(origin)) {
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
