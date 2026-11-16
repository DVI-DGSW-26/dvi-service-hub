# 설정 화면 API 요청 (백엔드 전달용)

- 초안 · 2026-11-16 · 요청: service-hub(화면) → service-hub-server
- 배경: [ADR 0001](adr/0001-unbacked-features-coming-soon.md) — 설정 화면의 로그인 수단 · 로그인한 기기 · 부서는
  API 가 없어 지금 '준비 중' 으로 나간다. 아래 API 가 생기면 화면을 붙인다.
- 표시: **[정해 주세요]** 는 서버 쪽 판단이 필요한 곳.

## 0. 먼저 풀려야 하는 것 — 로그인 쿠키 검증

지금 운영에서 `/api/hub/*` 의 로그인이 필요한 API 가 모두 `401 UNAUTHORIZED` 다 (공지 · 점검 · 일정 · 캘린더 · 소식,
기존 `/me` · `/flow/posts` 포함). 허브 로그인(`/api/auth/me`)은 정상이고 로그인이 필요 없는 `/services` 는 200 이라,
**서버의 `SESSION_SECRET` 이 Vercel(Production) 의 값과 다른 것**으로 본다.

- `SESSION_SECRET` 은 `hub_session` 쿠키에 서명하는 열쇠다. `OIDC_CLIENT_SECRET`(Keycloak 클라이언트 비밀번호)과 다른 값이다.
- Vercel 과 서버에 **같은 값**을 넣는다. 새로 만들면 `openssl rand -base64 48` → 양쪽에 넣고 Vercel 재배포 · 서버 재시작.
- 쿠키 형식: `base64url(JSON) + "." + base64url(HMAC-SHA256(SESSION_SECRET, 앞부분))`, 만료는 JSON 의 `exp`(초). (`lib/session.ts`)

아래 API 는 모두 이 쿠키로 사람을 확인한다.

## 1. 공통 규칙

명세 v0.5 의 1장과 같다.

- 화면은 `/api/hub/...` 로 부르고 Vercel 이 `/api/hub` 를 떼고 넘긴다.
- 성공은 `{ status, message, data }` 로 감싼다. 아래 "응답"은 `data` 안의 모양이다.
- 오류는 `{ code, status, message, field? }`.
- 날짜 `YYYY-MM-DD`, 시각 `HH:mm`, 한국 시간. 합친 문자열이나 화면 문구("오늘 오전 8:42", "2시간 전")는 주지 않는다.
- 값이 없으면 칸을 뺀다(`null` 대신). 모르는 칸은 화면이 무시한다.

### 권한

| API | 조건 | 아니면 |
| --- | --- | --- |
| 아래 전부 | 허브 로그인 쿠키(`hub_session`) | 401 `UNAUTHORIZED` |
| 아래 전부 | **본인 것만** — 쿠키의 `sub` 로 사람을 정한다. 다른 사람의 id 를 받지 않는다 | — |

`employee` 가 아니어도 된다. 부서 미지정 신규 입사자도 자기 설정은 봐야 한다 (공지 · 점검 조회와 다르다).

### Keycloak 에서 가져오는 방법

세 API 모두 원본은 Keycloak(`https://api.dvi-ind.com/dauth`, realm `dvi`)이다. 허브 쿠키에는 Keycloak
access token 이 없으므로, 서버가 **서비스 계정(client credentials)으로 Admin REST API** 를 부르는 것을 제안한다.

- 필요한 권한: `realm-management` 의 `view-users` **[정해 주세요: 서비스 계정을 새로 만들지, 기존 것을 쓸지]**
- 사람 찾기: 쿠키의 `sub` = Keycloak user id

## 2. 내 정보 (부서)

### 2.1 `GET /account/profile`

```json
{ "department": "연구개발팀" }
```

| 칸 | 항상 | 설명 |
| --- | --- | --- |
| `department` | - | 부서 이름. 배정되지 않았으면 칸이 빠진다 |

- 화면: 설정 › 내 정보의 "부서" 칸과 이름 아래 배지, 오른쪽 위 사용자 메뉴(이메일 대신 부서).
- 이름 · 이메일은 이미 로그인 쿠키에 있어 받지 않는다.
- 원본: Keycloak 사용자 속성 또는 그룹 **[정해 주세요: 부서가 어디에 들어 있는지]**.

**다른 길 (서버 API 없이):** Keycloak `service-hub` 클라이언트에 부서를 토큰에 넣는 mapper 를 추가하면, 화면 쪽
로그인 처리(`api/auth/callback.ts`)가 세션에 담아 `/api/auth/me` 로 내려줄 수 있다. 이 경우 2.1 은 필요 없다.
둘 중 쉬운 쪽으로 정해 주면 된다. 다만 토큰에 넣으면 부서가 바뀌어도 다시 로그인해야 반영된다.

## 3. 로그인 수단

### 3.1 `GET /account/credentials`

```json
{
  "password": { "changed": "2026-08-21" },
  "otp": { "registered": true, "label": "Google Authenticator", "added": "2026-03-04" },
  "passkeys": [
    { "id": "c0f1…", "name": "업무용 노트북 (Windows Hello)", "added": "2026-03-04", "lastUsedDate": "2026-11-16", "lastUsedTime": "08:42" }
  ]
}
```

| 칸 | 항상 | 설명 |
| --- | --- | --- |
| `password` | - | 비밀번호가 없는 계정(외부 로그인만)이면 칸이 빠진다 |
| `password.changed` | O | 마지막으로 바꾼 날. Keycloak credential `type=password` 의 `createdDate` |
| `otp.registered` | O | OTP(`type=otp`) 가 하나라도 있으면 true |
| `otp.label` | - | 등록할 때 붙인 이름(`userLabel`). 없으면 칸이 빠진다 |
| `otp.added` | - | 등록한 날(`createdDate`). 여러 개면 가장 최근 것 |
| `passkeys` | O | 패스키(`type=webauthn-passwordless`) 목록. 없으면 빈 배열. 등록일 내림차순 |
| `passkeys[].id` | O | credential id |
| `passkeys[].name` | O | `userLabel`. 없으면 빈 문자열 |
| `passkeys[].added` | O | 등록한 날 |
| `passkeys[].lastUsedDate` · `lastUsedTime` | - | 마지막 사용. Keycloak 이 기록하지 않으면 칸이 빠진다 **[정해 주세요: 알 수 있는지]** |

- 화면: 설정 › 로그인 수단. "3가지 중 몇 가지를 쓰는지", 비밀번호를 180일 넘게 안 바꿨으면 경고.
- 바꾸기 · 등록 · 삭제는 지금처럼 Keycloak 계정 화면으로 보낸다. **쓰기 API 는 필요 없다.**
- 2단계 인증용 `type=webauthn`(패스키가 아닌 보안키)도 쓰는지 **[정해 주세요]** — 쓰면 `passkeys` 에 함께 넣을지 따로 둘지.

## 4. 로그인한 기기

### 4.1 `GET /account/sessions`

```json
[
  { "id": "5b1e…", "device": "desktop", "os": "Windows", "browser": "Chrome", "ip": "10.0.12.34", "internal": true,
    "lastDate": "2026-11-16", "lastTime": "15:20", "current": true },
  { "id": "a93c…", "device": "mobile", "os": "iOS", "browser": "Safari", "ip": "211.234.1.2", "internal": false,
    "lastDate": "2026-11-16", "lastTime": "13:05", "current": false }
]
```

| 칸 | 항상 | 설명 |
| --- | --- | --- |
| `id` | O | Keycloak 세션 id |
| `device` | O | `desktop` · `mobile`. 모르면 `desktop` |
| `os` · `browser` | - | 모르면 칸이 빠진다 |
| `ip` | O | 마지막 접속 IP |
| `internal` | O | 사내망 IP 이면 true **[정해 주세요: 사내망 대역]** |
| `lastDate` · `lastTime` | O | 마지막 활동(`lastAccess`) |
| `current` | O | 지금 이 브라우저의 세션인지 (아래 참고) |

정렬: `current` 가 먼저, 그다음 마지막 활동 최신순.

- 화면: 설정 › 로그인한 기기 목록과 "이 기기" 배지.
- Admin API `GET /admin/realms/dvi/users/{id}/sessions` 는 IP · 시작 · 마지막 활동은 주지만 **기기 · 브라우저는 주지 않는다.**
  `os` · `browser` · `device` 를 어떻게 얻을지 **[정해 주세요]** — 예: Keycloak 의 계정 API(`/account/sessions/devices`)는
  기기 정보를 주지만 사용자 본인 토큰이 필요하다. 못 구하면 그 칸들은 빼고 IP · 시각만 줘도 화면은 그린다.
- **`current` 를 알려면 화면 쪽 작업도 필요하다.** 지금 `hub_session` 에는 Keycloak 세션 id 가 없다. 로그인 처리
  (`api/auth/callback.ts`)가 id_token 의 `sid` 를 세션에 함께 담도록 바꾸겠다 → 서버는 쿠키의 `sid` 와 세션 `id` 를 비교한다.
  쿠키 JSON 에 `sid` 칸이 하나 늘어난다(서명 방식은 같다).

### 4.2 (나중) `DELETE /account/sessions/{id}` — 다른 기기 로그아웃

지금 화면에는 버튼이 없다. 모르는 기기를 직원이 직접 끊게 하려면 필요하다. 1차에는 빼도 된다.

- 본인 세션만. 아니면 404 `SESSION_NOT_FOUND`. 이미 끊긴 세션도 404.
- 지금 이 세션(`current`)을 끊으면 400 **[정해 주세요]** — 그건 "로그아웃" 버튼이 한다.

## 5. 우선순위 제안

| 순서 | API | 이유 |
| --- | --- | --- |
| 0 | `SESSION_SECRET` 맞추기 | 이게 안 되면 아무것도 안 나온다 |
| 1 | 부서 (2.1 또는 mapper) | 칸 하나, 가장 쉽다. 사용자 메뉴에도 쓰인다 |
| 2 | 로그인 수단 (3.1) | Admin API 한 번으로 끝난다 |
| 3 | 로그인한 기기 (4.1) | 기기 정보 · `current` 처리에 정할 것이 많다 |
| 4 | 다른 기기 로그아웃 (4.2) | 화면에 버튼부터 새로 만들어야 한다 |

## 변경 이력

| 날짜 | 내용 |
| --- | --- |
| 2026-11-16 | 처음 씀 |
