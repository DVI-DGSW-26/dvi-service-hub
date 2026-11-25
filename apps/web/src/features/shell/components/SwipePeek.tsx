import { Suspense, startTransition, useEffect, useState, type ReactNode } from 'react'
import { useMedia, type Page } from '@/shared/hooks'
import { BOARD } from '@/shared/constants'
import { NAV_ITEMS } from '../lib/navItems'

/**
 * 본문(#main)을 옆으로 미는 동안(useSwipeTabs 가 data-swiping 을 붙인다) 양옆에 드러나는 옆 탭 — 빈 바탕 대신 그 화면을 그대로(render).
 * main 이 transform 으로 움직여 그 안의 absolute 는 main 을 따라온다. 평소에는 숨고(styles/layout.css 의 .swipe-peek) 누르거나 읽히지 않는다(inert).
 * 화면을 옮길 때마다 바로 그리면 이동이 무거워져, 옮긴 뒤 한가할 때 낮은 우선순위로 그려 둔다. 밀기는 좁은 화면에서만
 */
export function SwipePeek({ page, render }: { page: Page; render: (page: Page) => ReactNode }) {
  const wide = useMedia(BOARD)
  const [ready, setReady] = useState<Page | null>(null)
  useEffect(() => {
    let cancelled = false
    const run = () => !cancelled && startTransition(() => setReady(page))
    if ('requestIdleCallback' in window) requestIdleCallback(run)
    else setTimeout(run, 300)
    return () => {
      cancelled = true
    }
  }, [page])

  if (wide || ready !== page) return null
  const index = NAV_ITEMS.findIndex((n) => n.page === page)
  const prev = NAV_ITEMS[index - 1] as (typeof NAV_ITEMS)[number] | undefined
  const next = NAV_ITEMS[index + 1] as (typeof NAV_ITEMS)[number] | undefined
  return (
    <>
      {prev && (
        <div className="swipe-peek right-[calc(100%+1.5rem)]" inert>
          <Suspense>{render(prev.page)}</Suspense>
        </div>
      )}
      {next && (
        <div className="swipe-peek left-[calc(100%+1.5rem)]" inert>
          <Suspense>{render(next.page)}</Suspense>
        </div>
      )}
    </>
  )
}
