import type { ReactNode } from 'react'
import { useI18n } from '@/shared/i18n'
import { useCardPages } from '../hooks/useCardPages'

/**
 * 카드 count 장을 칸에 다 들어가는 만큼씩 페이지로 — 페이지마다 grid 하나, 옆으로 밀면 한 페이지씩 붙는다(scroll-snap).
 * 둘 이상이면 아래 점(누르면 그 페이지). 가로 휠은 홈 페이지를 넘기지 않게 여기서 멈춘다. children 은 [from, to) 의 카드
 */
export function CardPages({ count, label, children }: { count: number; label: string; children: (from: number, to: number) => ReactNode }) {
  const { f, t } = useI18n()
  const { ref, perPage, page, pageCount, onScroll, go } = useCardPages<HTMLDivElement>(count)
  return (
    <>
      {/* -m-1 p-1: 카드 테두리 · 떠오르기가 틀 끝에서 잘리지 않게 */}
      <div
        ref={ref}
        onScroll={onScroll}
        onWheel={(e) => {
          if (pageCount > 1 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.stopPropagation()
        }}
        className="-m-1 flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none]"
      >
        {Array.from({ length: pageCount }, (_, k) => (
          <ul key={k} className="grid h-full w-full flex-none snap-start content-start grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-3 p-1 max-sm:gap-2 fit:grid-cols-5 fit:gap-2.5">
            {children(k * perPage, (k + 1) * perPage)}
          </ul>
        ))}
      </div>
      {pageCount > 1 && (
        <div className="-mb-1 flex flex-none justify-center pt-1" role="group" aria-label={label}>
          {Array.from({ length: pageCount }, (_, k) => (
            <button
              key={k}
              type="button"
              onClick={() => go(k)}
              aria-label={f(t.widgets.page, { page: k + 1, total: pageCount })}
              aria-current={k === page ? 'page' : undefined}
              className="grid h-4 w-5 cursor-pointer place-items-center"
            >
              <span className={`block h-1.5 rounded-full transition-[width,background-color] ${k === page ? 'w-4 bg-fg/70' : 'w-1.5 bg-fg/25 hover:bg-fg/45'}`} />
            </button>
          ))}
        </div>
      )}
    </>
  )
}
