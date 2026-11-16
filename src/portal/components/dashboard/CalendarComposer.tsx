import { useEffect, useState } from 'react'
import { portalApi } from '../../api/portal'
import { useMonthEvents } from '../../hooks/useMonthEvents'
import { useI18n } from '../../i18n'
import { fromIso, monthKey, monthOf, monthTitle } from '../../lib/calendar'
import { shortDate } from '../../lib/format'
import type { CalendarKind } from '../../types/portal'
import { DatePicker } from '../ui/DatePicker'
import { Field, controlClass } from '../ui/Field'
import { Segmented } from '../ui/Segmented'
import { ComposeModal, DeletableItem } from './ComposeModal'
import { KindIcon, useEventLabel } from './MonthGrid'

const KINDS: CalendarKind[] = ['event', 'birthday']
const blank = (date: string) => ({ kind: 'event' as CalendarKind, title: '', date, end: '', place: '', department: '' })

interface CalendarComposerProps {
  open: boolean
  onClose: () => void
  /** 처음 고를 날짜 — 크게 보기에서 고른 날 */
  date: string
}

/**
 * 회사 캘린더 직접 등록. 행사는 날짜(여러 날이면 끝나는 날까지) · 장소, 생일은 이름 · 부서 · 날짜.
 * 왼쪽에는 고른 날짜가 있는 달의 일정을 보여줘 겹치는지 보고, 잘못 올린 것은 지운다.
 */
export function CalendarComposer({ open, onClose, date }: CalendarComposerProps) {
  const { t, f, locale, lang } = useI18n()
  const c = t.compose.calendar
  const label = useEventLabel()
  const [form, setForm] = useState(() => blank(date))
  const [tried, setTried] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const month = monthOf(fromIso(form.date || date))
  const { data } = useMonthEvents(monthKey(month))
  const events = data ?? []

  // 열 때마다 빈 폼으로 — 날짜는 고른 날
  useEffect(() => {
    if (!open) return
    setForm(blank(date))
    setTried(false)
    setError(undefined)
  }, [open, date])

  const set = <K extends keyof ReturnType<typeof blank>>(key: K, value: ReturnType<typeof blank>[K]) => setForm((x) => ({ ...x, [key]: value }))
  const birthday = form.kind === 'birthday'
  const errors = {
    title: form.title.trim() ? undefined : t.compose.required,
    date: form.date ? undefined : t.compose.required,
    end: !birthday && form.end && form.end < form.date ? c.endBeforeStart : undefined,
  }
  const shown = (e?: string) => (tried ? e : undefined)

  const submit = async () => {
    setTried(true)
    if (Object.values(errors).some(Boolean)) return
    setSubmitting(true)
    setError(undefined)
    try {
      await portalApi.createCalendarEvent(
        birthday
          ? { kind: 'birthday', title: form.title.trim(), date: form.date, department: form.department.trim() || undefined }
          : {
              kind: 'event',
              title: form.title.trim(),
              date: form.date,
              // 같은 날을 끝나는 날로 고르면 하루 행사
              end: form.end && form.end !== form.date ? form.end : undefined,
              place: form.place.trim() || undefined,
            },
      )
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
      asideTitle={f(c.list, { month: monthTitle(month, locale) })}
      asideHint={c.listHint}
      aside={
        events.length ? (
          <ul className="space-y-0.5">
            {events.map((e) => (
              <DeletableItem key={e.id} title={label(e)} onDelete={() => portalApi.deleteCalendarEvent(e.id)}>
                <span className="flex items-start gap-2.5">
                  <KindIcon kind={e.kind} className="mt-0.5 size-4 flex-none" />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold break-keep">{label(e)}</span>
                    <span className="mt-0.5 block text-[13px] text-muted">
                      {[shortDate(e.date, lang), e.place ?? e.department].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </span>
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
      <Field label={c.kind} group>
        <Segmented<CalendarKind>
          label={c.kind}
          value={form.kind}
          onChange={(v) => set('kind', v)}
          options={KINDS.map((k) => ({ value: k, label: t.calendar.kind[k] }))}
        />
      </Field>

      <Field label={birthday ? c.name : c.eventTitle} required error={shown(errors.title)}>
        <input
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder={birthday ? c.namePlaceholder : c.eventPlaceholder}
          aria-invalid={!!shown(errors.title)}
          className={controlClass}
        />
      </Field>

      {birthday ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={c.date} required error={shown(errors.date)} group>
              <DatePicker value={form.date} onChange={(v) => set('date', v)} label={c.date} invalid={!!shown(errors.date)} />
            </Field>
            <Field label={c.department}>
              <input value={form.department} onChange={(e) => set('department', e.target.value)} placeholder={c.departmentPlaceholder} className={controlClass} />
            </Field>
          </div>
          <p className="-mt-2 text-[13px] text-muted">{c.birthdayHint}</p>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={c.date} required error={shown(errors.date)} group>
              <DatePicker value={form.date} onChange={(v) => set('date', v)} label={c.date} invalid={!!shown(errors.date)} />
            </Field>
            <Field label={c.end} hint={c.endHint} error={shown(errors.end)} group>
              <DatePicker value={form.end} onChange={(v) => set('end', v)} label={c.end} invalid={!!shown(errors.end)} clearable />
            </Field>
          </div>
          <Field label={c.place}>
            <input value={form.place} onChange={(e) => set('place', e.target.value)} placeholder={c.placePlaceholder} className={controlClass} />
          </Field>
        </>
      )}
    </ComposeModal>
  )
}
