# DVI 서비스 허브

DVISION 사내 서비스를 한곳에서 찾고 이동하는 포털.

## 실행

pnpm 모노레포다 (`package.json` 의 `packageManager` 버전, Node 26 LTS). 명령은 저장소 루트에서 친다.

```
apps/web/       허브 웹 — Vite + React, Vercel Edge 함수(api/ · lib/ · middleware.ts), switcher
apps/mobile/    휴대폰 앱 — Expo + React Native
packages/core/  @dvi/core — 웹 · 앱이 같이 쓰는 타입 · 서비스 목록 · 권한 · 화면 문구
```

```bash
pnpm install
pnpm dev        # http://localhost:5173 — 실제 허브 서버(/api/hub)를 부른다
pnpm dev:mock   # 서버 없이 가짜 데이터로 (아래 '목업으로 보기')
pnpm build      # apps/web/dist 생성
pnpm check      # 모든 패키지 typecheck · lint · test
```

앱은 `pnpm --filter @dvi/mobile start` 로 띄운다 — 자세한 것은 `apps/mobile/README.md`.

Vercel 프로젝트의 Root Directory 는 `apps/web` 이다 (docs/adr/0003-monorepo.md).
아래에서 `src/` · `api/` 등 경로는 `apps/web/` 기준이다.

### 목업으로 보기 (`pnpm dev:mock`)

서버 · 쿠키 없이 화면을 띄운다. axios 의 adapter 만 `src/mocks/server.ts` 로 바꿔 끼우므로 인터셉터 · `[api]` 로그 ·
TanStack Query 는 실제와 똑같이 돈다. 데이터는 오늘 날짜를 기준으로 만들고(`src/mocks/data.ts`), 입력 검사 · 정렬 ·
오류 코드는 포털 대시보드 API 명세 v0.5 를 따른다. 공지 · 점검 등록 · 삭제도 되고, 새로 고침하면 처음 상태로 돌아간다.

주소에 `?mock=` 을 붙이면 상황을 바꿀 수 있다 (쉼표로 여러 개, 예: `http://localhost:5173/?mock=slow,empty#/`).

| 값 | 상황 |
| --- | --- |
| `empty` | 목록이 모두 비었다 |
| `error` | 조회 실패 — 일정 · 캘린더 502 `FLOW_UNAVAILABLE`, 소식 502 `NEWS_UNAVAILABLE`, 공지 · 점검 500 |
| `forbidden` | 조회 403 (재직자가 아닌 사람) |
| `slow` | 응답 2.5초 |
| `readonly` | 쓰기 롤이 없는 사람 — 작성 버튼이 안 보인다 |

운영 빌드에는 들어가지 않는다 (`main.tsx` 가 `--mode mock` 일 때만 불러온다).

`vercel dev` 도 목업으로 뜬다 — `vercel.json` 의 `devCommand` 가 `pnpm dev:mock` 이고, `middleware.ts` 는
주소가 `localhost` · `127.0.0.1`(로컬 vercel dev)이면 로그인을 검사하지 않는다. 배포(production · preview)는 그 주소로
들어올 수 없어 해당하지 않는다.

### 로컬에서 실제 데이터 보기

화면은 `/api/hub/...` 를 부르고, 운영에서는 Vercel 이 `vercel.json` rewrites 로 허브 서버
(`https://api.dvi-ind.com/hub`)에 넘긴다. 로컬은 `vite.config.ts` 의 프록시가 같은 일을 한다.

허브 서버는 로그인 쿠키(`hub_session`)로 사람을 확인하는데, 그 쿠키를 만드는 `/api/auth/*` (Edge 함수)는
vite 에서 돌지 않는다. 운영 허브에 로그인한 브라우저의 `hub_session` 값을 복사해 `.env.local` 에 넣는다
(`.env.example` 참고). 비어 있거나 만료되면 패널마다 401 이 오고 콘솔에 안내가 한 번 뜬다.

로컬에는 `/api/auth/me` 도 없어 화면의 로그인 사용자는 `src/mocks/info.ts` 의 목업이다
(버튼 표시용 — 실제 권한은 서버가 쿠키의 계정으로 판단한다).

## 구성

- 화면: React 19 + TypeScript + Tailwind CSS 4 (`src/app/styles.css` · `src/app/styles/theme.css` 에 색 토큰)
- 데이터: axios(`src/shared/api/http.ts`) + TanStack Query(기능마다 `api/queries.ts`)
- 서버: Vercel Edge 함수 `api/auth/*.ts`, 미들웨어 `middleware.ts`, 공용 `lib/*.ts`
- tsconfig 는 `tsconfig.app.json`(src) · `tsconfig.api.json`(서버) · `tsconfig.node.json`(vite 설정)로 나뉜다.

```
src/
  app/            진입점 main.tsx · App.tsx(레이아웃 + 해시 라우팅 #/, #/systems, #/info, #/account) · 전역 스타일
  features/       기능 단위 — account · decor · hero · home · info · maintenance · news · quick-links · schedule · shell · systems · theme
    <기능>/       index.ts(밖에 보이는 것) · components/ · hooks/ · lib/ · api/(API 호출 · queries.ts)
  shared/         공용 — ui · hooks · lib · format · api(http · errors · logger) · types · constants · widget · i18n
  mocks/          로컬 로그인 사용자 · pnpm dev:mock 의 가짜 API(server.ts) · 데이터(data.ts)
  switcher/       다른 서비스에 넣는 앱 전환 스크립트(따로 빌드)
```

폴더 규칙(기능 루트에는 index.ts 만, 다른 기능은 index 로만 가져오기 등)은 `docs/adr/0002-domain-modules.md` — `pnpm lint` 가 검사한다.

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

서비스 목록은 `packages/core/src/services.ts` 를 쓴다.

## 서비스 추가·수정

`packages/core/src/services.ts`의 `services` 배열만 고치면 된다.

- `links`: 첫 번째 링크가 카드 클릭 시 이동 대상. 링크가 2개 이상이면 카드 하단에 모두 표시.
- `auth`: `separate`(개별 로그인) → SSO 전환 완료 시 `sso`로 변경.

## 로드맵

1. 포털 (현재)
2. 허브에 회사 계정 로그인 (IdP 연동)
3. 각 서비스를 같은 IdP로 전환 → SSO
