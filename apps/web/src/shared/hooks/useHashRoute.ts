import { startTransition, useEffect, useLayoutEffect, useRef, useState } from 'react'

export type Page = 'home' | 'systems' | 'info' | 'account'

export interface Route {
  page: Page
  /** #/info/rules 의 rules 처럼 두 번째 조각 */
  param?: string
  /** 화면을 옮긴 방향 — 탭 순서로 뒤(+) · 앞(-). 처음 열 때는 없다(들어오는 움직임 없이 바로) */
  dir?: number
}

const PAGES: Page[] = ['home', 'systems', 'info', 'account']

/**
 * 해시 주소(#/systems)로 화면을 고른다. 서버는 해시를 보지 않으므로
 * 미들웨어 · Vercel 설정을 건드리지 않고 새로고침 · 뒤로 가기가 그대로 된다.
 */
function parse(hash: string): Route {
  const [first, second] = hash.replace(/^#\/?/, '').split('/')
  const page = PAGES.find((p) => p === first) ?? 'home'
  return { page, param: second || undefined }
}

/** 탭마다 마지막으로 보던 스크롤 위치 */
const scrolls = new Map<Page, number>()

export function useHashRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash))
  const page = useRef(route.page)

  useEffect(() => {
    const onChange = () => {
      const next = parse(location.hash)
      scrolls.set(page.current, scrollY)
      page.current = next.page
      // 새 화면 코드를 받는 동안 빈칸 대신 지금 화면을 둔다 — 받아 두었으면(App 의 미리 받기) 바로 넘어간다
      startTransition(() => setRoute((r) => ({ ...next, dir: PAGES.indexOf(next.page) - PAGES.indexOf(r.page) })))
    }
    addEventListener('hashchange', onChange)
    return () => removeEventListener('hashchange', onChange)
  }, [])

  // 앱의 탭처럼 다른 탭에서 돌아오면 보던 자리로, 같은 화면 안에서 옮기면(#/info/a → b) 맨 위로. 처음 열 때(dir 없음)는 브라우저에 맡긴다
  useLayoutEffect(() => {
    if (route.dir !== undefined) scrollTo({ top: route.dir ? (scrolls.get(route.page) ?? 0) : 0, behavior: 'instant' })
  }, [route])

  return route
}

export function hrefOf(page: Page, param?: string) {
  return page === 'home' ? '#/' : `#/${page}${param ? `/${param}` : ''}`
}
