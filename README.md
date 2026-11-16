# DVI 서비스 허브

DVISION 사내 서비스를 한곳에서 찾고 이동하는 포털.

## 실행

pnpm 을 쓴다 (`package.json` 의 `packageManager` 버전).

```bash
pnpm install
pnpm dev        # http://localhost:5173 — 실제 허브 서버(/api/hub)를 부른다
pnpm typecheck  # 화면(src) · 서버(api, lib, middleware.ts) 타입 검사
pnpm build      # dist/ 생성
```

### 로컬에서 실제 데이터 보기

화면은 `/api/hub/...` 를 부르고, 운영에서는 Vercel 이 `vercel.json` rewrites 로 허브 서버
(`https://api.dvi-ind.com/hub`)에 넘긴다. 로컬은 `vite.config.ts` 의 프록시가 같은 일을 한다.

허브 서버는 로그인 쿠키(`hub_session`)로 사람을 확인하는데, 그 쿠키를 만드는 `/api/auth/*` (Edge 함수)는
vite 에서 돌지 않는다. 운영 허브에 로그인한 브라우저의 `hub_session` 값을 복사해 `.env.local` 에 넣는다
(`.env.example` 참고). 비어 있거나 만료되면 패널마다 401 이 오고 콘솔에 안내가 한 번 뜬다.

로컬에는 `/api/auth/me` 도 없어 화면의 로그인 사용자는 `src/mocks/info.ts` 의 목업이다
(버튼 표시용 — 실제 권한은 서버가 쿠키의 계정으로 판단한다).

## 구성

- 화면: React 19 + TypeScript + Tailwind CSS 4 (`src/styles.css` 에 색 토큰)
- 데이터: axios(`src/api`) + TanStack Query(`src/queries`)
- 서버: Vercel Edge 함수 `api/auth/*.ts`, 미들웨어 `middleware.ts`, 공용 `lib/*.ts`
- tsconfig 는 `tsconfig.app.json`(src) · `tsconfig.api.json`(서버) · `tsconfig.node.json`(vite 설정)로 나뉜다.

```
src/
  App.tsx         레이아웃 + 해시 라우팅(#/, #/systems, #/info, #/account)
  api/
    http.ts       axios 인스턴스 — /api/hub(허브 서버) · /api/auth(Edge). 인터셉터가 로그 · 오류 변환 · 401 처리
    errors.ts     ApiError { status, code, message, field } — 화면 분기는 code 로
    logger.ts     API 로그 (아래)
    dashboard.ts  공지 · 점검 · 일정 · 캘린더 · 소식 (포털 대시보드 API 명세 v0.1)
    hub.ts        기존 API — 서비스 목록 · 즐겨찾기 · 최근 사용 · 서비스 관리 · 플로우 글
    auth.ts       /api/auth/me
  queries/        TanStack Query — queryOptions · 쓰기 훅(성공하면 목록 무효화) · 기본 설정(client.ts)
  data/           서버 API 가 없는 정적 데이터 — 빠른 바로가기 · 조직도
  mocks/          로컬 로그인 사용자 · 계정 보안(Keycloak 계정 API 연동 전)
  components/ pages/ hooks/ lib/ types/ i18n/
```

### API 로그

| 단계 | 내용 |
| --- | --- |
| `silent` | 끔 |
| `error` | 오류만 한 줄 (운영 기본값) |
| `info` | 요청마다 상태 · 경로 · 걸린 시간 한 줄 |
| `debug` | params · body · 응답을 펼쳐 보기 (개발 서버 기본값) |

- 빌드 때 고정: `VITE_API_LOG=info`
- 운영 화면에서 잠깐 자세히: 브라우저 콘솔에서 `portalApiLog.set('debug')` (이 브라우저에만 저장, `portalApiLog.reset()` 으로 되돌림)
- 요청마다 `X-Request-Id` 를 붙이고 로그에 `#id` 로 남긴다.
- 개발 서버에서는 화면 왼쪽 아래 TanStack Query Devtools 로 캐시 · 요청 상태를 볼 수 있다(운영 번들에는 없다).

서비스 목록은 `src/services.ts` 를 쓴다.

## 서비스 추가·수정

`src/services.ts`의 `services` 배열만 고치면 된다.

- `links`: 첫 번째 링크가 카드 클릭 시 이동 대상. 링크가 2개 이상이면 카드 하단에 모두 표시.
- `auth`: `separate`(개별 로그인) → SSO 전환 완료 시 `sso`로 변경.

## 로드맵

1. 포털 (현재)
2. 허브에 회사 계정 로그인 (IdP 연동)
3. 각 서비스를 같은 IdP로 전환 → SSO
