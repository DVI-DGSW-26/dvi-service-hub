# @dvi/mobile

DVI 포털 휴대폰 앱 — Expo SDK 58(React Native 0.88) · Expo Router. 결정과 트레이드오프는 `docs/adr/0006-mobile-expo.md`.

```bash
pnpm --filter @dvi/mobile start      # Metro — SDK 58 용 Expo Go 가 스토어에 나오기 전에는 개발 빌드로 연다
pnpm --filter @dvi/mobile android    # 안드로이드 에뮬레이터 · 기기
pnpm --filter @dvi/mobile typecheck
pnpm --filter @dvi/mobile lint       # expo lint (eslint-config-expo)
pnpm --filter @dvi/mobile test       # node --test — src/lib 의 값만 다루는 코드
```

```
src/app/            라우트(Expo Router) — _layout(뿌리) · (tabs)/ 홈 · 업무시스템 · 사내정보 · 설정
src/components/     화면 조각 — 위젯 판 · 위젯 · 로그아웃 시트 · 화면 틀
src/lib/            React 없는 값 — 사전(i18n) · 위젯 정의
src/constants/      색
```

웹과 같이 쓰는 것(타입 · 서비스 목록 · 사전 · 위젯 크기와 배치)은 `@dvi/core` 에서 가져온다. 네이티브 라이브러리는
`pnpm exec expo install <패키지>` 로 넣는다(SDK 에 맞는 버전).
