import { useEffect, useState } from 'react'
import { portalApi } from '../../api/portal'
import { useI18n } from '../../i18n'
import { shortDate } from '../../lib/format'
import type { Notice } from '../../types/portal'
import { Field, controlClass } from '../ui/Field'
import { ComposeModal, DeletableItem } from './ComposeModal'

const blank = () => ({ title: '', summary: '', body: '', important: false, url: '' })

interface NoticeComposerProps {
  open: boolean
  onClose: () => void
  /** 이미 올라온 공지 — 왼쪽 목록 */
  items: Notice[]
}

/** 전사 공지 작성 (admin). 날짜는 등록한 날로 붙는다 */
export function NoticeComposer({ open, onClose, items }: NoticeComposerProps) {
  const { t, lang } = useI18n()
  const c = t.compose.notice
  const [form, setForm] = useState(blank)
  // 한 번 등록을 눌러 본 뒤에만 빠진 칸을 빨갛게
  const [tried, setTried] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  // 열 때마다 빈 폼으로
  useEffect(() => {
    if (!open) return
    setForm(blank())
    setTried(false)
    setError(undefined)
  }, [open])

  const set = <K extends keyof ReturnType<typeof blank>>(key: K, value: ReturnType<typeof blank>[K]) => setForm((f) => ({ ...f, [key]: value }))
  const errors = {
    title: form.title.trim() ? undefined : t.compose.required,
    summary: form.summary.trim() ? undefined : t.compose.required,
  }
  const shown = (e?: string) => (tried ? e : undefined)

  const submit = async () => {
    setTried(true)
    if (Object.values(errors).some(Boolean)) return
    setSubmitting(true)
    setError(undefined)
    try {
      await portalApi.createNotice({
        title: form.title.trim(),
        summary: form.summary.trim(),
        body: form.body.trim() || undefined,
        important: form.important,
        url: form.url.trim() || undefined,
      })
      onClose()
    } catch {
      setError(t.compose.error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ComposeModal
      open={open}
      onClose={onClose}
      eyebrow={c.eyebrow}
      title={c.title}
      description={c.description}
      asideTitle={c.list}
      asideHint={c.listHint}
      aside={
        items.length ? (
          <ul className="space-y-0.5">
            {items.map((n) => (
              <DeletableItem key={n.id} title={n.title} onDelete={() => portalApi.deleteNotice(n.id)}>
                <span className="flex items-center gap-2">
                  {n.important && <span className="flex-none rounded-md bg-danger-fill px-1.5 py-px text-xs font-bold text-white">{t.home.notice.important}</span>}
                  <span className="min-w-0 truncate text-[15px] font-semibold">{n.title}</span>
                </span>
                <span className="mt-0.5 block text-[13px] text-muted">{shortDate(n.date, lang)}</span>
              </DeletableItem>
            ))}
          </ul>
        ) : (
          <p className="px-2 text-sm text-muted">{c.listEmpty}</p>
        )
      }
      onSubmit={submit}
      submitting={submitting}
      error={error}
    >
      <Field label={c.subject} required error={shown(errors.title)}>
        <input
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder={c.subjectPlaceholder}
          aria-invalid={!!shown(errors.title)}
          className={controlClass}
        />
      </Field>

      <Field label={c.summary} required hint={c.summaryHint} error={shown(errors.summary)}>
        <input
          value={form.summary}
          onChange={(e) => set('summary', e.target.value)}
          placeholder={c.summaryPlaceholder}
          aria-invalid={!!shown(errors.summary)}
          className={controlClass}
        />
      </Field>

      <Field label={c.body}>
        <textarea
          value={form.body}
          onChange={(e) => set('body', e.target.value)}
          placeholder={c.bodyPlaceholder}
          rows={6}
          className={`${controlClass} min-h-32 resize-y leading-relaxed`}
        />
      </Field>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-subtle p-3.5 ring-1 ring-line transition-colors hover:bg-raised">
        <input
          type="checkbox"
          checked={form.important}
          onChange={(e) => set('important', e.target.checked)}
          className="mt-0.5 size-5 flex-none cursor-pointer accent-[var(--color-danger-fill)]"
        />
        <span>
          <span className="block text-[15px] font-semibold">{c.important}</span>
          <span className="mt-0.5 block text-[13px] text-muted">{c.importantHint}</span>
        </span>
      </label>

      <Field label={c.url} hint={c.urlHint}>
        <input type="url" value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://" className={controlClass} />
      </Field>
    </ComposeModal>
  )
}
