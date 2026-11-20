# ADR 0006. 휴대폰 앱은 apps/mobile 의 Expo(SDK 58) · Expo Router 로 만든다

- 상태: 보류 — 2026-11-20 앱을 지웠다. 웹 화면을 그대로 옮기지 않고 새 UI 로 만들어서다. 웹을 다시 맞춘 뒤 새로 만든다(로그인 시도는 `wip/mobile-login` 브랜치)
- 날짜: 2026-11-19
- 관련: ADR 0003(모노레포), ADR 0005(웹 좁은 화면 UX)

## 맥락

ADR 0003 에서 모노레포를 만들며 앱 자리(`apps/mobile`)를 남겨 뒀다. 웹 좁은 화면에서 한 일(본문 밀어 탭 넘기기 · 로그아웃 확인
시트 · 다양한 위젯 크기)을 앱에서도 같은 규칙으로 하고, 문구 · 서비스 목록 · 위젯 크기는 `@dvi/core` 하나로 맞춘다.

## 결정

- **Expo SDK 58**(React Native 0.88 · React 19.3.0)을 `create-expo-app --template default@sdk-58` 로 만들었다.
  SDK 58 전환기에는 템플릿을 고르지 않으면 57 이 나온다. SDK 58 용 Expo Go 가 스토어에 나오기 전까지는 개발 빌드로 연다.
- **Expo 권장 구조**: `src/app` 은 라우트만, 나머지는 `src/components` · `src/lib` · `src/constants`. CNG(ios · android 폴더를 만들지 않음).
- **pnpm 격리 설치 그대로**(`nodeLinker: hoisted` 없이). SDK 54+ 가 격리 설치를 받고, `expo export -p android` 로 Metro 가
  `@dvi/core`(소스 .ts · 하위 경로 exports)를 묶는 것까지 확인했다. `expo-doctor` 20/20.
- 앱만 React 를 `19.3.0` 으로 고정한다(RN 0.88 렌더러와 정확히 맞아야 한다). 웹은 `^19.3.1` — core 는 React 를 쓰지 않아 두 벌이 섞이지 않는다.
- TypeScript 는 Expo 템플릿의 `~6.0`(웹 · core 는 7 네이티브). `expo/tsconfig.base` 와 Expo 도구가 맞춰 둔 버전을 따른다.
- 린트는 `expo lint`(eslint-config-expo flat) + 400줄 한도. 웹의 엄격한 typed 규칙은 아직 붙이지 않았다.

### 탭 — 화면을 밀어 넘기기

`@react-navigation/material-top-tabs`(react-native-tab-view · react-native-pager-view)를 `withLayoutContext` 로 Expo Router 에 붙이고
탭 바를 아래에 둔다(`tabBarPosition="bottom"`).

- 얻는 것: 네이티브 ViewPager 로 손을 따라 넘어가는 밀기, 탭 바 표시줄이 같이 움직인다. 웹 `useSwipeTabs` 와 같은 동작.
- 잃는 것: 네이티브 탭(`expo-router/unstable-native-tabs`)의 플랫폼 탭 바 모양(iOS 리퀴드 글래스 · 시스템 아이콘)과 접근성 기본값.
  탭 바는 JS 로 그린다. 아이콘은 아직 없다(글자만).
- 다른 길: 네이티브 탭 + 화면마다 PanGesture 로 탭 바꾸기 — 손을 따라 움직이는 표시가 없고 화면마다 제스처를 달아야 한다.

### 로그아웃 확인 — 바텀시트

RN 기본 `Modal`(`animationType="slide"`, 투명 배경)로 만든다. 웹 LogoutConfirm 과 같은 문구(`account.logout.confirm`).

- 의존성이 없고 어두운 막 · 안드로이드 뒤로 가기 닫기가 기본으로 된다.
- 잃는 것: 끌어 내려 닫기 · 높이 단계. `@gorhom/bottom-sheet`(Reanimated · Gesture Handler 위)나 `@expo/ui` 의 네이티브
  BottomSheet(SwiftUI · Compose 따로 import)는 시트가 더 늘어나면 다시 본다. 확인 시트 하나에는 과하다.

### 위젯

웹 좁은 화면과 같은 4칸 정사각 격자. RN 에는 CSS grid 가 없어 `@dvi/core/widget` 에 `placeStack`(CSS grid 자동 배치와 같은 규칙)을
두고 웹 · 앱이 같은 크기 이름(`STACK_SIZES` · `STACK_CELLS` · `lookOf`)을 쓴다. 앱은 위젯을 길게 누르면 그 위젯의 다음 크기로 바뀐다
(1×1 · 2×1 · 2×2 · 4×1 · 4×2 · 2×4 · 4×3).

## 아직 안 한 것(다음 결정 거리)

- **로그인**: 웹은 Vercel 함수가 쿠키 세션으로 OIDC 를 한다. 앱은 PKCE(expo-auth-session) + 토큰 저장(expo-secure-store)이 필요하고,
  허브 API 가 Bearer 토큰을 받아야 한다. 그 전까지 업무시스템은 권한으로 거르지 않고, 로그아웃은 홈으로만 보낸다(코드의 `shortcut:` 주석).
- 위젯 배치 저장 · 데이터 위젯(일정 · 점검 · 소식)은 API 인증 뒤에 `@dvi/core` 로 쿼리를 옮기며 한다(ADR 0003 의 미룬 일).
- EAS 설정(`eas.json`) · 앱 아이콘 · 번들 id(`com.dviind.portal`, 임시)는 배포 전에 정한다.

참고: [Expo 모노레포 가이드](https://docs.expo.dev/guides/monorepos/), [SDK 58 업그레이드](https://expo.dev/blog/how-to-upgrade-to-sdk-58),
[Expo Router 탭](https://docs.expo.dev/router/advanced/tabs.md)
