import { useEffect, useMemo, useState } from 'react'
import { services, type AuthMode, type Category, type Service } from './services'

const CATEGORIES: ('전체' | Category)[] = ['전체', '업무','인사', '정보', '사내문화']

const AUTH_LABEL: Record<AuthMode, string> = {
  sso: '회사 계정',
  separate: '개별 로그인',
  none: '로그인 없음',
}

/** 비밀번호·OTP·패스키(지문) 관리 화면. 주소를 외우게 하지 않고 여기서 닿게
 *  한다 — 직원에게 알려주는 주소는 허브 하나라는 원칙(employee-rollout.md).
 *  로그인 도메인과 같아서 SSO 쿠키로 다시 로그인 없이 열린다.
 *
 *  루트(/account/)가 아니라 로그인 수단 화면으로 바로 보낸다. 계정 콘솔이
 *  이 화면 하나로 줄어 있어(DVI-auth 테마 content.json) 루트는 비어 있다.
 *
 *  referrer 파라미터는 콘솔 상단에 "돌아가기" 링크를 만든다(Keycloak 내장).
 *  referrer_uri 는 service-hub client 의 redirect 목록으로 검증된다. */
const ACCOUNT_URL =
  'https://api.dvi-ind.com/dauth/realms/dvi/account/account-security/signing-in' +
  '?referrer=service-hub&referrer_uri=' +
  encodeURIComponent('https://dvi-service-hub.vercel.app/')

/** /api/auth/me 응답. 미들웨어가 로그인 안 된 접근을 이미 막지만,
 *  화면이 열린 채 세션이 만료될 수 있어 401 이면 다시 로그인으로 보낸다. */
interface Me {
  signedIn: boolean
  name: string
  email: string
  realm: string[]
  svc: Record<string, string[]>
}

function canSee(s: Service, me: Me): boolean {
  switch (s.access.type) {
    case 'public':
    case 'any':
      return true
    case 'employee':
      return me.realm.includes('employee')
    case 'client':
      return (me.svc[s.access.client] ?? []).includes(s.access.role)
  }
}

function matches(s: Service, q: string) {
  const text = `${s.name} ${s.description} ${s.category}`.toLowerCase()
  return text.includes(q.trim().toLowerCase())
}

export default function App() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('전체')
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => {
        if (r.status === 401) {
          window.location.href = '/api/auth/login?next=' + encodeURIComponent(location.pathname)
          return null
        }
        return r.json()
      })
      .then((data) => data && setMe(data))
      .catch(() => setMe(null))
  }, [])

  const noDept = me !== null && !me.realm.includes('employee')

  const visible = useMemo(
    () =>
      services.filter(
        (s) =>
          (me === null || canSee(s, me)) &&
          (category === '전체' || s.category === category) &&
          matches(s, query),
      ),
    [query, category, me],
  )

  return (
    <div className="page">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <img src="/favicon.svg" alt="" width={32} height={32} />
            <span className="brand-name">
              <b>DVI</b> Portal
            </span>
          </div>
          {me && (
            <div className="account">
              <span className="account-name">{me.name}</span>
              {/* 같은 탭에서 열어 뒤로 가기로 허브에 돌아오게 하고,
                  referrer 파라미터로 콘솔 안에도 돌아가기 링크를 만든다.
                  글자 대신 톱니 아이콘 — 이름 옆이라 뜻이 통하고, 글자를
                  못 보는 환경을 위해 aria-label 과 title 을 남긴다. */}
              <a
                className="account-link"
                href={ACCOUNT_URL}
                title="계정 설정"
                aria-label="계정 설정"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </a>
              {/* SSO 세션까지 끊는다 — 다른 사내 서비스도 함께 로그아웃된다.
                  표기는 짧게 "로그아웃" (2026-09-29). */}
              <a className="logout" href="/api/auth/logout">로그아웃</a>
            </div>
          )}
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <h1>사내 서비스를 한곳에서</h1>
          <p>DVISION에서 운영 중인 서비스 {services.length}개</p>
          <input
            className="search"
            type="search"
            placeholder="서비스 이름이나 기능으로 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </section>

        {noDept && (
          <p className="notice">
            아직 부서가 지정되지 않아 일부 서비스가 보이지 않습니다. 관리팀에 문의해주세요.
          </p>
        )}

        <nav className="chips" aria-label="카테고리">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={c === category ? 'chip active' : 'chip'}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </nav>

        {visible.length === 0 ? (
          <p className="empty">검색 결과가 없습니다.</p>
        ) : (
          <ul className="grid">
            {visible.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

function ServiceCard({ service: s }: { service: Service }) {
  const primary = s.links[0]
  return (
    <li className="card">
      <a className="card-main" href={primary.url} target="_blank" rel="noreferrer">
        {s.logo ? (
          <img className="logo" src={s.logo} alt="" width={44} height={44} />
        ) : (
          <span className="emoji" aria-hidden>
            {s.emoji}
          </span>
        )}
        <div>
          <div className="card-title">
            <h2>{s.name}</h2>
            <span className="tag">{s.category}</span>
          </div>
          <p>{s.description}</p>
          <span className="host">{new URL(primary.url).host}</span>
        </div>
      </a>
      <div className="card-foot">
        <span className={`auth auth-${s.auth}`}>{AUTH_LABEL[s.auth]}</span>
        {s.links.length > 1 && (
          <div className="links">
            {s.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
                {l.label} ↗
              </a>
            ))}
          </div>
        )}
      </div>
    </li>
  )
}
