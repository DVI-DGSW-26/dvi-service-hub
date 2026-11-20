# ADR 0003. 웹 · 모바일을 pnpm 모노레포로 — apps/web · apps/mobile · packages/core

- 상태: 일부 되돌림 — 2026-11-20 apps/mobile · packages/core 를 지웠다. 웹 src 를 37347fd 로 맞춰 web 이 core 를 안 쓰게 됐고, 앱도 없어 쓰는 곳이 없다. 앱을 다시 만들 때 web 과 앱이 실제로 같이 쓰는 것만 새로 뺀다(지운 core 는 git 기록 · wip/mobile-login 에)
- 날짜: 2026-11-19
- 관련: ADR 0002(기능 모듈), Expo 문서 [Work with monorepos](https://docs.expo.dev/guides/monorepos/)

## 맥락

휴대폰 앱을 React Native(Expo)로 만든다. 웹(Vite + React)과 앱은 따로 빌드되지만 타입 · 서비스 목록 · 권한 규칙 ·
화면 문구는 같아야 한다. 저장소를 둘로 나누면 이것들을 두 번 고치게 되고, 한쪽만 고친 채 어긋나기 쉽다.

## 결정

```
apps/
  web/        Vite + React — 지금까지의 허브 화면 · Vercel Edge 함수(api/ · lib/ · middleware.ts) · switcher
  mobile/     Expo + React Native (Phase 4)
packages/
  core/       @dvi/core — 플랫폼을 모르는 순수 TS
```

- **pnpm workspace**(`pnpm-workspace.yaml` 의 `apps/*` · `packages/*`) 만 쓴다. Turborepo · Nx 같은 빌드 도구는 두지 않는다 —
  앱이 둘, 패키지가 하나라 `pnpm -r` 로 충분하다. 빌드가 느려지거나 캐시가 아쉬워지면 그때 Turborepo 를 얹는다.
- **`@dvi/core` 는 빌드하지 않고 TS 소스를 그대로 내보낸다**(`exports` 가 `./src/*.ts` 를 가리킨다). Vite · Metro · Vercel(esbuild) ·
  `node --test`(타입 지우기) 가 모두 .ts 를 직접 읽는다.
  - 진입점을 쪼갠다: `@dvi/core/types` · `/services` · `/access` · `/widget` · `/i18n`. 한 덩어리로 내보내면 Edge 함수가
    사전 JSON 까지 끌고 가고, Node 테스트가 JSON import 에서 깨진다.
  - core 안의 상대 경로는 `.ts` 까지 적는다(Node 가 확장자를 채우지 않는다).
  - React · React Native 를 가져오면 lint 에러다(`no-restricted-imports`). DOM · `Intl` 이외의 브라우저 API 도 쓰지 않는다.
- **처음 core 로 옮긴 것**: 공용 타입(`types`), 서비스 목록 · 권한(`services` · `access`), 위젯 크기 이름(`widget`),
  화면 문구 사전과 자리표시자 · 복수형(`i18n`). 사전 검사(ko/en 키 · 자리표시자 차이)는 개발 서버 콘솔 경고에서
  `pnpm test` 로 옮겼다 — 고친 사람이 콘솔을 안 봐도 걸린다.
- **API 호출 · TanStack Query 쿼리는 아직 옮기지 않는다.** 웹은 Vercel 이 붙여 주는 쿠키 세션(`/api/hub` rewrite)으로 서버를 부르고,
  앱은 같은 방식으로 로그인할 수 없다(쿠키 · 도메인이 다르다). 앱의 로그인 방식(OIDC + PKCE 토큰 등)이 정해지면
  `http` 를 주입받는 모양으로 `@dvi/core/api` 를 만든다.
- 명령은 루트에서: `pnpm dev` · `pnpm build`(웹), `pnpm check`(모든 패키지 typecheck · lint · test).

## 결과

- **Vercel 프로젝트 설정의 Root Directory 를 `apps/web` 으로 바꿔야 한다**(대시보드에서, 코드로는 못 바꾼다). Edge 함수는
  Root Directory 아래 `api/` 에 있어야 하고, 설치는 Vercel 이 저장소 루트의 pnpm 워크스페이스를 알아보고 루트에서 한다.
  "Root Directory 밖 파일 포함"(기본 켜짐)이 꺼져 있으면 `packages/core` 를 못 읽는다.
- switcher 를 사내 서버에 올리는 스크립트(`~/DVI-proxy/scripts/publish-switcher.sh`, 저장소 밖)가 저장소 루트에서
  `vite build -c vite.switcher.config.ts` 를 부른다면 `apps/web` 에서 부르도록 고쳐야 한다.
- Edge 함수 `api/switcher/access.ts` 가 화면 코드 안쪽 파일을 바로 가져오던 예외(ADR 0002)가 사라졌다 — `@dvi/core/services` 를 쓴다.
  switcher 도 시스템 기능의 배럴 대신 core 를 바로 쓴다.
- 웹 lint 는 구조와 무관한 기존 지적 315건이 남아 있다(ADR 0002). Phase 마다 이 수가 늘지 않는지 본다. core 는 0건이다.

## 검토한 다른 길

- **웹을 저장소 루트에 두고 `apps/mobile` 만 더하기** — Vercel 설정을 안 바꿔도 되지만, 루트 package.json 에 웹 의존성이 남아
  앱 쪽 React 버전과 섞이고, Expo 문서의 권장 모양(`apps/*`)에서 벗어난다.
- **저장소를 둘로** — 공용 코드를 npm 패키지로 내보내고 버전을 맞춰야 한다. 혼자 · 소수가 만드는 단계에는 무겁다.
- **core 를 tsc 로 빌드해 dist 를 내보내기** — 소비자 설정이 단순해지지만 고칠 때마다 빌드해야 하고, 지금 쓰는 도구는 모두 .ts 를 읽는다.
