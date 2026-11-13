# DVI 서비스 허브

DVISION 사내 서비스를 한곳에서 찾고 이동하는 포털.

## 실행

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # dist/ 생성
```

`npm run dev` 는 `/api/hub` 를 로컬 허브 서버(`http://localhost:8086`)로 넘긴다. 서버를 띄우지 않아도
화면은 열린다 — 내장된 예비 목록으로 그리고, 즐겨찾기는 브라우저에만 저장된다.
서버까지 같이 보려면 `service-hub-server` 저장소의 README 를 따른다.

## 서비스 추가·수정

**허브 화면의 "서비스 관리"에서 한다.** 코드를 고치거나 배포할 필요가 없다. 고치면 허브 화면과
각 서비스의 "서비스 이동" 메뉴에 바로 반영된다. 버튼은 관리 권한(`service-hub` 의 `admin` 롤)이
있는 사람에게만 보인다.

- 주소: 첫 번째가 카드를 눌렀을 때 가는 곳. 둘 이상이면 카드 아래에 모두 나온다.
- 로그인 방식: `개별 로그인` → SSO 전환이 끝나면 `회사 계정` 으로 바꾼다.
- 로고: 이 저장소 `public/logos` 에 파일을 넣고 `/logos/이름.png` 로 적는다 (로고 파일만은 커밋이 필요하다).

목록의 원본은 허브 서버(`service-hub-server`)의 DB 다. `src/services.ts` 의 `bundledServices` 는
서버가 응답하지 않을 때만 쓰는 예비본이다.

## 서버와 나눠 맡는 일

| | 어디서 |
|---|---|
| 로그인 · 로그아웃 (`/api/auth/*`) | 이 저장소의 Vercel 함수 |
| 서비스 이동 버튼이 묻는 역할 (`/api/switcher/access`) | 이 저장소의 Vercel 함수 |
| 서비스 목록 · 즐겨찾기 · 최근 사용 (`/api/hub/*`, `/api/switcher/services`) | 허브 서버. `vercel.json` 의 rewrites 가 넘긴다 |

서버는 이 저장소가 심은 로그인 쿠키(`hub_session`)를 같은 `SESSION_SECRET` 으로 검증한다.
**`SESSION_SECRET` 이나 `lib/session.js` 의 쿠키 형식을 바꾸면 서버도 같이 바꿔야 한다.**

서버 주소(`https://api.dvi-ind.com/hub`)는 `vercel.json` 과 `api/switcher/access.ts` 두 곳에 적혀 있다.

## 로드맵

1. 포털
2. 허브에 회사 계정 로그인 (IdP 연동)
3. 각 서비스를 같은 IdP로 전환 → SSO
4. 서비스 목록 · 즐겨찾기를 서버로 (현재)
