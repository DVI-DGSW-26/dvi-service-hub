import { config, cookie, FLOW_COOKIE, pkceChallenge, randomToken, redirect, seal } from '../_lib/auth.js'

export function GET(): Response {
  const state = randomToken()
  const verifier = randomToken()

  const url = new URL(config.authorizeUrl)
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state,
    code_challenge: pkceChallenge(verifier),
    code_challenge_method: 'S256',
  }).toString()

  const flow = seal({ state, verifier, exp: Math.floor(Date.now() / 1000) + 600 })
  return redirect(url.toString(), [cookie(FLOW_COOKIE, flow, 600)])
}
