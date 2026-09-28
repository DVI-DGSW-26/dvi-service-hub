import { useEffect, useMemo, useState } from 'react'
import { services, type AuthMode, type Category, type Service } from './services'

const CATEGORIES: ('전체' | Category)[] = ['전체', '회사', '업무','인사', '정보', '사내문화']

const AUTH_LABEL: Record<AuthMode, string> = {
  sso: '회사 계정',
  separate: '개별 로그인',
  none: '로그인 없음',
}

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
            <img className="brand-logo" src="/logo-portal.svg" alt="DVI Portal" width={121} height={40} />
          </div>
          {me && (
            <div className="account">
              <span className="account-name">{me.name}</span>
              {/* SSO 세션까지 끊는다. 다른 사내 서비스도 함께 로그아웃된다. */}
              <a className="logout" href="/api/auth/logout">전체 로그아웃</a>
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
