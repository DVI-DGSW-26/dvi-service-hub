import { getSessionUser } from '../_lib/auth.js'

export function GET(req: Request): Response {
  const user = getSessionUser(req)
  return Response.json(user ? { user } : { user: null }, {
    status: user ? 200 : 401,
    headers: { 'Cache-Control': 'no-store' },
  })
}
