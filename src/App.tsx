import { useEffect, useMemo, useState } from 'react'
import { services, type AuthMode, type Category, type Service } from './services'
import { canSee } from './access'

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

/** `npm run dev`(vite)에는 /api 가 없어 로그인 정보를 못 받는다.
 *  화면을 확인할 수 있게 개발 모드에서만 이 가짜 계정을 쓴다. 배포 빌드에는 안 들어간다. */
const DEV_ME: Me = {
  signedIn: true,
  name: '테스트',
  email: 'dev@localhost',
  realm: ['employee'],
  svc: { jagigo: ['user'], 'hi-yo': ['user'] },
}

type Theme = 'light' | 'dark'

/** 처음 값은 index.html 인라인 스크립트가 <html data-theme> 에 넣어둔 것. */
function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // 직접 고른 적이 없으면 시스템 설정이 바뀔 때 따라간다.
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      let saved: string | null = null
      try { saved = localStorage.getItem('theme') } catch {}
      if (!saved) setTheme(mq.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem('theme', next) } catch {}
    setTheme(next)
  }

  return [theme, toggle] as const
}

/** 시간대별 인사. 새벽(0~5시)은 늦게까지 일하는 사람에게 건네는 말로. */
function greeting(hour: number): string {
  if (hour < 5) return '늦은 시간까지 고생 많아요'
  if (hour < 11) return '좋은 아침이에요'
  if (hour < 14) return '점심 맛있게 드세요'
  if (hour < 18) return '오늘도 힘내세요'
  return '오늘 하루 수고 많았어요'
}

/**
 * 즐겨찾기·최근 사용 — 브라우저(localStorage)에만 저장한다. 서버는 모른다.
 * 공용 PC 에서 계정끼리 섞이지 않도록 키에 이메일을 붙인다.
 */
const RECENT_MAX = 4

function readIds(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function useStoredIds(key: string | null) {
  const [ids, setIds] = useState<string[]>([])
  useEffect(() => {
    setIds(key ? readIds(key) : [])
  }, [key])
  const save = (next: string[]) => {
    setIds(next)
    if (key) try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
  }
  return [ids, save] as const
}

function matches(s: Service, q: string) {
  const text = `${s.name} ${s.description} ${s.category}`.toLowerCase()
  return text.includes(q.trim().toLowerCase())
}

export default function App() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('전체')
  const [me, setMe] = useState<Me | null>(null)
  const [theme, toggleTheme] = useTheme()

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
      .catch(() => setMe(import.meta.env.DEV ? DEV_ME : null))
  }, [])

  const noDept = me !== null && !me.realm.includes('employee')

  const userKey = me?.email || null
  const [favorites, setFavorites] = useStoredIds(userKey && `hub.favorites:${userKey}`)
  const [recent, setRecent] = useStoredIds(userKey && `hub.recent:${userKey}`)

  const toggleFavorite = (id: string) =>
    setFavorites(favorites.includes(id) ? favorites.filter((x) => x !== id) : [...favorites, id])
  const markUsed = (id: string) =>
    setRecent([id, ...recent.filter((x) => x !== id)].slice(0, RECENT_MAX))

  const mine = useMemo(() => services.filter((s) => me === null || canSee(s, me)), [me])

  // 즐겨찾기를 앞으로 — 그 안에서는 원래 순서를 지킨다 (sort 는 안정 정렬)
  const visible = useMemo(
    () =>
      mine
        .filter((s) => (category === '전체' || s.category === category) && matches(s, query))
        .sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id))),
    [mine, query, category, favorites],
  )

  // 권한이 빠졌거나 목록에서 지운 서비스는 최근 사용에서도 빠진다
  const recentServices = recent
    .map((id) => mine.find((s) => s.id === id))
    .filter((s): s is Service => s !== undefined)
  const showRecent = recentServices.length > 0 && query === '' && category === '전체'

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
          <div className="header-actions">
            {/* lucide sun / moon — 지금 테마가 아니라 누르면 바뀔 테마를 보여준다. */}
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              title={theme === 'dark' ? '밝은 테마로' : '어두운 테마로'}
              aria-label={theme === 'dark' ? '밝은 테마로' : '어두운 테마로'}
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
                {theme === 'dark' ? (
                  <>
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2" />
                    <path d="M12 20v2" />
                    <path d="m4.93 4.93 1.41 1.41" />
                    <path d="m17.66 17.66 1.41 1.41" />
                    <path d="M2 12h2" />
                    <path d="M20 12h2" />
                    <path d="m6.34 17.66-1.41 1.41" />
                    <path d="m19.07 4.93-1.41 1.41" />
                  </>
                ) : (
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                )}
              </svg>
            </button>
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
        </div>
      </header>

      <main className="main">
        <section className="hero">
          {me ? (
            <>
              <h1>
                {me.name}님, {greeting(new Date().getHours())} 👋
              </h1>
              <p>지금 쓸 수 있는 서비스 {mine.length}개</p>
            </>
          ) : (
            <>
              <h1>사내 서비스를 한곳에서</h1>
              <p>DVISION에서 운영 중인 서비스 {services.length}개</p>
            </>
          )}
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

        {showRecent && (
          <section className="recent" aria-label="최근 사용">
            <h2>최근 사용</h2>
            <ul>
              {recentServices.map((s) => (
                <li key={s.id}>
                  <a href={s.links[0].url} target="_blank" rel="noreferrer" onClick={() => markUsed(s.id)}>
                    {s.logo ? (
                      <img src={s.logo} alt="" width={24} height={24} />
                    ) : (
                      <span aria-hidden>{s.emoji}</span>
                    )}
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
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
              <ServiceCard
                key={s.id}
                service={s}
                favorite={favorites.includes(s.id)}
                onToggleFavorite={userKey ? () => toggleFavorite(s.id) : undefined}
                onOpen={() => markUsed(s.id)}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

function ServiceCard({
  service: s,
  favorite,
  onToggleFavorite,
  onOpen,
}: {
  service: Service
  favorite: boolean
  /** 로그인 정보가 없으면 저장할 곳이 없어 별 버튼을 숨긴다 */
  onToggleFavorite?: () => void
  onOpen: () => void
}) {
  const primary = s.links[0]
  return (
    <li className={favorite ? 'card favorite' : 'card'}>
      {onToggleFavorite && (
        <button
          type="button"
          className="star"
          onClick={onToggleFavorite}
          aria-pressed={favorite}
          aria-label={favorite ? `${s.name} 즐겨찾기 해제` : `${s.name} 즐겨찾기`}
          title={favorite ? '즐겨찾기 해제' : '즐겨찾기'}
        >
          {/* lucide star */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={favorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
          </svg>
        </button>
      )}
      <a className="card-main" href={primary.url} target="_blank" rel="noreferrer" onClick={onOpen}>
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
        {s.inDevelopment ? (
          <span className="auth auth-dev">개발 중</span>
        ) : (
          <span className={`auth auth-${s.auth}`}>{AUTH_LABEL[s.auth]}</span>
        )}
        {s.links.length > 1 && (
          <div className="links">
            {s.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer" onClick={onOpen}>
                {l.label} ↗
              </a>
            ))}
          </div>
        )}
      </div>
    </li>
  )
}
