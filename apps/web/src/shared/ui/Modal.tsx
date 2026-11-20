import { X } from 'lucide-react'
import { useEffect,  useRef, type ReactNode } from 'react'
import { useI18n } from '@/shared/i18n'
import { useSheetDrag, useBackToClose, useScrollTrap } from './modalBehavior'
interface ModalProps {
  open: boolean
  onClose: () => void
  /** 제목 요소의 id — 화면낭독기가 모달 이름으로 읽는다 */
  labelledBy: string
  /** 넓은 모달 — 그림과 글을 나란히 */
  wide?: boolean
  /** 화면을 거의 다 채우는 모달 (캘린더 크게 보기) */
  full?: boolean
  className?: string
  children: ReactNode
}

/**
 * 네이티브 <dialog> 모달. 초점 가두기 · 뒤 화면 비활성 · 닫은 뒤 원래 버튼으로 초점 복귀는
 * 브라우저가 맡는다. 닫을 때는 사라지는 애니메이션(styles/overlay.css 의 data-closing)이 끝난 뒤 닫는다.
 * 휴대폰에서는 화면 아래에 붙어 올라오는 시트가 된다 — 엄지가 닿는 쪽이고, 손잡이를 끌어 내려 닫는다.
 */
export function Modal({ open, onClose, labelledBy, wide = false, full = false, className = '', children }: ModalProps) {
  const { t } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  useScrollTrap(ref, open)
  useSheetDrag(panelRef, ref, open, onClose)
  useBackToClose(open, onClose)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open) {
      // 닫히는 애니메이션 도중 다시 열면(닫기 대기는 정리 함수가 취소했다) 마저 닫고 처음처럼 연다
      // — 닫힘 표시만 떼면 맺히는 애니메이션이 첫 프레임(투명)에 멈춘 채 남는다
      if ('closing' in d.dataset) {
        delete d.dataset.closing
        d.close()
      }
      if (!d.open) d.showModal()
    } else if (d.open) {
      d.dataset.closing = ''
      // 닫히는 애니메이션(styles/overlay.css) · 끌어 내린 시트의 transition 이 끝나면 닫는다 — 길이를 JS 에 따로 적지 않는다.
      // 애니메이션을 껐으면 길이가 0 이라 바로 닫힌다
      let cancelled = false
      const running = [...d.getAnimations(), ...(panelRef.current?.getAnimations() ?? [])]
      void Promise.allSettled(running.map((a) => a.finished)).then(() => {
        if (cancelled) return
        d.close()
        delete d.dataset.closing
        delete d.dataset.dragged
        panelRef.current?.style.removeProperty('transform')
        panelRef.current?.style.removeProperty('transition')
        d.style.removeProperty('--sheet-drag')
        d.style.removeProperty('transition')
      })
      return () => {
        cancelled = true
      }
    }
  }, [open])

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- 바깥(막) 누르기로 닫기. 키보드는 Esc(onCancel)로 닫는다
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      className="modal"
      // Esc: 바로 닫지 않고 애니메이션을 거쳐 닫는다
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      // 바깥(어두운 막)을 누르면 닫는다
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className={`glass-strong relative flex max-h-[calc(100dvh-32px)] flex-col overflow-hidden rounded-3xl max-sm:h-[85dvh] max-sm:max-h-none max-sm:w-full max-sm:rounded-b-none max-sm:pb-[env(safe-area-inset-bottom)] ${full ? 'h-[calc(100dvh-24px)] max-h-none w-[calc(100vw-24px)]' : wide ? 'w-[min(1200px,calc(100vw-24px))]' : 'w-[min(760px,calc(100vw-24px))]'} ${className}`}
      >
        {/*
          휴대폰 시트는 내용과 상관없이 늘 화면의 85% 높이다 — 손잡이 · 닫기 단추 · 아래 버튼 줄이 매번 같은 자리에 있고,
          공지를 넘겨도 시트가 들썩이지 않는다. 위쪽 15% 는 어두운 막이 보여 '뒤에 화면이 있다' 는 걸 알리고,
          한 손으로도 그 막을 눌러 닫을 수 있다. 짧은 내용은 본문 칸이 남는 높이를 채우고, 긴 내용은 그 안에서 스크롤한다.
        */}
        {/* 휴대폰 시트 손잡이 — 여기서는 어느 방향으로 움직여도 시트를 끈다 (닫기 단추는 그대로 둔다) */}
        <div
          aria-hidden="true"
          data-sheet-handle
          className="absolute inset-x-16 top-0 z-[5] flex h-8 touch-none justify-center pt-2 sm:hidden"
        >
          <span className="h-1.5 w-10 rounded-full bg-fg/25" />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.common.close}
          className="absolute top-3 right-3 z-10 grid size-11 cursor-pointer place-items-center rounded-full bg-surface text-fg shadow-[0_2px_8px_oklch(0_0_0/0.15)] ring-1 ring-line transition-[background-color,scale] duration-150 hover:bg-raised active:scale-90"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        {children}
      </div>
    </dialog>
  )
}
