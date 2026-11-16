import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n'
import { shortDate } from '../../lib/format'
import { useCreateNotice, useDeleteNotice } from '../../queries/dashboard'
import type { Notice } from '../../types/portal'
import { Field, controlClass } from '../ui/Field'
import { ComposeModal, DeletableItem, isHttpUrl, useSubmitError } from './ComposeModal'

/** 서버 한도 (명세 2.2) — 넘기면 서버가 400 으로 거절하므로 칸에서 먼저 막는다 */
const MAX = { title: 100, summary: 150, body: 5000, url: 500 }

const blank = () => ({ title: '', summary: '', body: '', important: false, url: '' })

interface NoticeComposerProps {
  open: boolean
  onClose: () => void
  /** 이미 올라온 공지 — 왼쪽 목록 */
  items: Notice[]
}

/** 전사 공지 작성 (notice:write · admin). 날짜는 등록한 날로 붙는다 */
export function NoticeComposer({ open, onClose, items }: NoticeComposerProps) {
  const { t, lang } = useI18n()
  const c = t.compose.notice
  const [form, setForm] = useState(blank)
  // 한 번 등록을 눌러 본 뒤에만 빠진 칸을 빨갛게
  const [tried, setTried] = useState(false)
  const create = useCreateNotice()
  const remove = useDeleteNotice()
  const submitError = useSubmitError()

  // 열 때마다 빈 폼으로
  useEffect(() => {
    if (!open) return
    setForm(blank())
    setTried(false)
    submitError.reset()
  }, [open])

  const set = <K extends keyof ReturnType<typeof blank>>(key: K, value: ReturnType<typeof blank>[K]) => setForm((f) => ({ ...f, [key]: value }))
  const errors = {
    title: form.title.trim() ? undefined : t.compose.required,
    summary: form.summary.trim() ? undefined : t.compose.required,
    body: form.body.trim() ? undefined : t.compose.required,
    url: !form.url.trim() || isHttpUrl(form.url.trim()) ? undefined : t.compose.urlInvalid,
  }
  // 칸 검사를 지나 서버가 거절한 칸이 있으면 그 칸 아래에 서버 문구를
  const shown = (key: keyof typeof errors) => (tried ? errors[key] : undefined) ?? submitError.field(key)

  const submit = async () => {
    setTried(true)
    if (Object.values(errors).some(Boolean)) return
    submitError.reset()
    try {
      await create.mutateAsync({
        title: form.title.trim(),
        summary: form.summary.trim(),
        // 본문은 줄바꿈 · 앞뒤 공백을 그대로 저장한다 (명세 2.2)
        body: form.body,
        important: form.important,
        url: form.url.trim() || null,
      })
      onClose()
    } catch (e) {
      submitError.set(e)
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
              <DeletableItem key={n.id} title={n.title} onDelete={() => remove.mutateAsync(n.id)}>
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
      submitting={create.isPending}
      error={submitError.message}
    >
      <Field label={c.subject} required error={shown('title')}>
        <input
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder={c.subjectPlaceholder}
          maxLength={MAX.title}
          aria-invalid={!!shown('title')}
          className={controlClass}
        />
      </Field>

      <Field label={c.summary} required hint={c.summaryHint} error={shown('summary')}>
        <input
          value={form.summary}
          onChange={(e) => set('summary', e.target.value)}
          placeholder={c.summaryPlaceholder}
          maxLength={MAX.summary}
          aria-invalid={!!shown('summary')}
          className={controlClass}
        />
      </Field>

      <Field label={c.body} required error={shown('body')}>
        <textarea
          value={form.body}
          onChange={(e) => set('body', e.target.value)}
          placeholder={c.bodyPlaceholder}
          maxLength={MAX.body}
          aria-invalid={!!shown('body')}
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

      <Field label={c.url} hint={c.urlHint} error={shown('url')}>
        <input
          type="url"
          value={form.url}
          onChange={(e) => set('url', e.target.value)}
          placeholder="https://"
          maxLength={MAX.url}
          aria-invalid={!!shown('url')}
          className={controlClass}
        />
      </Field>
    </ComposeModal>
  )
}
