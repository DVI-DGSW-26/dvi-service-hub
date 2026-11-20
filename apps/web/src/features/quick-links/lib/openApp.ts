/** 앱이 열렸다고 보기까지 기다리는 시간. 앱 전환 · '앱 열기' 확인 창은 보통 이 안에 뜬다 */
const WAIT_MS = 1200

/**
 * 앱이 깔려 있으면 앱으로, 없으면 웹으로 연다.
 * 브라우저는 앱이 열렸는지 알려 주지 않는다. 앱 주소(스킴)로 보낸 뒤 화면이 가려지면(앱으로 넘어감 · 열기 확인 창)
 * 앱이 받은 것으로 보고, 잠시 지나도 그대로면 웹 주소를 새 탭에 연다.
 * 누른 지 몇 초 안이라 새 탭이 팝업 차단에 걸리지 않는다.
 */
export function openApp(appUrl: string, webUrl: string) {
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
