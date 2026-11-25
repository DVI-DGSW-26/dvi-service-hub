import { useEffect, useLayoutEffect, useRef } from 'react'
import { LazySystemsPage } from '@/features/systems'
import { LazyInfoPage } from '@/features/info'
import { LazyAccountPage } from '@/features/account'
import { motionOff } from '@/shared/lib'

/** 화면이 옮긴 방향에서 밀려 들어오는 길이 · 시간 — 앱의 탭 넘김처럼 */
const PAGE_IN = { dx: 28, ms: 280, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }

/** 첫 화면을 그린 뒤 한 번 — 앱 스플래시 내리기, 다른 화면 코드 미리 받기 */
export function useAppStart() {
  // 앱(apps/mobile)은 첫 화면을 그릴 때까지 스플래시를 띄워 둔다 — 그렸으니 내린다. 웹 브라우저에는 window.Capacitor 가 없다
  useEffect(() => {
    window.Capacitor?.nativePromise('SplashScreen', 'hide').catch(() => undefined)
  }, [])

  // 다른 화면 코드는 처음 갈 때 받는데, 받고 그리는 일이 한꺼번에 몰려 첫 이동이 끊긴다 — 한가할 때 미리 받아 둔다
  useEffect(() => {
    const preload = () => [LazySystemsPage, LazyInfoPage, LazyAccountPage].forEach((p) => void p.preload().catch(() => undefined))
    if ('requestIdleCallback' in window) requestIdleCallback(preload)
    else setTimeout(preload, 2000)
  }, [])
}

/**
 * 화면(page)을 옮기면 본문(main)이 옮긴 방향(dir: 뒤 +, 앞 −, 같은 화면 안이면 0)에서 조금 밀려 들어온다. 홈은 떠나도 숨겨 둘 뿐이라(App 의 Activity)
 * main 을 새로 그리지 않고 여기서 움직인다. 밀어 넘긴 본문(useSwipeTabs)이 화면 밖에 남긴 자리 · 옆 자리표시도 걷는다
 */
export function usePageIn(page: string, dir: number | undefined) {
  const ref = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !dir) return
    el.style.transform = ''
    delete el.dataset.swiping
    if (!motionOff()) {
      el.animate([{ opacity: 0, translate: `${Math.sign(dir) * PAGE_IN.dx}px 0` }, { opacity: 1, translate: '0 0' }], { duration: PAGE_IN.ms, easing: PAGE_IN.easing })
    }
  }, [page, dir]) // 같은 방향으로 두 번 옮겨도(홈 → 업무시스템 → 정보) 화면이 바뀌면 다시 움직인다
  return ref
}
