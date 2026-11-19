import { BrushCleaning, RotateCcw, Undo2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Decor } from '@/features/decor'
import { useI18n } from '@/shared/i18n'
import { MAX_ZOOM, DecorMenu } from '@/features/decor'

interface EditDockProps {
  decor: Decor
  onTidy: () => void
  /** 되돌릴 것이 있을 때만(없으면 단추가 꺼진다). Ctrl + Z 와 같다 */
  onUndo?: () => void
  /** 기본 배치로 — 갤러리가 없을 때(운영 · pnpm dev)만. 목업은 갤러리 아래에 있다 */
  onReset?: () => void
  /** 편집 끝내기(넓은 화면) — 좁은 화면은 탭 바의 완료 · 빈 곳 누르기(App) */
  onDone: () => void
  /** 왼쪽 사이드바 · 갤러리 폭(px) — 넓은 화면에서 본문 가운데에 놓는다 */
  side: number
}

const TOOL =
  'flex h-10 flex-none cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted transition-[background-color,color,scale] hover:bg-subtle hover:text-fg active:scale-95 disabled:pointer-events-none disabled:opacity-40'
const DONE = 'h-10 flex-none cursor-pointer rounded-xl bg-accent-fill px-5 text-[15px] font-semibold text-white active:scale-95'

/**
 * 홈 편집 중 화면 아래에 뜨는 도구 막대 — 배경 · 빈칸 정리 · 되돌리기 · 기본 배치 · 완료를 글자와 함께.
 * 좁은 화면은 그림 위치 조정 때만 탭 바 자리에 뜬다 — 그 밖의 편집 도구는 탭 바가 맡는다(layout/TabBar 의 EditTabBar)
 * 그림 위치 조정 중에는 같은 자리가 조정 막대(안내 · 확대 · 취소 · 완료)로 바뀐다. 끄는 판은 decor/components/Wallpaper.tsx 의 DecorAdjust
 */
export function EditDock({ decor, onTidy, onUndo, onReset, onDone, side }: EditDockProps) {
  const { t } = useI18n()
  const kind = decor.adjusting
  const pos = kind && decor.pos[kind]

  return (
    <div
      role="toolbar"
      aria-label={kind ? t.widgets.decor.adjust : t.widgets.dock}
      style={{ '--side': `${side}px` } as CSSProperties}
      className="glass-strong animate-materialize fixed inset-x-3 bottom-3 z-40 flex flex-wrap items-center gap-x-1 gap-y-2 rounded-[22px] p-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] lg:inset-x-auto lg:bottom-6 lg:left-[calc((100%+var(--side))/2)] lg:w-max lg:max-w-[calc(100vw-24px)] lg:-translate-x-1/2 lg:justify-center lg:rounded-2xl lg:p-2"
    >
      {kind && pos ? (
        <>
          <span className="px-2 text-sm text-muted">{t.widgets.decor.adjustHint[kind]}</span>
          <label className="mx-2 flex items-center gap-2 text-sm font-semibold">
            {t.widgets.decor.zoom}
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.05}
              value={pos.zoom}
              onChange={(e) => decor.movePos({ ...pos, zoom: +e.target.value })}
              className="w-32 accent-(--color-accent-fill)"
            />
          </label>
          {/* 인사 카드는 메뉴 없이 바로 고르므로(DecorMenu direct) 기본 그림으로 되돌리기는 여기서 */}
          <button
            type="button"
            onClick={() => {
              decor.endAdjust(false)
              decor.set(kind, null)
            }}
            className={TOOL}
          >
            {t.widgets.decor.reset}
          </button>
          <button type="button" onClick={() => decor.endAdjust(false)} className={TOOL}>
            {t.widgets.decor.cancel}
          </button>
          <button type="button" onClick={() => decor.endAdjust(true)} className={`${DONE} max-lg:ml-auto`}>
            {t.widgets.done}
          </button>
        </>
      ) : (
        <>
          <DecorMenu kind="wallpaper" decor={decor} className={TOOL} panelClassName="sm:top-auto! sm:right-auto! sm:bottom-full sm:left-0 sm:mt-0! sm:mb-4 sm:origin-bottom-left!" />
          {/* 빈칸 정리 · 되돌리기는 넓은 화면 칸 배치를 고친다 — 좁은 화면(순서만 바꾸는 편집)에서는 보이지 않는 배치가 바뀌니 숨긴다 */}
          <button type="button" onClick={onTidy} title={t.widgets.tidy} className={`${TOOL} max-lg:hidden`}>
            <BrushCleaning className="size-[18px]" aria-hidden="true" />
            <span className="max-sm:sr-only">{t.widgets.tidy}</span>
          </button>
          <button type="button" onClick={onUndo} disabled={!onUndo} title={t.widgets.undo} className={`${TOOL} max-lg:hidden`}>
            <Undo2 className="size-[18px]" aria-hidden="true" />
            <span className="max-sm:sr-only">{t.widgets.undoShort}</span>
          </button>
          {onReset && (
            <button type="button" onClick={onReset} title={t.widgets.reset} className={TOOL}>
              <RotateCcw className="size-[18px]" aria-hidden="true" />
              <span className="max-sm:sr-only">{t.widgets.resetShort}</span>
            </button>
          )}
          <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
          <button type="button" onClick={onDone} className={DONE}>
            {t.widgets.done}
          </button>
        </>
      )}
    </div>
  )
}
