import type { ReactNode } from 'react'
import { useI18n } from '@/shared/i18n'
import { useCardPages } from '../hooks/useCardPages'

/** 카드 페이지 grid — 칸 폭에 맞춰 열 수가 정해진다 */
const CARD_GRID = 'grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-3 max-sm:gap-2 fit:grid-cols-5 fit:gap-2.5'

interface CardPagesProps {
  count: number
  label: string
  /** 한 페이지 장수가 정해진 작은 칸(로고만) — 줄 · 열은 grid 가 정한다 */
  perPage?: number
  grid?: string
  /** 아래 점 — 아주 작은 칸(1×1 등)은 자리가 없어 쓸기로만 */
  dots?: boolean
  children: (from: number, to: number) => ReactNode
}

/**
 * 카드 count 장을 칸에 다 들어가는 만큼씩 페이지로 — 페이지마다 grid 하나, 옆으로 밀면 한 페이지씩 붙는다(scroll-snap). 터치는 위 · 아래로 쓸어도 넘긴다.
 * 둘 이상이면 아래 점(누르면 그 페이지). 가로 휠은 홈 페이지를 넘기지 않게 여기서 멈춘다. children 은 [from, to) 의 카드
 */
export function CardPages({ count, label, perPage: fixed, grid = CARD_GRID, dots = true, children }: CardPagesProps) {
  const { f, t } = useI18n()
  const { ref, perPage, page, pageCount, onScroll, go } = useCardPages<HTMLDivElement>(count, fixed)
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
          // snap-always: 크게 쓸어도(던지듯) 한 페이지씩 — 여러 장은 손을 대고 끌어서
          <ul key={k} className={`grid h-full w-full flex-none snap-start snap-always content-start p-1 ${grid}`}>
            {children(k * perPage, (k + 1) * perPage)}
          </ul>
        ))}
      </div>
      {dots && pageCount > 1 && (
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
