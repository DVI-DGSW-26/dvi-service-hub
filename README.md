# DVI 서비스 허브

DVISION 사내 서비스를 한곳에서 찾고 이동하는 포털.

## 실행

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # dist/ 생성
```

로그인까지 포함해 로컬에서 돌리려면 `/api` 함수가 필요하므로 Vercel CLI를 쓴다.

```bash
cp .env.example .env.local   # 값 채우기
npx vercel dev               # http://localhost:3000 (로그인 서비스에 등록된 개발용 콜백 주소)
```

## 로그인

디비전 로그인 서비스(OAuth 2.0 / OIDC)로 로그인한다. `api/auth/*`가 서버 측에서 처리하고,
세션은 서명된 httpOnly 쿠키(`hub_session`, 8시간)에 보관한다.

| 경로 | 역할 |
|---|---|
| `/api/auth/login` | 로그인 서비스로 이동 (state + PKCE) |
| `/api/auth/callback` | 코드 → 토큰 교환, 세션 쿠키 발급 |
| `/api/auth/me` | 현재 사용자 (`401`이면 비로그인) |
| `/api/auth/logout` | 세션 삭제 후 로그인 서비스 로그아웃 |

필요한 환경변수는 `.env.example` 참고. Vercel에는 같은 이름으로 Project → Settings → Environment Variables에 넣는다.
`AUTH_CLIENT_SECRET`, `SESSION_SECRET`은 절대 커밋하지 않는다.

## 서비스 추가·수정

`src/services.ts`의 `services` 배열만 고치면 된다.

- `links`: 첫 번째 링크가 카드 클릭 시 이동 대상. 링크가 2개 이상이면 카드 하단에 모두 표시.
- `auth`: `separate`(개별 로그인) → SSO 전환 완료 시 `sso`로 변경.

## 로드맵

1. 포털 (현재)
2. 허브에 회사 계정 로그인 (IdP 연동)
3. 각 서비스를 같은 IdP로 전환 → SSO
