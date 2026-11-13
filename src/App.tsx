import { useEffect, useMemo, useState } from 'react'
import { services, type AuthMode, type Category, type Service } from './services'

const CATEGORIES: ('전체' | Category)[] = ['전체', '업무','인사', '정보', '사내문화']

const AUTH_LABEL: Record<AuthMode, string> = {
  sso: '회사 계정',
  separate: '개별 로그인',
  none: '로그인 없음',
}

/** 카드 하단 로그인 방식 배지 색. 'dev' 는 개발 중 표시. */
const BADGE_CLASS: Record<AuthMode | 'dev', string> = {
  sso: 'bg-ok-soft text-ok',
  separate: 'bg-warn-soft text-warn',
  none: 'bg-accent-soft text-accent',
  dev: 'bg-line text-muted',
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

/** 헤더의 아이콘 버튼(테마 전환 · 계정 설정) */
const ICON_BUTTON =
  'flex size-8 items-center justify-center rounded-lg text-muted hover:bg-accent-soft hover:text-accent'

const BADGE = 'rounded-md px-2 py-0.5 text-xs'

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
    <div>
      <header className="sticky top-0 z-1 border-b border-line bg-bg/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-hub items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2.5 py-3.5 font-bold">
            <img src="/favicon.svg" alt="" width={32} height={32} />
            <span className="text-lg font-medium tracking-[-0.01em]">
              <b className="font-extrabold text-accent">DVI</b> Portal
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* lucide sun / moon — 지금 테마가 아니라 누르면 바뀔 테마를 보여준다. */}
            <button
              type="button"
              className={`${ICON_BUTTON} cursor-pointer`}
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
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted">{me.name}</span>
                {/* 같은 탭에서 열어 뒤로 가기로 허브에 돌아오게 하고,
                    referrer 파라미터로 콘솔 안에도 돌아가기 링크를 만든다.
                    글자 대신 톱니 아이콘 — 이름 옆이라 뜻이 통하고, 글자를
                    못 보는 환경을 위해 aria-label 과 title 을 남긴다. */}
                <a
                  className={ICON_BUTTON}
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
                <a
                  className="font-semibold whitespace-nowrap text-accent hover:underline"
                  href="/api/auth/logout"
                >
                  로그아웃
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-hub px-4 pt-8 pb-16">
        <section>
          <h1 className="mb-1.5 text-[clamp(24px,4vw,32px)] font-bold">사내 서비스를 한곳에서</h1>
          <p className="mb-5 text-muted">DVISION에서 운영 중인 서비스 {services.length}개</p>
          <input
            className="w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-base text-fg outline-none focus:border-accent focus:ring-3 focus:ring-accent-soft"
            type="search"
            placeholder="서비스 이름이나 기능으로 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </section>

        {noDept && (
          <p className="mb-5 rounded-[10px] border border-l-3 border-line border-l-accent bg-surface px-4 py-3">
            아직 부서가 지정되지 않아 일부 서비스가 보이지 않습니다. 관리팀에 문의해주세요.
          </p>
        )}

        <nav className="mt-5 mb-6 flex flex-wrap gap-2" aria-label="카테고리">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`cursor-pointer rounded-full border px-3.5 py-[7px] text-sm/5 ${
                c === category
                  ? 'border-accent bg-accent text-white'
                  : 'border-line bg-surface text-fg'
              }`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </nav>

        {visible.length === 0 ? (
          <p className="my-4 py-12 text-center text-muted">검색 결과가 없습니다.</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-4">
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
    <li className="flex flex-col rounded-2xl border border-line bg-surface transition-[border-color,translate] duration-150 hover:-translate-y-0.5 hover:border-accent">
      <a className="flex flex-1 gap-3.5 px-5 pt-5 pb-3" href={primary.url} target="_blank" rel="noreferrer">
        {s.logo ? (
          <img
            className="size-11 flex-none rounded-xl bg-white object-contain"
            src={s.logo}
            alt=""
            width={44}
            height={44}
          />
        ) : (
          <span
            className="grid size-11 flex-none place-items-center rounded-xl bg-accent-soft text-[22px]"
            aria-hidden
          >
            {s.emoji}
          </span>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-bold">{s.name}</h2>
            <span className="rounded-md border border-line px-1.5 py-px text-xs text-muted">{s.category}</span>
          </div>
          <p className="mt-1.5 mb-2 text-sm/normal text-muted">{s.description}</p>
          <span className="text-xs text-muted opacity-80">{new URL(primary.url).host}</span>
        </div>
      </a>
      <div className="flex items-center justify-between gap-2 px-5 pt-2.5 pb-4 text-[13px]">
        {s.inDevelopment ? (
          <span className={`${BADGE} ${BADGE_CLASS.dev}`}>개발 중</span>
        ) : (
          <span className={`${BADGE} ${BADGE_CLASS[s.auth]}`}>{AUTH_LABEL[s.auth]}</span>
        )}
        {s.links.length > 1 && (
          <div className="flex gap-3">
            {s.links.map((l) => (
              <a
                key={l.url}
                className="font-semibold text-accent"
                href={l.url}
                target="_blank"
                rel="noreferrer"
              >
                {l.label} ↗
              </a>
            ))}
          </div>
        )}
      </div>
    </li>
  )
}
