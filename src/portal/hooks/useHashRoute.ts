import { useEffect, useState } from 'react'

export type Page = 'home' | 'systems' | 'info' | 'guide' | 'account'

export interface Route {
  page: Page
  /** #/info/rules 의 rules 처럼 두 번째 조각 */
  param?: string
}

const PAGES: Page[] = ['home', 'systems', 'info', 'guide', 'account']

/**
 * 해시 주소(#/systems)로 화면을 고른다. 서버는 해시를 보지 않으므로
 * 미들웨어 · Vercel 설정을 건드리지 않고 새로고침 · 뒤로 가기가 그대로 된다.
 */
function parse(hash: string): Route {
  const [first, second] = hash.replace(/^#\/?/, '').split('/')
  const page = PAGES.find((p) => p === first) ?? 'home'
  return { page, param: second || undefined }
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash))

  useEffect(() => {
    const onChange = () => {
      setRoute(parse(location.hash))
      window.scrollTo({ top: 0 })
    }
    addEventListener('hashchange', onChange)
    return () => removeEventListener('hashchange', onChange)
  }, [])

  return route
}

export function hrefOf(page: Page, param?: string) {
  return page === 'home' ? '#/' : `#/${page}${param ? `/${param}` : ''}`
}
