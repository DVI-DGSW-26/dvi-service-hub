# DVI 서비스 허브

DVISION 사내 서비스를 한곳에서 찾고 이동하는 포털.

## 실행

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # dist/ 생성
```

## 서비스 추가·수정

`src/services.ts`의 `services` 배열만 고치면 된다.

- `links`: 첫 번째 링크가 카드 클릭 시 이동 대상. 링크가 2개 이상이면 카드 하단에 모두 표시.
- `auth`: `separate`(개별 로그인) → SSO 전환 완료 시 `sso`로 변경.

## 로드맵

1. 포털 (현재)
2. 허브에 회사 계정 로그인 (IdP 연동)
3. 각 서비스를 같은 IdP로 전환 → SSO
