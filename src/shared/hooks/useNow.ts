import { useEffect, useState } from 'react'

const MINUTE = 60_000

/**
 * 지금 시각. 매분 정각에 새로 그린다 — 켜 둔 대시보드의 '지금 오후 2:13' · 진행 중 표시가 멈추지 않게.
 * 뒤로 가 있던 탭은 타이머가 늦어지므로 다시 보일 때 바로 맞춘다.
 */
export function useNow() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer = 0
    const tick = () => {
      setNow(new Date())
      timer = window.setTimeout(tick, MINUTE - (Date.now() % MINUTE))
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      window.clearTimeout(timer)
      tick()
    }
    timer = window.setTimeout(tick, MINUTE - (Date.now() % MINUTE))
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return now
}
