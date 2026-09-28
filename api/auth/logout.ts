import { config, cookie, redirect, SESSION_COOKIE } from '../_lib/auth.js'

export function GET(): Response {
  const clear = cookie(SESSION_COOKIE, '', 0)
  if (!config.logoutUrl) return redirect('/', [clear])

  const url = new URL(config.logoutUrl)
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('post_logout_redirect_uri', `${config.appUrl}/`)
  return redirect(url.toString(), [clear])
}
