import { BrushCleaning, RotateCcw, Undo2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Decor } from '../../hooks/useDecor'
import { useI18n } from '../../i18n'
import { MAX_ZOOM } from '../../lib/wallpaper'
import { DecorMenu } from '../layout/DecorMenu'

interface EditDockProps {
  decor: Decor
  onTidy: () => void
  /** 되돌릴 것이 있을 때만(없으면 단추가 꺼진다). Ctrl + Z 와 같다 */
  onUndo?: () => void
  /** 기본 배치로 — 갤러리가 없을 때(운영 · pnpm dev)만. 목업은 갤러리 아래에 있다 */
  onReset?: () => void
  onDone: () => void
  /** 왼쪽 사이드바 · 갤러리 폭(px) — 넓은 화면에서 본문 가운데에 놓는다 */
  side: number
}

const TOOL =
  'flex h-10 flex-none cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted transition-[background-color,color,scale] hover:bg-subtle hover:text-fg active:scale-95 disabled:pointer-events-none disabled:opacity-40'
const DONE = 'h-10 flex-none cursor-pointer rounded-xl bg-accent-fill px-5 text-[15px] font-semibold text-white active:scale-95'

/**
 * 홈 편집 중 화면 아래에 뜨는 도구 막대 — 배경 · 빈칸 정리 · 되돌리기 · 기본 배치 · 완료를 글자와 함께.
 * 그림 위치 조정 중에는 같은 자리가 조정 막대(안내 · 확대 · 취소 · 완료)로 바뀐다. 끄는 판은 layout/Wallpaper.tsx 의 DecorAdjust
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
      className="glass-strong animate-materialize fixed bottom-24 left-1/2 z-40 flex w-max max-w-[calc(100vw-24px)] -translate-x-1/2 flex-wrap items-center justify-center gap-x-1 gap-y-2 rounded-2xl p-2 lg:bottom-6 lg:left-[calc((100%+var(--side))/2)]"
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
          <button type="button" onClick={() => decor.endAdjust(false)} className={TOOL}>
            {t.widgets.decor.cancel}
          </button>
          <button type="button" onClick={() => decor.endAdjust(true)} className={DONE}>
            {t.widgets.done}
          </button>
        </>
      ) : (
        <>
          <DecorMenu kind="wallpaper" decor={decor} className={TOOL} panelClassName="top-auto! right-auto! bottom-full left-0 mt-0! mb-4 origin-bottom-left!" />
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
