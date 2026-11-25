# ADR 0007. 휴대폰 앱은 배포된 허브를 띄우는 Capacitor 껍데기로 — apps/mobile

- 상태: 채택 (Android 만, iOS 는 나중에)
- 날짜: 2026-11-20
- 관련: ADR 0006(Expo — 이 결정으로 대체), ADR 0003(모노레포)

## 맥락

앱으로 깔리기만 하면 된다(PWA 는 아님). RN 으로 화면을 다시 만들면 웹과 앱 두 벌을 맞춰야 하고, ADR 0006 은 앱이 웹과 다른 UI 가
되어 지웠다. 웹은 이미 좁은 화면 레이아웃 · safe-area 를 갖췄다.

## 결정

- **Capacitor 8** 로 `apps/mobile` 을 만들고, `server.url` 로 **배포된 허브(`https://service-hub.dvi-ind.com`)를 그대로 띄운다**.
  웹 빌드를 앱에 넣지 않는다 — 로그인 쿠키 · `/api/auth` Edge 함수 · `/api/hub` rewrite 가 Vercel 주소에서만 돈다.
  `www/` 는 Capacitor 가 요구하는 자리일 뿐이다.
- 로그인은 웹과 같다. 통합 로그인 주소(`api.dvi-ind.com` · Google 로그인 `accounts.google.com`)를 `allowNavigation` 에 넣어 앱 안에서 끝내고, 나머지 주소(다른 서비스 링크)는
  시스템 브라우저로 열린다. 백엔드 · 앱용 토큰이 필요 없다.
- 앱은 첫 화면으로 통합 로그인 화면을 보여 준다. 통합 로그인 테마(`dvi-last-method.v2.js`)는 지난번에 Google 로 들어온 사람이면 Google 버튼을
  대신 누르는데, `MainActivity` 가 `api.dvi-ind.com` 문서 시작 때 그 스크립트의 "1분 안에 이미 눌렀다" 표시(`sessionStorage dvi-auto-google`)를
  남겨 건너뛰게 한다. 세션이 있으면 지금처럼 허브로 바로 간다. 서버가 앱을 알아보고 건너뛰게 바꾸면 이 코드를 지운다.
- 상태 표시줄 · 아래 내비 바: 앱은 화면을 바 뒤까지 채우고(웹 `viewport-fit=cover`), 바 바탕에는 웹 배경이 비친다. 아이콘 색은 휴대폰 설정을
  따르므로 웹 `usePortalTheme` 이 테마가 바뀔 때마다 Capacitor 8 코어 `SystemBars.setStyle` 을 부른다. 웹에 `@capacitor/core` 를 넣지 않고
  앱이 페이지에 넣어 주는 `window.Capacitor.nativePromise` 로 부른다(웹 브라우저에서는 없어서 그냥 지나간다).
  WebView 140 아래에서는 Capacitor 가 바 뒤로 그리지 않고 창에 여백을 줘서 바 바탕이 창 색(휴대폰 설정)이 된다 — 그래서 웹이 앱의
  `HubTheme` 플러그인(`setBackground`)도 불러 창 색을 테마 색으로 칠한다. `SystemBars.setStyle` 이 부를 때마다(화면 설정이 바뀔 때도)
  창 색을 기본값으로 되돌리므로, 웹은 아이콘 색을 먼저 바꾸고 바탕을 칠하며, 플러그인은 화면 설정이 바뀌면 마지막 색을 다시 칠한다.
  2026-11-25 에뮬레이터(WebView 133)에서 새로고침 · 앱 다시 열기 · 휴대폰 다크 모드 바꾸기 모두 확인했다.
- 네이티브 코드는 `MainActivity` 가 WebView 설정을 하나씩 부르기만 하고, 설정마다 자기 파일에 둔다(`Passkeys` · `SkipAutoGoogle` · `HubThemePlugin`).
- Android 뒤로 가기는 `@capacitor/app` 기본 동작(웹 기록 뒤로, 처음이면 앱 닫기) — 웹 코드는 손대지 않는다.
- Gradle 래퍼는 9.1 — Capacitor 템플릿의 8.14 는 JDK 25(지금 Android Studio 의 JBR)에서 돌지 않는다.

## 결과

- 웹을 배포하면 앱도 바로 바뀐다. 앱을 다시 내보내는 건 껍데기(설정 · 아이콘 · 플러그인)를 바꿀 때뿐이다.
- 앱 의존성을 바꾸면 `pnpm-lock.yaml` 이 바뀌어 Vercel `ignoreCommand` 가 웹도 다시 배포한다(해는 없다).
- 2026-11-20 확인: Keycloak 에 `https://dvi-service-hub.vercel.app/api/auth/callback` 을 등록한 뒤 앱 안에서 로그인 화면이 뜬다.
- Google 로 로그인: `accounts.google.com` 이 allowNavigation 밖이면 Chrome 으로 열려 쿠키가 앱에 안 돌아온다 — 그래서 넣었다.
  넣으면 Google 로그인 화면이 앱 안에서 뜬다. 끝까지 되는지(Google 이 WebView 를 막는 `disallowed_useragent`)는 실제 계정으로 아직 안 해 봤다.
- 2차 인증 WebAuthn(패스키 · 보안 키): WebView 는 기본으로 꺼져 있어 `WebAuthn is not supported by this browser` 가 떴다.
  `MainActivity` 에서 켰다(`WEB_AUTHENTICATION_SUPPORT_FOR_APP`). 앱이 패스키를 꺼내려면 서버가 `https://api.dvi-ind.com/.well-known/assetlinks.json`
  (지금 401)에 패키지 `com.dviind.servicehub` 와 서명 SHA-256 을 `delegate_permission/common.get_login_creds` 로 올려야 한다 — 요청 전.
  디버그 서명은 PC 마다 다르고, 배포 서명이 생기면 그 값도 넣는다. 그 전에는 2차 인증 화면의 "Try Another Way"(OTP 등)로 들어간다.

## 아직 안 한 것

- iOS(Mac · Xcode 필요, 사내 배포는 Apple Business Manager Custom App), 앱 아이콘 · 스플래시, 서명 · 배포 트랙.
- 앱 id 는 `com.dviind.servicehub`(회사 도메인을 뒤집은 것, Android 는 `-` 를 못 쓴다). 스토어에 올린 뒤에는 못 바꾼다.
