import { Trash2 } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { Modal } from '../ui/Modal'

interface ComposeModalProps {
  open: boolean
  onClose: () => void
  /** 제목 위 작은 글씨 (어느 패널에 올라가는지) */
  eyebrow: string
  title: string
  description: string
  /** 왼쪽 목록 — 이미 올라온 글 */
  asideTitle: string
  /** 목록 제목 아래 한 줄 — 언제 내려가는지 */
  asideHint: string
  aside: ReactNode
  onSubmit: () => void
  submitting: boolean
  /** 등록 실패 문구 */
  error?: string
  children: ReactNode
}

/**
 * 글쓰기 모달 — 오늘의 일정 모달과 같은 틀(위 머리말 · 왼쪽 목록 · 오른쪽 본문)에 본문 자리로 폼을 넣는다.
 * 왼쪽에는 이미 올라온 글을 보여 겹치는 내용을 쓰지 않게 한다. 좁은 화면은 폼이 먼저, 목록은 아래.
 */
export function ComposeModal({ open, onClose, eyebrow, title, description, asideTitle, asideHint, aside, onSubmit, submitting, error, children }: ComposeModalProps) {
  const titleId = useId()
  const { t } = useI18n()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!submitting) onSubmit()
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} wide className="lg:h-[min(760px,calc(100dvh-32px))]">
      <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className="flex-none border-b border-line p-6 pr-16 sm:p-8 sm:pr-20">
          <p className="text-[15px] font-semibold text-accent">{eyebrow}</p>
          <h2 id={titleId} className="mt-2 text-[clamp(22px,2.4vw,28px)]/[1.3] font-bold tracking-[-0.025em]">
            {title}
          </h2>
          <p className="mt-1.5 text-base text-muted">{description}</p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain lg:flex-row lg:overflow-hidden">
          <aside className="order-last flex-none border-t border-line p-4 lg:order-first lg:w-80 lg:overflow-y-auto lg:overscroll-contain lg:border-t-0 lg:border-r">
            <h3 className="px-2 text-sm font-bold text-muted">{asideTitle}</h3>
            <p className="px-2 pt-0.5 pb-2 text-[13px] text-muted">{asideHint}</p>
            {aside}
          </aside>
          <div className="min-w-0 flex-1 space-y-5 p-6 sm:p-8 lg:overflow-y-auto lg:overscroll-contain">{children}</div>
        </div>

        <div className="flex flex-none flex-wrap items-center justify-end gap-2 border-t border-line px-6 py-4">
          {error && (
            <p role="alert" className="mr-auto text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-11 cursor-pointer rounded-xl px-5 text-[15px] font-semibold ring-1 ring-line transition-[background-color,scale] duration-150 hover:bg-subtle active:scale-95"
          >
            {t.compose.cancel}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-11 cursor-pointer rounded-xl bg-accent-fill px-6 text-[15px] font-bold text-white shadow-[0_4px_12px_-4px_oklch(0_0_0/0.3)] transition-[opacity,scale] duration-150 active:scale-95 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? t.compose.submitting : t.compose.submit}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/**
 * 왼쪽 목록의 한 줄 + 삭제. 브라우저 확인 창 대신 그 자리에서 한 번 더 묻는다 — 잘못 눌러도 바로 지워지지 않게.
 */
export function DeletableItem({ title, onDelete, children }: { title: string; onDelete: () => Promise<void>; children: ReactNode }) {
  const { t, f } = useI18n()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const remove = async () => {
    setBusy(true)
    setFailed(false)
    try {
      await onDelete()
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <li className="rounded-xl px-2 py-2 transition-colors hover:bg-subtle">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">{children}</div>
        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={f(t.compose.deleteNamed, { title })}
            title={t.compose.delete}
            className="grid size-8 flex-none cursor-pointer place-items-center rounded-lg text-muted transition-[background-color,color,scale] duration-150 hover:bg-danger-soft hover:text-danger active:scale-90"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {confirming && (
        <div className="mt-2 flex items-center justify-end gap-1.5" role="group" aria-label={f(t.compose.deleteNamed, { title })}>
          <span className="mr-auto text-[13px] font-semibold text-danger">{failed ? t.compose.deleteError : t.compose.confirmDelete}</span>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="cursor-pointer rounded-lg px-2.5 py-1 text-[13px] font-semibold ring-1 ring-line transition-colors hover:bg-raised"
          >
            {t.compose.cancel}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            // 묻는 줄이 뜨면 바로 누를 수 있게
            autoFocus
            className="cursor-pointer rounded-lg bg-danger-fill px-2.5 py-1 text-[13px] font-bold text-white transition-opacity disabled:opacity-60"
          >
            {t.compose.delete}
          </button>
        </div>
      )}
    </li>
  )
}
