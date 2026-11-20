import { Image } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Decor, DecorKind } from '../hooks/useDecor'
import { usePopover } from '@/shared/hooks'
import { useI18n } from '@/shared/i18n'
import { PopoverPanel } from '@/shared/ui'

const BUTTON = 'flex h-9 flex-none cursor-pointer items-center rounded-xl bg-subtle px-3 text-sm font-semibold ring-1 ring-line hover:bg-raised active:scale-95'

interface DecorMenuProps {
  kind: DecorKind
  decor: Decor
  /** 여는 단추 모양 — 편집 독 · 인사 카드 위 */
  className: string
  /** 펼침 패널 자리 — 기본은 단추 아래 오른쪽 끝 */
  panelClassName?: string
  /** 메뉴 없이 누르면 바로 이미지 고르기(인사 카드) — 고르면 위치 조정이 이어지고, 기본으로는 위치 조정 독에서 */
  direct?: boolean
}

/**
 * 꾸미기 그림 하나(배경 · 인사 카드)의 메뉴 — 미리보기 · 고르기 · 위치 조정 · 기본으로.
 * 배경은 편집 독(EditDock)에, 인사 카드 그림은 편집 중 카드 위(WidgetGrid)에 둔다 — 바꿀 것 바로 곁에서 바꾸게
 */
export function DecorMenu({ kind, decor, className, panelClassName = '', direct = false }: DecorMenuProps) {
  const { open, toggle, close, ref } = usePopover()
  const { t } = useI18n()
  const picker = usePicker(kind, decor, close)

  if (direct) {
    return (
      <div className="relative">
        <button type="button" onClick={picker.open} className={className}>
          <Image className="size-[18px]" aria-hidden="true" />
          <span className="max-sm:sr-only">{t.widgets.decor.button[kind]}</span>
        </button>
        {picker.input}
        {picker.error && (
          <p role="alert" className="absolute top-full right-0 mt-1.5 w-max max-w-56 rounded-lg bg-raised px-2.5 py-1.5 text-xs text-danger shadow-[0_2px_8px_oklch(0_0_0/0.18)]">
            {picker.error}
          </p>
        )}
      </div>
    )
  }

  return (
    // data-open — 열려 있는 동안 위젯 칸을 다른 위젯 위로(styles/widgets/grid.css)
    <div ref={ref} data-open={open || undefined} className="relative">
      <button type="button" onClick={toggle} aria-expanded={open} className={className}>
        <Image className="size-[18px]" aria-hidden="true" />
        <span className="max-sm:sr-only">{t.widgets.decor.button[kind]}</span>
      </button>

      {open && (
        <PopoverPanel label={t.widgets.decor[kind]} onClose={close} className={`w-[min(320px,calc(100vw-24px))] p-4 ${panelClassName}`}>
          <DecorRow kind={kind} decor={decor} onAdjust={close} />
          <p className="mt-3 text-[11px] text-muted">{t.theme.savedLocally}</p>
        </PopoverPanel>
      )}
    </div>
  )
}

/** 미리보기 · 고르기 · 위치 조정 · 기본으로. 위치 조정을 시작하면 메뉴를 닫는다(onAdjust) */
function DecorRow({ kind, decor, onAdjust }: { kind: DecorKind; decor: Decor; onAdjust: () => void }) {
  const { t } = useI18n()
  const { open, input, error, pick } = usePicker(kind, decor, onAdjust)
  const image = decor[kind]

  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-muted">{t.widgets.decor[kind]}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-12 w-20 flex-none place-items-center overflow-hidden rounded-lg bg-subtle ring-1 ring-line">
          {image ? <img src={image} alt="" className="size-full object-cover" /> : <span className="text-[11px] text-muted">{t.widgets.decor.default}</span>}
        </span>
        <button type="button" onClick={open} className={BUTTON}>
          {t.widgets.decor.choose}
        </button>
        {image && (
          <button
            type="button"
            onClick={() => {
              onAdjust()
              decor.startAdjust(kind)
            }}
            className={BUTTON}
          >
            {t.widgets.decor.adjust}
          </button>
        )}
        {image && (
          <button type="button" onClick={() => pick(null)} className={BUTTON}>
            {t.widgets.decor.reset}
          </button>
        )}
        {input}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

/** 파일 고르기 — 숨긴 input 과 여는 함수, 못 읽거나 저장 못 한 안내. 새 그림은 decor.set 이 바로 위치 조정을 시작한다(onPicked) */
function usePicker(kind: DecorKind, decor: Decor, onPicked: () => void) {
  const { t } = useI18n()
  const ref = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  const pick = async (file: File | null) => {
    setError('')
    try {
      const saved = await decor.set(kind, file)
      if (!saved) setError(t.widgets.decor.notSaved)
      // 새 그림은 바로 위치 조정으로 — 저장을 못 했으면 안내를 보도록 메뉴는 둔다
      else if (file) onPicked()
    } catch {
      setError(t.widgets.decor.unreadable)
    }
  }

  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      hidden
      aria-label={t.widgets.decor[kind]}
      onChange={(e) => {
        const file = e.target.files?.[0]
        // 같은 파일을 다시 골라도 바뀌게
        e.target.value = ''
        if (file) pick(file)
      }}
    />
  )
  return { open: () => ref.current?.click(), input, error, pick }
}
