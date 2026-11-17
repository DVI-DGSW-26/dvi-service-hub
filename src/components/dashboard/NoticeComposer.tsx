import { useI18n } from '../../i18n'
import { shortDate } from '../../lib/format'
import { useCreateNotice, useDeleteNotice } from '../../queries/dashboard'
import type { Notice } from '../../types/portal'
import { ComposeModal, DeletableItem, TextField, isHttpUrl, useComposeForm } from './ComposeModal'

/** 서버 한도 (명세 2.2) */
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
  const { form, set, error, shown, submit } = useComposeForm(blank)
  const create = useCreateNotice()
  const remove = useDeleteNotice()

  const errors = {
    title: form.title.trim() ? undefined : t.compose.required,
    summary: form.summary.trim() ? undefined : t.compose.required,
    body: form.body.trim() ? undefined : t.compose.required,
    url: !form.url.trim() || isHttpUrl(form.url.trim()) ? undefined : t.compose.urlInvalid,
  }
  const err = (key: keyof typeof errors) => shown(errors, key)

  const onSubmit = () =>
    submit(Object.values(errors).some(Boolean), async () => {
      await create.mutateAsync({
        title: form.title.trim(),
        summary: form.summary.trim(),
        // 본문은 줄바꿈 · 앞뒤 공백을 그대로 저장한다 (명세 2.2)
        body: form.body,
        important: form.important,
        url: form.url.trim() || null,
      })
      onClose()
    })

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
      onSubmit={onSubmit}
      submitting={create.isPending}
      error={error}
    >
      <TextField label={c.subject} required error={err('title')} value={form.title} onChange={(v) => set('title', v)} placeholder={c.subjectPlaceholder} max={MAX.title} />
      <TextField label={c.summary} required hint={c.summaryHint} error={err('summary')} value={form.summary} onChange={(v) => set('summary', v)} placeholder={c.summaryPlaceholder} max={MAX.summary} />
      <TextField label={c.body} required error={err('body')} value={form.body} onChange={(v) => set('body', v)} placeholder={c.bodyPlaceholder} max={MAX.body} rows={6} />

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

      <TextField label={c.url} hint={c.urlHint} error={err('url')} type="url" value={form.url} onChange={(v) => set('url', v)} placeholder="https://" max={MAX.url} />
    </ComposeModal>
  )
}
