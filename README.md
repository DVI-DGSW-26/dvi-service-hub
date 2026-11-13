# DVI 서비스 허브

DVISION 사내 서비스를 한곳에서 찾고 이동하는 포털.

## 실행

pnpm 을 쓴다 (`package.json` 의 `packageManager` 버전).

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm dev:mock   # 새 대시보드(src/portal) 목업 데이터로 미리보기
pnpm typecheck  # 화면(src) · 서버(api, lib, middleware.ts) 타입 검사
pnpm build      # dist/ 생성
```

## 구성

- 화면: React 19 + TypeScript + Tailwind CSS 4 (`src/styles.css` 의 `@theme` 에 색 토큰)
- 서버: Vercel Edge 함수 `api/auth/*.ts`, 미들웨어 `middleware.ts`, 공용 `lib/*.ts`
- tsconfig 는 `tsconfig.app.json`(src) · `tsconfig.api.json`(서버) · `tsconfig.node.json`(vite 설정)로 나뉜다.

## 새 대시보드 (dev:mock · Vercel preview 전용)

`pnpm dev:mock`(`vite --mode mock`) 과 Vercel preview 배포(`VERCEL_ENV=preview`)에서만 `vite.config.ts` 의
`mockPortal` 플러그인이 진입점을 `src/portal/main.tsx` 로 바꿔 끼운다. `pnpm dev` · 운영(production) 빌드는
기존 화면(`src/App.tsx`) 그대로이고 `src/portal` 코드는 번들에 들어가지 않는다.

preview 에서는 로그인 정보만 실제 값이고 공지 · 일정 · 소식 등은 목업이다. 로컬에서 preview 빌드를 확인하려면
`VERCEL_ENV=preview pnpm build && pnpm preview`.

```
src/portal/
  PortalApp.tsx   레이아웃 + 해시 라우팅(#/, #/systems, #/info, #/guide, #/account)
  portal.css      전용 Tailwind 토큰
  api/            데이터 창구 — 지금은 mocks 를 지연과 함께 돌려준다. 실제 API 가 생기면 여기만 바꾼다
  mocks/          공지 · 점검 · 일정 · 소식 · 사내정보 · FAQ · 계정 보안 목업
  components/     layout(헤더) · dashboard(홈 패널) · services(서비스 카드) · ui(공용)
  pages/          홈 · 업무시스템 · 사내정보 · 이용안내 · 계정 설정
  hooks/ lib/ types/
```

서비스 목록은 두 화면이 같은 `src/services.ts` 를 쓴다.

## 서비스 추가·수정

`src/services.ts`의 `services` 배열만 고치면 된다.

- `links`: 첫 번째 링크가 카드 클릭 시 이동 대상. 링크가 2개 이상이면 카드 하단에 모두 표시.
- `auth`: `separate`(개별 로그인) → SSO 전환 완료 시 `sso`로 변경.

## 로드맵

1. 포털 (현재)
2. 허브에 회사 계정 로그인 (IdP 연동)
3. 각 서비스를 같은 IdP로 전환 → SSO
