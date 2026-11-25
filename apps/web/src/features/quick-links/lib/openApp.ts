import type { QuickLink } from '@/shared/types'
import { KEYS, readPref, writePref } from '@/shared/lib'

/** 앱이 열렸다고 보기까지 기다리는 시간. 앱 전환 · '앱 열기' 확인 창은 보통 이 안에 뜬다 */
const WAIT_MS = 1200

const ua = navigator.userAgent
const isAndroid = /Android/i.test(ua)
const isIOS = /iPhone|iPad|iPod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)

/** 이 기기에서 쓸 앱 주소. iPhone 은 앱 주소를 몰라 없다 — 모르는 스킴을 부르면 Safari 가 오류 창을 띄운다 */
export const appUrlOf = (q: QuickLink) => (isIOS ? undefined : isAndroid ? q.app?.android : q.app?.pc)

/**
 * 앱이 깔려 있으면 앱으로, 없으면 웹으로 연다.
 * Android intent:// 는 앱이 없을 때 브라우저가 알아서 웹 주소(S.browser_fallback_url)로 가니 보내기만 한다.
 * PC 스킴은 브라우저가 앱이 열렸는지 알려 주지 않는다. 앱 주소로 보낸 뒤 화면이 가려지면(앱으로 넘어감 · 열기 확인 창)
 * 앱이 받은 것으로 보고, 잠시 지나도 그대로면 웹 주소를 새 탭에 연다.
 * 누른 지 몇 초 안이라 새 탭이 팝업 차단에 걸리지 않는다.
 */
export function openApp(appUrl: string, webUrl: string) {
  if (appUrl.startsWith('intent:')) {
    window.location.href = appUrl
    return
  }
  let left = false
  const onLeave = () => {
    left = true
  }
  const onVisibility = () => document.hidden && onLeave()
  window.addEventListener('blur', onLeave)
  document.addEventListener('visibilitychange', onVisibility)

  window.setTimeout(() => {
    window.removeEventListener('blur', onLeave)
    document.removeEventListener('visibilitychange', onVisibility)
    if (!left) window.open(webUrl, '_blank', 'noreferrer')
  }, WAIT_MS)

  window.location.href = appUrl
}

export type OpenWith = 'web' | 'app'

/** 웹은 새 탭, 앱은 openApp — 이 기기에 앱 주소가 없으면 웹 */
export function openLink(q: QuickLink, how: OpenWith) {
  const appUrl = appUrlOf(q)
  if (how === 'app' && appUrl) openApp(appUrl, q.url)
  else window.open(q.url, '_blank', 'noreferrer')
}

/** '다시 묻지 않기'로 정한 답 — { 바로가기 id: 'web' | 'app' } */
function saved(): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(readPref(KEYS.openWith) ?? '{}')
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function savedChoice(id: string): OpenWith | undefined {
  const v = saved()[id]
  return v === 'web' || v === 'app' ? v : undefined
}

export const saveChoice = (id: string, how: OpenWith) => writePref(KEYS.openWith, JSON.stringify({ ...saved(), [id]: how }))
