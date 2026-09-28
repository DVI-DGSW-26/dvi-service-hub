import { useEffect, useMemo, useState } from 'react'
import { services, type AuthMode, type Category, type Service } from './services'

const CATEGORIES: ('전체' | Category)[] = ['전체', '회사', '업무','인사', '정보', '사내문화']

const AUTH_LABEL: Record<AuthMode, string> = {
  sso: '회사 계정',
  separate: '개별 로그인',
  none: '로그인 없음',
}

function matches(s: Service, q: string) {
  const text = `${s.name} ${s.description} ${s.category}`.toLowerCase()
  return text.includes(q.trim().toLowerCase())
}

interface User {
  sub: string
  name?: string
  email?: string
}

type AuthState = { status: 'loading' } | { status: 'anon' } | { status: 'user'; user: User }

function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { user: User | null } | null) =>
        setState(d?.user ? { status: 'user', user: d.user } : { status: 'anon' }),
      )
      .catch(() => setState({ status: 'anon' }))
  }, [])
  return state
}

export default function App() {
  const auth = useAuth()

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <span>DVI 서비스 허브</span>
          {auth.status === 'user' && (
            <div className="account">
              <span>{auth.user.name ?? auth.user.email}</span>
              <a href="/api/auth/logout">로그아웃</a>
            </div>
          )}
        </div>
      </header>

      {auth.status === 'loading' && <main className="main" />}
      {auth.status === 'anon' && <LoginGate />}
      {auth.status === 'user' && <Hub />}
    </div>
  )
}

function LoginGate() {
  return (
    <main className="main gate">
      <h1>사내 서비스를 한곳에서</h1>
      <p>디비전 계정으로 로그인하세요.</p>
      <a className="login-btn" href="/api/auth/login">
        디비전 계정으로 로그인
      </a>
    </main>
  )
}

function Hub() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('전체')

  const visible = useMemo(
    () =>
      services.filter(
        (s) => (category === '전체' || s.category === category) && matches(s, query),
      ),
    [query, category],
  )

  return (
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
