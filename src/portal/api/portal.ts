// 포털 데이터 창구. 화면은 여기 함수만 부른다.
//
// 지금은 src/mocks 의 목업을 약간의 지연과 함께 돌려준다 (로딩 화면 확인용).
// 플로우 · 게시판 연동 API 가 생기면 각 함수 안을 fetch('/api/portal/…') 로 바꾸면 된다.

import { maintenance, news, notices, notifications, quickLinks, schedule, scheduleHistory } from '../mocks/dashboard'
import { accountSecurity } from '../mocks/account'
import { faqs, infoCategories, mockMe } from '../mocks/info'
import type { Me } from '../types/portal'

// 같은 데이터를 여러 패널이 불러도(히어로 요약 + 일정 패널 등) 요청은 한 번만 간다
const cache = new Map<string, Promise<unknown>>()

function serve<T>(key: string, data: T): Promise<T> {
  if (!cache.has(key)) {
    cache.set(key, new Promise((resolve) => setTimeout(() => resolve(data), 200 + Math.random() * 300)))
  }
  return (cache.get(key) as Promise<T>).then((d) => structuredClone(d))
}

export const portalApi = {
  notices: () => serve('notices', notices),
  maintenance: () => serve('maintenance', maintenance),
  schedule: () => serve('schedule', schedule),
  /** 오늘 + 지난 2주 일정 (전체 일정 모달) */
  scheduleHistory: () => serve('scheduleHistory', scheduleHistory(14)),
  news: () => serve('news', news),
  quickLinks: () => serve('quickLinks', quickLinks),
  notifications: () => serve('notifications', notifications),
  infoCategories: () => serve('infoCategories', infoCategories),
  faqs: () => serve('faqs', faqs),
  /** 로그인 수단 · 로그인한 기기 (계정 설정 화면) */
  accountSecurity: () => serve('accountSecurity', accountSecurity),
}

// 다른 목업처럼 조금 늦게 돌려줘 로딩 화면(스켈레톤)을 확인할 수 있게 한다
const devMe = () => (import.meta.env.DEV ? serve('me', mockMe) : Promise.resolve(null))

/**
 * 로그인 정보. 미들웨어가 로그인 안 된 접근을 이미 막지만, 화면이 열린 채
 * 세션이 만료될 수 있어 401 이면 다시 로그인으로 보낸다 (null 반환).
 *
 * 로컬 개발(vite)에는 Edge 함수가 없어 index.html 이 돌아온다. 그때만 목업 사용자를 쓴다.
 */
export async function fetchMe(): Promise<Me | null> {
  try {
    const r = await fetch('/api/auth/me')
    if (r.status === 401) {
      window.location.href = '/api/auth/login?next=' + encodeURIComponent(location.pathname + location.hash)
      return null
    }
    const isJson = (r.headers.get('content-type') || '').includes('application/json')
    if (!isJson) return devMe()
    return (await r.json()) as Me
  } catch {
    return devMe()
  }
}
