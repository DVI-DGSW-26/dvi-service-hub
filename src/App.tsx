import { useMemo, useState } from 'react'
import { services, type AuthMode, type Category, type Service } from './services'

const CATEGORIES: ('전체' | Category)[] = ['전체', '업무', '인사', '정보', '사내문화']

const AUTH_LABEL: Record<AuthMode, string> = {
  sso: '회사 계정',
  separate: '개별 로그인',
  none: '로그인 없음',
}

function matches(s: Service, q: string) {
  const text = `${s.name} ${s.description} ${s.category}`.toLowerCase()
  return text.includes(q.trim().toLowerCase())
}

export default function App() {
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
    <div className="page">
      <header className="header">
        <div className="brand">
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <span>DVI 서비스 허브</span>
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
        <span className="emoji" aria-hidden>
          {s.emoji}
        </span>
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
