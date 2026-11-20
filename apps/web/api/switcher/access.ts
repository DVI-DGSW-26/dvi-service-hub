/**
 * /api/switcher/access — 서비스 이동 버튼(switcher.js)이 "이 사람의 역할"을 묻는 곳
 *
 * 다른 사이트(탈탈 · 띵동 등) 화면에서 credentials: 'include' 로 부른다.
 * 실려 오는 것은 역할만 담은 hub_access 쿠키다 (lib/session.ts). 로그인 쿠키가 아니다.
 *
 * - 응답은 services.ts 에 등록된 서비스 주소에만 연다 (CORS). 모르는 사이트가
 *   불러도 브라우저가 응답을 읽지 못하게 한다.
 * - 쿠키가 없거나(허브에 아직 안 들어옴, 브라우저가 막음) 만료됐으면
 *   { known: false } — switcher 는 전체 목록을 보여준다.
 */
import { ACCESS_COOKIE, readCookie, verifySession, type Signed } from '../../lib/session.js';
// 화면 도메인(src/features/systems)의 index 는 React 컴포넌트까지 끌고 와 Edge 번들에 넣지 않는다 — 순수 데이터 파일만
import { services } from '../../src/features/systems/lib/services';

export const config = { runtime: 'edge' };

const ORIGINS = new Set(
  services.flatMap((s) =>
    s.links.flatMap((l) => {
      try { return [new URL(l.url).origin]; }
      catch { return []; } // 잘못된 주소는 건너뛴다
    }),
  ),
);

// 서명한 쿠키라도 예전 형식이면 빠진 필드가 있을 수 있다
interface Access extends Signed {
  realm?: string[];
  svc?: Record<string, string[]>;
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin') ?? '';
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'private, no-store',
    vary: 'Origin, Cookie',
  });
  if (!ORIGINS.has(origin)) return new Response(JSON.stringify({ known: false }), { status: 403, headers });
  headers.set('access-control-allow-origin', origin);
  headers.set('access-control-allow-credentials', 'true');

  const data = await verifySession<Access>(readCookie(req, ACCESS_COOKIE), process.env.SESSION_SECRET);
  if (!data) return new Response(JSON.stringify({ known: false }), { status: 200, headers });
  return new Response(JSON.stringify({ known: true, realm: data.realm ?? [], svc: data.svc ?? {} }), { status: 200, headers });
}
