/**
 * /api/health — 가동 감시(UptimeRobot 등)가 부르는 곳. 로그인 없이 열려 있다(middleware matcher 밖).
 *
 * 허브가 돌려면 셋이 다 살아 있어야 한다. 하나라도 아니면 503 이고, 무엇이 죽었는지 본문에 적는다.
 *   config     우리 환경변수(SESSION_SECRET · OIDC_*)가 있다 — 값은 내보내지 않는다
 *   keycloak   통합 로그인 설정 문서(discovery)가 열린다 — 죽으면 아무도 로그인 · 갱신하지 못한다
 *   hubServer  허브 서버(service-hub-server)의 actuator health 가 UP — 죽으면 위젯이 모두 빈칸이다
 *
 * 200 { status: 'ok', checks: { config: 'ok', keycloak: 'up', hubServer: 'up' } }
 * 503 { status: 'down', checks: { …, keycloak: 'down (timeout)' } }
 */
import { log } from '../lib/log.js';

export const config = { runtime: 'edge' };

/** vercel.json 의 /api/hub rewrite 대상과 같은 서버 */
const HUB_SERVER_HEALTH = 'https://api.dvi-ind.com/hub/actuator/health';
const TIMEOUT_MS = 5000;

async function probe(url: string, ok: (res: Response) => Promise<boolean>): Promise<string> {
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    return (await ok(res)) ? 'up' : `down (${res.status})`;
  } catch (e) {
    return `down (${(e as Error).name === 'TimeoutError' ? 'timeout' : 'unreachable'})`;
  }
}

export default async function handler(): Promise<Response> {
  const issuer = process.env.OIDC_ISSUER;
  const missing = ['SESSION_SECRET', 'OIDC_ISSUER', 'OIDC_CLIENT_ID'].filter((k) => !process.env[k]);

  const [keycloak, hubServer] = await Promise.all([
    issuer
      ? probe(`${issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`, (r) => Promise.resolve(r.ok))
      : Promise.resolve('down (OIDC_ISSUER 없음)'),
    probe(HUB_SERVER_HEALTH, async (r) => r.ok && ((await r.json().catch(() => null)) as { status?: string } | null)?.status === 'UP'),
  ]);
  const checks = { config: missing.length ? `missing ${missing.join(', ')}` : 'ok', keycloak, hubServer };
  const up = !missing.length && keycloak === 'up' && hubServer === 'up';

  if (!up) {
    if (missing.length) log('error', 'health.down', 'config', { check: 'config', detail: checks.config });
    if (keycloak !== 'up') log('error', 'health.down', 'keycloak', { check: 'keycloak', detail: keycloak });
    if (hubServer !== 'up') log('error', 'health.down', 'hub-server', { check: 'hubServer', detail: hubServer });
  }

  return new Response(JSON.stringify({ status: up ? 'ok' : 'down', checks }), {
    status: up ? 200 : 503,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
