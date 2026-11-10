/**
 * switcher.js — 모든 사내 서비스에 붙는 "서비스 이동" 버튼
 *
 * 각 서비스 HTML 에 이 한 줄만 넣는다:
 *   <script src="https://dvi-service-hub.vercel.app/switcher.js" defer></script>
 *
 * 왼쪽 아래 버튼이 기본이다. 그 자리에 서비스 자체 버튼이 있으면
 * data-position="right" 를 붙여 오른쪽으로 옮긴다.
 *
 * 원칙
 * - 서비스 목록은 허브의 services.ts 를 빌드할 때 이 파일에 넣는다.
 *   허브 목록을 고치고 배포하면 모든 서비스의 메뉴가 같이 바뀐다.
 * - 이 파일이 깨지면 모든 서비스에 같이 퍼진다. 그래서 무슨 일이 있어도
 *   예외를 밖으로 던지지 않는다. 최악의 경우 버튼만 안 보이고 서비스는 멀쩡해야 한다.
 * - 서비스 화면의 CSS 와 섞이지 않게 Shadow DOM 안에 그린다.
 * - 사람마다 쓸 수 있는 서비스가 다르다. 허브에 역할을 물어(/api/switcher/access)
 *   허브 화면과 같은 규칙(access.ts)으로 거른다. 답을 못 받으면(허브에 아직 안 들어옴,
 *   브라우저가 다른 사이트 쿠키를 막음) 전체를 보여준다 — 쓸 수 있는 서비스를 숨기는
 *   것보다 낫다. 실제 접근 차단은 각 서비스가 한다.
 */
import { services, type Service } from '../services'
import { canSee, type Roles } from '../access'

const GLOBAL_FLAG = '__dviSwitcherLoaded'

/** 이 스크립트를 내려준 곳 = 허브 주소. 로고 경로와 "포털 홈" 링크에 쓴다 */
function hubOrigin(script: HTMLScriptElement | null): string {
  try {
    if (script?.src) return new URL(script.src).origin
  } catch { /* 아래 기본값 */ }
  return 'https://dvi-service-hub.vercel.app'
}

/** 허브에 이 사람의 역할을 묻는다. 모르면 null */
async function fetchRoles(hub: string): Promise<Roles | null> {
  try {
    const res = await fetch(`${hub}/api/switcher/access`, { credentials: 'include' })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.known || !Array.isArray(data.realm) || typeof data.svc !== 'object') return null
    return { realm: data.realm, svc: data.svc ?? {} }
  } catch {
    return null
  }
}

/**
 * 서비스 화면의 테마를 따른다. 허브·탈탈처럼 <html data-theme="dark|light"> 로
 * 테마를 정하는 서비스가 있고, 그런 표시가 없으면 기기 설정을 따른다.
 */
function hostTheme(): 'dark' | 'light' | 'auto' {
  const t = document.documentElement.dataset.theme
  if (t === 'dark' || t === 'light') return t
  if (document.documentElement.classList.contains('dark')) return 'dark'
  return 'auto'
}

/** 지금 열려 있는 서비스 — 링크 주소의 호스트가 같은 것 */
function isCurrent(s: Service): boolean {
  return s.links.some((l) => {
    try { return new URL(l.url).host === location.host } catch { return false }
  })
}

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.wrap {
  --bg: #ffffff; --text: #16181d; --muted: #6b7280; --border: #e5e7ef;
  --accent: #2f5bff; --accent-soft: #eaf0ff; --shadow: 0 8px 30px rgba(0,0,0,.18);
  font-family: 'Pretendard', system-ui, -apple-system, 'Segoe UI', 'Malgun Gothic', sans-serif;
  font-size: 14px; line-height: 1.4; color: var(--text);
}
.wrap.dark {
  --bg: #181b22; --text: #eceef3; --muted: #9aa1ae; --border: #2a2f3a;
  --accent: #6b8cff; --accent-soft: #1f2842; --shadow: 0 8px 30px rgba(0,0,0,.5);
}
@media (prefers-color-scheme: dark) {
  .wrap.auto {
    --bg: #181b22; --text: #eceef3; --muted: #9aa1ae; --border: #2a2f3a;
    --accent: #6b8cff; --accent-soft: #1f2842; --shadow: 0 8px 30px rgba(0,0,0,.5);
  }
}
.fab {
  position: fixed; bottom: 20px; z-index: 2147483000;
  width: 44px; height: 44px; border-radius: 50%;
  display: grid; place-items: center; cursor: pointer;
  border: 1px solid var(--border); background: var(--bg); color: var(--text);
  box-shadow: var(--shadow); transition: transform .15s, color .15s;
}
.fab:hover { transform: scale(1.06); color: var(--accent); }
.fab:focus-visible, .panel a:focus-visible, .close:focus-visible {
  outline: 2px solid var(--accent); outline-offset: 2px;
}
.left .fab { left: 20px; }
.right .fab { right: 20px; }

.backdrop {
  position: fixed; inset: 0; z-index: 2147483001;
  background: rgba(0,0,0,.25); opacity: 0; pointer-events: none; transition: opacity .2s;
}
.panel {
  position: fixed; top: 0; bottom: 0; z-index: 2147483002;
  width: min(300px, 85vw); display: flex; flex-direction: column;
  background: var(--bg); box-shadow: var(--shadow);
  /* 닫혀 있을 때 화면 밖으로 밀어도 그림자가 가장자리에 비친다 — 아예 숨긴다 */
  visibility: hidden; transition: transform .2s ease, visibility .2s;
}
.left .panel { left: 0; transform: translateX(-105%); border-right: 1px solid var(--border); }
.right .panel { right: 0; transform: translateX(105%); border-left: 1px solid var(--border); }
.open .backdrop { opacity: 1; pointer-events: auto; }
.open .panel { transform: none; visibility: visible; }
@media (prefers-reduced-motion: reduce) { .panel, .backdrop, .fab { transition: none; } }

.head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 16px 12px; border-bottom: 1px solid var(--border);
}
.head b { font-size: 15px; }
.head b span { color: var(--accent); }
.close {
  width: 32px; height: 32px; border: 0; border-radius: 8px; cursor: pointer;
  display: grid; place-items: center; background: none; color: var(--muted);
}
.close:hover { background: var(--accent-soft); color: var(--accent); }

ul { list-style: none; margin: 0; padding: 8px; overflow-y: auto; flex: 1; }
li + li { margin-top: 2px; }
.item {
  display: flex; align-items: center; gap: 12px; padding: 8px 10px; border-radius: 10px;
  color: var(--text); text-decoration: none;
}
a.item:hover { background: var(--accent-soft); }
.item.current { background: var(--accent-soft); font-weight: 600; }
.icon {
  flex: none; width: 32px; height: 32px; border-radius: 8px; object-fit: contain;
  display: grid; place-items: center; background: #fff; font-size: 16px;
  border: 1px solid var(--border);
}
.name { flex: 1; min-width: 0; }
.name small { display: block; color: var(--muted); font-weight: 400; font-size: 12px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.badge { font-size: 11px; color: var(--accent); font-weight: 600; white-space: nowrap; }
.sub { display: flex; gap: 6px; padding: 0 10px 6px 54px; }
.sub a {
  font-size: 12px; color: var(--accent); text-decoration: none; padding: 2px 8px;
  border: 1px solid var(--border); border-radius: 6px;
}
.sub a:hover { background: var(--accent-soft); }
.home { border-bottom: 1px solid var(--border); margin-bottom: 6px; padding-bottom: 6px; }
`

/* lucide grid-3x3 를 점 9개로 단순화 — "앱 모음" 아이콘으로 익숙한 모양 */
const GRID_ICON =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
  [5, 12, 19].flatMap((y) => [5, 12, 19].map((x) => `<circle cx="${x}" cy="${y}" r="2"/>`)).join('') +
  '</svg>'
const X_ICON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'

/** textContent 로 넣을 수 없는 곳(템플릿 문자열)에 쓰는 이스케이프 */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

function iconHtml(s: Service, hub: string): string {
  return s.logo
    ? `<img class="icon" src="${esc(hub + s.logo)}" alt="" width="32" height="32" loading="lazy">`
    : `<span class="icon" aria-hidden="true">${esc(s.emoji)}</span>`
}

function itemHtml(s: Service, hub: string): string {
  const current = isCurrent(s)
  const main = s.links[0]
  const label =
    `${iconHtml(s, hub)}<span class="name">${esc(s.name)}<small>${esc(s.description)}</small></span>` +
    (current ? '<span class="badge">사용 중</span>' : '')
  // 지금 보고 있는 서비스는 링크로 두지 않는다 — 누르면 화면이 새로 고쳐질 뿐이다
  const row = current
    ? `<div class="item current" aria-current="page">${label}</div>`
    : `<a class="item" href="${esc(main.url)}">${label}</a>`
  const sub =
    s.links.length > 1
      ? `<div class="sub">${s.links
          .map((l) => `<a href="${esc(l.url)}">${esc(l.label)}</a>`)
          .join('')}</div>`
      : ''
  return `<li>${row}${sub}</li>`
}

/**
 * 목록 내용. roles 를 모르면(null) 전체를 보여준다.
 * 지금 보고 있는 서비스는 걸러지지 않는다 — 이미 들어와 있다는 것이 쓸 수 있다는 뜻이다.
 */
function listHtml(hub: string, roles: Roles | null): string {
  const visible = roles ? services.filter((s) => isCurrent(s) || canSee(s, roles)) : services
  return (
    `<li class="home"><a class="item" href="${esc(hub + '/')}">` +
    `<img class="icon" src="${esc(hub + '/favicon.svg')}" alt="" width="32" height="32">` +
    `<span class="name">포털 홈<small>전체 서비스 · 공지</small></span></a></li>` +
    visible.map((s) => itemHtml(s, hub)).join('')
  )
}

function mount(script: HTMLScriptElement | null) {
  const hub = hubOrigin(script)
  const side = script?.dataset.position === 'right' ? 'right' : 'left'

  const host = document.createElement('div')
  host.setAttribute('data-dvi-switcher', '')
  const root = host.attachShadow({ mode: 'open' })

  root.innerHTML =
    `<style>${CSS}</style>` +
    `<div class="wrap ${side} ${hostTheme()}">` +
    `<button class="fab" type="button" aria-haspopup="dialog" aria-expanded="false" ` +
    `aria-label="사내 서비스 이동" title="사내 서비스 이동">${GRID_ICON}</button>` +
    `<div class="backdrop"></div>` +
    `<div class="panel" role="dialog" aria-modal="true" aria-label="사내 서비스" inert>` +
    `<div class="head"><b><span>DVI</span> 사내 서비스</b>` +
    `<button class="close" type="button" aria-label="닫기">${X_ICON}</button></div>` +
    `<ul>${listHtml(hub, null)}</ul></div></div>`

  const wrap = root.querySelector<HTMLElement>('.wrap')!
  const list = root.querySelector<HTMLElement>('ul')!

  // 역할을 받으면 목록을 이 사람 것으로 바꾼다. 보통 버튼을 누르기 전에 끝난다.
  fetchRoles(hub).then((roles) => {
    try { if (roles) list.innerHTML = listHtml(hub, roles) } catch { /* 전체 목록 그대로 */ }
  })

  // 서비스의 테마 버튼을 누르면 따라 바뀐다
  new MutationObserver(() => {
    wrap.classList.remove('dark', 'light', 'auto')
    wrap.classList.add(hostTheme())
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })
  const fab = root.querySelector<HTMLButtonElement>('.fab')!
  const panel = root.querySelector<HTMLElement>('.panel')!

  const setOpen = (open: boolean) => {
    wrap.classList.toggle('open', open)
    fab.setAttribute('aria-expanded', String(open))
    // 닫혀 있을 때 탭 키가 숨은 목록으로 들어가지 않게 한다
    panel.inert = !open
    if (open) root.querySelector<HTMLElement>('.panel a, .panel .close')?.focus()
    else fab.focus()
  }

  fab.addEventListener('click', () => setOpen(!wrap.classList.contains('open')))
  root.querySelector('.close')!.addEventListener('click', () => setOpen(false))
  root.querySelector('.backdrop')!.addEventListener('click', () => setOpen(false))
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && wrap.classList.contains('open')) setOpen(false)
  })

  document.body.appendChild(host)
}

;(() => {
  try {
    // 같은 페이지에 두 번 넣어도 버튼은 하나만
    const w = window as unknown as Record<string, unknown>
    if (w[GLOBAL_FLAG]) return
    w[GLOBAL_FLAG] = true

    // currentScript 는 실행 중일 때만 읽힌다. defer 여도 이 시점엔 있다
    const script = document.currentScript as HTMLScriptElement | null
    const start = () => {
      try { mount(script) } catch (e) { console.warn('[DVI switcher]', e) }
    }
    if (document.body) start()
    else document.addEventListener('DOMContentLoaded', start, { once: true })
  } catch (e) {
    console.warn('[DVI switcher]', e)
  }
})()
