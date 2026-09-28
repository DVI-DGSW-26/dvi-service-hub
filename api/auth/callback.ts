import {
  config,
  cookie,
  decodeJwtPayload,
  FLOW_COOKIE,
  readCookie,
  redirect,
  sessionCookie,
  unseal,
  type SessionUser,
} from '../_lib/auth.js'

function fail(message: string, status = 400): Response {
  return new Response(`로그인 실패: ${message}`, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Set-Cookie': cookie(FLOW_COOKIE, '', 0) },
  })
}

export async function GET(req: Request): Promise<Response> {
  const params = new URL(req.url).searchParams
  if (params.get('error')) return fail(params.get('error_description') ?? params.get('error')!)

  const code = params.get('code')
  const flow = unseal<{ state: string; verifier: string }>(readCookie(req, FLOW_COOKIE))
  if (!code || !flow || flow.state !== params.get('state')) {
    return fail('요청이 만료되었거나 올바르지 않습니다. 다시 로그인해 주세요.')
  }

  const tokenRes = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code_verifier: flow.verifier,
    }),
  })
  if (!tokenRes.ok) {
    console.error('token exchange failed', tokenRes.status, await tokenRes.text())
    return fail('토큰 발급에 실패했습니다.', 502)
  }
  const tokens = (await tokenRes.json()) as { access_token?: string; id_token?: string }

  let claims: Record<string, unknown> | null = tokens.id_token ? decodeJwtPayload(tokens.id_token) : null
  if (config.userinfoUrl && tokens.access_token) {
    const infoRes = await fetch(config.userinfoUrl, {
      headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
    })
    if (infoRes.ok) claims = { ...claims, ...((await infoRes.json()) as Record<string, unknown>) }
  }
  if (!claims?.sub && !claims?.email) return fail('사용자 정보를 받지 못했습니다.', 502)

  const user: SessionUser = {
    sub: String(claims.sub ?? claims.email),
    name: claims.name as string | undefined,
    email: claims.email as string | undefined,
  }
  return redirect('/', [sessionCookie(user), cookie(FLOW_COOKIE, '', 0)])
}
