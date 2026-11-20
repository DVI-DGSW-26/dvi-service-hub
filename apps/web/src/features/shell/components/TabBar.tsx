import { Check, RotateCcw } from 'lucide-react'
import type { Decor } from '@/features/decor'
import { hrefOf, type Page } from '@/shared/hooks'
import { useLiquidNav } from '../hooks/useLiquidNav'
import { useI18n } from '@/shared/i18n'
import { DecorMenu } from '@/features/decor'
import { CarryChip, LiquidBlobs } from './LiquidParts'
import { NAV_ITEMS } from '../lib/navItems'

const BAR = 'glass-chrome fixed inset-x-3 bottom-3 z-30 rounded-[22px] p-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] lg:hidden'
/** 탭 한 칸 — 아이콘 위 · 글자 아래. 꾸미기 단추(DecorMenu)는 휴대폰에서 글자를 숨기므로 여기서는 다시 보인다 */
const ITEM =
  'flex min-h-12 w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-[background-color,color,scale] duration-150 active:scale-95 [&>span]:not-sr-only'

/**
 * 좁은 화면 홈 편집 중의 탭 바 — 같은 자리 · 같은 네 칸을 배경 · 인사 카드 이미지 · 기본 배치 · 완료로 바꿔 쓴다.
 * 빈 곳을 눌러도 편집이 끝난다(App). 그림 위치 조정 중에는 조정 막대(EditDock)가 이 자리에 온다
 */
export function EditTabBar({ decor, onReset, onDone }: { decor: Decor; onReset: () => void; onDone: () => void }) {
  const { t } = useI18n()
  return (
    <div role="toolbar" aria-label={t.widgets.dock} className={BAR}>
      <ul className="grid grid-cols-4">
        <li>
          <DecorMenu kind="wallpaper" decor={decor} className={`${ITEM} text-muted`} />
        </li>
        <li>
          <DecorMenu kind="hero" decor={decor} direct className={`${ITEM} text-muted`} />
        </li>
        <li>
          <button type="button" onClick={onReset} title={t.widgets.reset} className={`${ITEM} text-muted`}>
            <RotateCcw className="size-5" aria-hidden="true" />
            {t.widgets.resetShort}
          </button>
        </li>
        <li>
          <button type="button" onClick={onDone} className={`${ITEM} bg-accent-fill text-white`}>
            <Check className="size-5" strokeWidth={2.4} aria-hidden="true" />
            {t.widgets.done}
          </button>
        </li>
      </ul>
    </div>
  )
}

/**
 * 좁은 화면 하단에 떠 있는 유리 탭바 — 엄지로 닿는 곳에 주 메뉴를 둔다.
 * 사이드바와 같은 물방울 선택 표시: 탭을 누른 채 좌우로 끌면 방울이 떨어져 나와 따라오고,
 * 닿는 탭으로 화면이 바뀐다. 튕기듯 놓으면 그 속도로 멈출 자리에 가장 가까운 탭으로 간다.
 */
export function TabBar({ page }: { page: Page }) {
  const { t } = useI18n()
  const active = NAV_ITEMS.findIndex((n) => n.page === page)
  const { listRef, dropRef, chipRef, anchorRefs, lit, dragging, carry, onPointerDown, onDragStart } = useLiquidNav({
    axis: 'x',
    active,
    onCommit: (i) => {
      location.hash = hrefOf(NAV_ITEMS[i].page)
    },
  })

  return (
    <>
      <nav
        data-liquid-root
        aria-label={t.layout.mainNav}
        className={BAR}
      >
        <div className="relative">
          <LiquidBlobs dropRef={dropRef} anchorRefs={anchorRefs} rounded="rounded-2xl" />

          {/* touch-none: 좌우로 끄는 동안 브라우저가 화면을 밀거나 뒤로 가지 않게 */}
          <ul ref={listRef} onPointerDown={onPointerDown} onDragStart={onDragStart} className="relative grid grid-cols-4 touch-none select-none">
            {NAV_ITEMS.map(({ page: p, icon: I }, i) => {
              const on = lit === i
              return (
                <li key={p}>
                  <a
                    href={hrefOf(p)}
                    aria-current={p === page ? 'page' : undefined}
                    // 앱처럼 — 지금 탭을 한 번 더 누르면 맨 위로(같은 주소라 화면 이동이 일어나지 않는다)
                    onClick={() => p === page && scrollTo({ top: 0, behavior: 'smooth' })}
                    className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-[color,scale] duration-150 ${
                      dragging ? 'cursor-grabbing' : 'active:scale-95'
                    } ${on ? 'text-white' : 'text-muted'}`}
                  >
                    <I className="size-5" strokeWidth={on ? 2.4 : 2} aria-hidden="true" />
                    {t.layout.pages[p]}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      <CarryChip chipRef={chipRef} index={carry} />
    </>
  )
}
