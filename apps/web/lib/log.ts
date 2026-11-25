/**
 * log.ts — 서버 코드(api/ · middleware)의 로그. Vercel Runtime Logs 에서 검색 · 필터하려고 한 줄 JSON 으로 남긴다.
 *
 * 레벨은 console 메서드로 정해진다 — 대시보드의 level 필터가 이것을 본다(JSON 안의 값이 아니라).
 * 토큰 · 쿠키 값은 넣지 않는다. 밖에서 온 값은 errorCode · clip 을 거쳐 넣는다.
 * rid 는 화면이 보낸 X-Request-Id — 브라우저 콘솔의 #id 로 이 줄을 찾는다(src/shared/api/logger.ts).
 *
 *   event  무슨 일인지 — session.invalid · refresh.rejected · auth.error_page …
 *   who    누구 쪽 문제인지. 대시보드에서 "who":"config" 로 찾으면 우리가 고칠 것만 나온다
 *          user      로그인이 끝났을 뿐인 정상 흐름 — 고장 아님
 *          keycloak  통합 로그인 서버가 거절했거나 닿지 않는다
 *          hub-server  허브 서버(service-hub-server)가 죽었거나 닿지 않는다(api/health.ts)
 *          config    우리 설정(환경변수)
 *          request   요청이 잘못됐다(오래된 로그인 탭 · 깨지거나 조작된 쿠키) — 원인이 하나로 정해지지 않는 것도 여기
 */
export type Who = 'user' | 'keycloak' | 'hub-server' | 'config' | 'request';

export function log(level: 'info' | 'warn' | 'error', event: string, who: Who, fields: Record<string, unknown> = {}) {
  console[level](JSON.stringify({ event, who, ...fields }));
}

/** 화면이 보낸 요청 번호. 아무나 넣을 수 있어 짧은 코드 모양만 받는다 */
export const requestId = (req: Request) => errorCode(req.headers.get('x-request-id'));

/** 누구나 넣을 수 있는 값(URL 의 error 등) — 짧은 코드 모양만 남기고 나머지는 other */
export function errorCode(v: unknown): string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  return typeof v === 'string' && /^[\w.:-]{1,64}$/.test(v) ? v : 'other';
}

/** 우리 쪽 서버(Keycloak)가 준 설명 · 우리 문구 — 제어 문자를 빼고 길이를 줄인다 */
export function clip(v: unknown, max = 160): string | undefined {
  // eslint-disable-next-line no-control-regex -- 로그 줄을 깨뜨리는 제어 문자를 지운다
  return typeof v === 'string' ? v.replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, max) : undefined;
}
