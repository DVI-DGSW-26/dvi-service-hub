import type { CapacitorConfig } from '@capacitor/cli'

// 앱은 배포된 허브를 그대로 띄우는 껍데기다 — 로그인 쿠키 · /api/auth · /api/hub 가 Vercel 주소에서만 돌아서
// 웹 빌드를 앱에 넣지 않는다. 웹을 배포하면 앱도 바로 바뀐다.
const config: CapacitorConfig = {
  appId: 'com.dviind.servicehub',
  appName: 'DVI 서비스 허브',
  webDir: 'www',
  server: {
    url: 'https://service-hub.dvi-ind.com',
    // 통합 로그인(Keycloak) · 그 안의 Google 로그인은 앱 안에서 — 여기 없는 주소(다른 서비스 링크)는 시스템 브라우저로 열린다
    allowNavigation: ['api.dvi-ind.com', 'accounts.google.com'],
  },
  plugins: {
    // 허브가 첫 화면을 그리면 웹(useAppStart)이 내린다 — 그 전에 빈 WebView 가 보이지 않게.
    // 웹이 못 부르는 경우(통합 로그인 화면 · 연결 실패)를 위해 이만큼(ms) 지나면 저절로 내린다
    SplashScreen: { launchAutoHide: true, launchShowDuration: 2000 },
  },
}

export default config
