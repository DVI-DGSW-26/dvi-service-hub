/** 비밀번호·OTP·패스키(지문) 관리 화면. 주소를 외우게 하지 않고 여기서 닿게
 *  한다 — 직원에게 알려주는 주소는 허브 하나라는 원칙(employee-rollout.md).
 *  로그인 도메인과 같아서 SSO 쿠키로 다시 로그인 없이 열린다.
 *
 *  루트(/account/)가 아니라 로그인 수단 화면으로 바로 보낸다. 계정 콘솔이
 *  이 화면 하나로 줄어 있어(DVI-auth 테마 content.json) 루트는 비어 있다.
 *
 *  referrer 파라미터는 콘솔 상단에 "돌아가기" 링크를 만든다(Keycloak 내장).
 *  referrer_uri 는 service-hub client 의 redirect 목록으로 검증된다. */
export const ACCOUNT_URL =
  'https://api.dvi-ind.com/dauth/realms/dvi/account/account-security/signing-in' +
  '?referrer=service-hub&referrer_uri=' +
  encodeURIComponent('https://dvi-service-hub.vercel.app/')
