# ADR 0002. 화면 코드를 도메인 모듈로 묶고, 모듈 밖에는 index 하나만 보인다

- 상태: 채택
- 날짜: 2026-11-19
- 이후: ADR 0003 — 웹은 `apps/web` 으로 옮겼고, 공용 타입 · 서비스 목록 · 권한 · 위젯 크기 · 사전은 `@dvi/core` 로 갔다가 2026-11-20 web 으로 돌아왔다(core 는 지움).
  아래의 `shared/types` · `shared/widget` · Edge 함수 예외는 그 전 이야기다.

## 맥락

`src/` 가 종류별(components · hooks · lib · queries · api · pages)로 나뉘어 있어, 기능 하나(예: 일정)를
고치려면 폴더 여섯 곳을 오가야 했다. `components/dashboard/` 에는 일정 · 공지 · 점검 · 시스템 · 바로가기 ·
인사 카드가 17개 파일로 섞여 있었고, 거꾸로 가는 가져오기도 생겼다(`ui/Panel` → `lib/widgetLayout`,
`lib/widgetLayout` → `components/widgets/constants`, `hooks/useWidgetLayout` → `components/widgets/registry`).
400줄을 넘는 파일도 넷이었다(WidgetGrid 619 · mocks/widgets 489 · useLiquidNav 442 · widgetLayout 407).

## 결정

### 1. 폴더

```
src/
  app/        진입점(main.tsx · App.tsx) · 전역 스타일(styles.css · styles/)
  features/   기능 단위 모듈(account · schedule · home …) — 이 문서에서 '도메인'
  shared/     도메인을 모르는 공용 계층 — ui · hooks · lib · format · api · types · constants · widget · i18n
  mocks/      pnpm dev:mock 의 목업
  switcher/   다른 서비스에 넣는 스크립트(따로 빌드)
```

- `src` 바로 아래는 위 다섯만 둔다. 흔히 쓰는 app / features / shared 나눔이라 처음 보는 사람도 길을 안다.

### 2. 도메인 모듈

```
features/schedule/
  index.ts        ← 루트에는 이것만. 재export 만 하고 로직은 두지 않는다
  components/     컴포넌트(.tsx)
  hooks/          훅
  lib/            순수 함수 · 도메인 상수(constants.ts) · 옆에 *.test.ts
  api/            서버 통신(<이름>.ts) · 쿼리(queries.ts)
```

- 루트에는 `index.ts` 만 두므로 상수 · 타입도 `lib/`, 서버 통신은 `api/` 아래에 둔다.

- 배럴(`index.ts`)은 도메인 루트에 하나만. 하위 폴더에는 두지 않는다.
- `index.ts` 는 이름을 적어 내보낸다(`export { X } from './components/X'`). `export *` 는 쓰지 않는다 — 공개 범위가 파일에 보이게.
- `shared/` 의 하위 폴더(`shared/ui` 등)는 각자 `index.ts` 를 하나 두는 평평한 묶음이다. 그 안은 하위 폴더 없이 파일만 둔다
  (루트에 index 만 두는 규칙은 도메인에만).

### 3. 의존 방향

```
app · switcher · mocks → features → shared
```

- `shared` 는 도메인을 가져오지 않는다.
- 다른 도메인 · 다른 shared 묶음은 그 `index` 로만 가져온다. 안쪽 파일을 바로 가져오지 않는다.
- 도메인 안에서는 자기 `index` 를 가져오지 않고 상대 경로로 가져온다(순환 방지).
- 도메인끼리 순환 가져오기는 하지 않는다.
- 밖에서는 `@/` 별칭으로 가져온다(`@/features/schedule`, `@/shared/ui`). 안에서는 상대 경로.

### 4. 지켜야 할 함정

- **lazy 로 부르는 파일은 `index` 가 정적으로 내보내지 않는다.** 정적으로 닿는 순간 코드 분할이 깨진다.
  lazy 로 써야 하면 `components/LazyX.ts` 에 `export const LazyX = lazy(() => import('./X').then(…))` 를 두고
  `index` 는 `LazyX` 만 내보낸다(App 의 화면 셋 · 조직도 모달).
- **`package.json` 의 `"sideEffects": ["**/*.css"]` 를 지운다면 배럴을 다시 생각한다.** 이 표시가 있어야 번들러가
  배럴에서 안 쓰는 재export 를 버린다. 없으면 switcher 번들이 10kB → 158kB 로 불어났다.
- **Edge 함수(`api/switcher/access.ts`)는 도메인 안쪽 순수 파일을 바로 가져온다**(`src/features/systems/lib/services`).
  `index` 를 거치면 React 컴포넌트까지 Edge 번들에 끌려온다. lint 대상(`src/`) 밖이라 규칙 예외로 둔다.
- **`node --test` 가 직접 읽는 순수 파일은 확장자(`.ts`)까지 적은 상대 경로로만 가져온다.** Node 는 `@/` 별칭을 모르고
  확장자를 채워 주지 않는다. 다른 모듈은 그 `index.ts` 를 상대 경로로(`../../../shared/widget/index.ts`) — 그래서
  이런 파일이 쓰는 공용 모듈(`shared/widget`)은 `index` 가 `.tsx` 를 끌고 오지 않게 작게 둔다.

### 5. 크기 · 한 가지 일(SRP)

- **파일은 400줄 이하**(빈 줄 · 주석 포함). 테스트 · 목업도 같다.
- 파일 하나에 내보내는 것 하나, 파일 이름 = 내보내는 이름. 그 파일에서만 쓰는 작은 하위 컴포넌트는 같은 파일에 둬도 된다.
- 컴포넌트 파일은 컴포넌트만 내보낸다(훅 · 함수 · 상수는 따로).
- 계산은 `lib/`, 상태 · 이펙트 묶음은 `hooks/`, 서버 통신은 `api` · `queries` 로.

### 6. 상수

쓰는 범위가 놓을 곳을 정한다.

| 쓰는 범위 | 두는 곳 |
| --- | --- |
| 파일 하나 | 그 파일 안(내보내지 않는다) |
| 같은 도메인의 파일 둘 이상 | `features/<도메인>/lib/constants.ts` |
| 도메인 둘 이상 | `shared/constants/<주제>.ts` (예: `breakpoints.ts`) |

- Tailwind 클래스 문자열은 그 컴포넌트 곁에, 주소(URL)는 그 도메인의 `api` 에, 쿼리 값(페이지 크기 등)은 `queries` 에 둔다.
- 한 파일에 모든 상수를 모으지 않는다 — shared 가 도메인 개념을 알게 되고, 누가 무엇을 쓰는지 보이지 않는다.

### 7. 검사

ESLint(`pnpm lint`)가 위 규칙을 막는다. 위반은 에러다.

| 영역 | 규칙 |
| --- | --- |
| 구조 · 방향 | `eslint-plugin-boundaries` v7 — 방향 · index 로만(`dependencies` 의 `internalPath`) · 모르는 파일 금지(`no-unknown-files`). 도메인 루트에 index 외 파일 · 하위 폴더 index 금지는 `eslint.config.js` 의 로컬 규칙 `structure/module-root` |
| 순환 | `import-x/no-cycle` · `no-self-import` · `no-duplicates` |
| 크기 | `max-lines: 400` · `max-lines-per-function` · `complexity` · `max-depth` · `max-params` |
| SRP | `react-refresh/only-export-components` |
| React | `react-hooks` recommended (React Compiler 규칙 포함) |
| TS · 접근성 | `typescript-eslint` strict · stylistic, `jsx-a11y` recommended |

## 도메인 배치

| 도메인 | 내용 |
| --- | --- |
| `shell` | 상단 바 · 사이드바 · 탭바 · 내비 방울 · 사용자 메뉴 · 내비 항목 |
| `theme` | 테마 메뉴 · 테마 설정 · 테마 적용 |
| `home` | 위젯 보드(넓은 화면 · 좁은 화면) · 편집 독 · 갤러리 · 위젯 목록 · 배치 계산 · 홈 화면 |
| `decor` | 배경 그림 · 꾸미기 메뉴 |
| `hero` | 인사 카드 · 전사 공지 작성 |
| `schedule` | 캘린더 · 오늘 일정 |
| `news` | 사내 주요 소식 |
| `maintenance` | 시스템 점검 |
| `systems` | 시스템 패널 · 서비스 카드 · 즐겨찾기 · 시스템 화면 |
| `quick-links` | 바로가기 |
| `info` | 조직도 · 정보 화면 |
| `account` | 로그인 수단 · 계정 화면 |
| `shared` | `ui` 공용 UI(모달 · 패널 · 입력 · 작성/상세 모달 · 검색칸 · 부서 미지정 안내) · `hooks` 공용 훅 · `lib` 달력 · 스프링 · 설정 저장 · 권한 · `format` 날짜/형식(i18n 을 써서 `lib` 와 나눴다) · `api` HTTP · `types` · `constants` 화면 폭 · 캐시 · `widget` 위젯 크기 이름 |

## 결과

- 기능 하나가 폴더 하나에 모인다. 다른 곳에서 무엇을 쓰는지는 그 도메인의 `index.ts` 만 보면 안다.
- 규칙은 사람이 기억하지 않아도 `pnpm lint` 가 잡는다.
- 파일 수는 늘어난다(파일 하나에 내보내는 것 하나). 대신 파일마다 한 가지 일만 한다.
- `typescript@7` 은 기존 컴파일러 API 가 없어 `typescript-eslint` 에는 `.pnpmfile.cjs` 로 TS 5.9 를 물린다(빌드 · `tsc` 는 7 그대로).
  `eslint-plugin-jsx-a11y` 가 ESLint 9 까지만 받아 ESLint 는 9 로 둔다.
- 이 결정을 처음 들인 때 `pnpm lint` 에는 구조와 무관한 TS strict · 복잡도 · 접근성 지적이 남아 있다. 차례로 줄인다.

## 검토한 다른 길

- **휴대폰 / PC 로 나누기** — 화면 기준이 셋(640px · 64rem · 1880px)이라 둘로 나뉘지 않고, 같은 컴포넌트의 규칙이 두 곳으로 흩어진다.
- **components 만 도메인으로** — 훅 · 계산 · 쿼리가 밖에 남아 응집이 반쪽이 된다.
- **상수를 `shared/constants.ts` 한 곳에** — 6번의 이유로 버렸다.
- **도메인 폴더를 `src` 바로 아래에** — 한때 이렇게 했더니 `src` 에 폴더가 스물 가까이 늘어서 공용 계층(shared · i18n · mocks)과
  기능이 섞여 보였다. `features/` 로 묶고 i18n 은 `shared/i18n`, 진입점 · 전역 스타일은 `app/` 으로 옮겼다.
- **하위 폴더마다 index** — 배럴이 겹겹이 생겨 순환이 쉬워지고 어디가 공개 범위인지 흐려진다.
