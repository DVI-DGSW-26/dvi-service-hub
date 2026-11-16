import { Globe } from 'lucide-react'
import { useEffect, useState } from 'react'
import { services } from '../../../services'
import { portalApi } from '../../api/portal'
import { useI18n } from '../../i18n'
import { toIso } from '../../lib/calendar'
import type { Maintenance, MaintenanceKind } from '../../types/portal'
import { ServiceLogo } from '../services/ServiceCard'
import { Badge } from '../ui/Badge'
import { DatePicker } from '../ui/DatePicker'
import { Field, controlClass } from '../ui/Field'
import { Segmented } from '../ui/Segmented'
import { Select, type SelectOption } from '../ui/Select'
import { TimePicker } from '../ui/TimePicker'
import { ComposeModal, DeletableItem } from './ComposeModal'
import { MAINTENANCE_TONE } from './MaintenancePanel'

const KINDS: MaintenanceKind[] = ['점검', '안내', '장애']
/** 대상 시스템 '기타' — 주소를 직접 적는다 */
const OTHER = ''

const blank = () => ({ kind: '점검' as MaintenanceKind, serviceId: services[0].id, title: '', body: '', date: toIso(new Date()), start: '', end: '', url: '' })
const host = (url: string) => new URL(url).host

interface MaintenanceComposerProps {
  open: boolean
  onClose: () => void
  /** 이미 올라온 안내 — 왼쪽 목록 */
  items: Maintenance[]
}

/**
 * 시스템 점검 · 안내 작성. 대상 시스템을 고르면 그 서비스 주소가 링크가 되고, '기타' 면 주소를 직접 적는다.
 * 일정 문구('11.16 (일) 02:00 ~ 06:00')는 날짜 · 시각으로 받아 만든다 — 사람마다 다르게 적지 않게.
 */
export function MaintenanceComposer({ open, onClose, items }: MaintenanceComposerProps) {
  const { t } = useI18n()
  const c = t.compose.maintenance
  const [form, setForm] = useState(blank)
  // 한 번 등록을 눌러 본 뒤에만 빠진 칸을 빨갛게 — 열자마자 혼내지 않는다
  const [tried, setTried] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  // 시각 칸에 읽을 수 없는 글을 적어 둔 상태
  const [badStart, setBadStart] = useState(false)
  const [badEnd, setBadEnd] = useState(false)
  // 열 때마다 늘려 시각 칸을 새로 그린다 — 적다 만 글이 남지 않게
  const [round, setRound] = useState(0)

  // 열 때마다 빈 폼으로
  useEffect(() => {
    if (!open) return
    setForm(blank())
    setTried(false)
    setError(undefined)
    setRound((r) => r + 1)
  }, [open])

  const set = <K extends keyof ReturnType<typeof blank>>(key: K, value: ReturnType<typeof blank>[K]) => setForm((f) => ({ ...f, [key]: value }))
  const service = services.find((s) => s.id === form.serviceId)
  const serviceOptions: SelectOption<string>[] = [
    ...services.map((s) => ({ value: s.id, label: s.name, description: host(s.links[0].url), icon: <ServiceLogo service={s} size="sm" /> })),
    {
      value: OTHER,
      label: c.serviceOther,
      icon: (
        <span className="grid size-7 flex-none place-items-center rounded-lg bg-accent-soft text-accent">
          <Globe className="size-4" aria-hidden="true" />
        </span>
      ),
    },
  ]
  // 시각을 못 읽었으면 등록을 누르기 전이라도 바로 알려 준다
  const timeErrors = { start: badStart ? c.timeInvalid : undefined, end: badEnd ? c.timeInvalid : undefined }
  const errors = {
    title: form.title.trim() ? undefined : t.compose.required,
    date: form.date ? undefined : t.compose.required,
    end: form.start && form.end && form.end <= form.start ? c.endBeforeStart : undefined,
  }
  const shown = (e?: string) => (tried ? e : undefined)

  const submit = async () => {
    setTried(true)
    if (badStart || badEnd || Object.values(errors).some(Boolean)) return
    setSubmitting(true)
    setError(undefined)
    try {
      await portalApi.createMaintenance({
        kind: form.kind,
        title: form.title.trim(),
        body: form.body.trim() || undefined,
        date: form.date,
        start: form.start || undefined,
        // 시작 없이 끝만 적었으면 버린다
        end: form.start && form.end ? form.end : undefined,
        url: service ? service.links[0].url : form.url.trim() || undefined,
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
            {items.map((m) => (
              <DeletableItem key={m.id} title={m.title} onDelete={() => portalApi.deleteMaintenance(m.id)}>
                <span className="flex items-start gap-2.5">
                  <Badge tone={MAINTENANCE_TONE[m.kind]}>{t.home.maintenance.kind[m.kind]}</Badge>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold break-keep">{m.title}</span>
                    <span className="mt-0.5 block text-[13px] text-muted">{m.when}</span>
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
        <Segmented<MaintenanceKind>
          label={c.kind}
          value={form.kind}
          onChange={(v) => set('kind', v)}
          options={KINDS.map((k) => ({ value: k, label: t.home.maintenance.kind[k] }))}
        />
      </Field>

      <Field label={c.service} group>
        <Select value={form.serviceId} onChange={(v) => set('serviceId', v)} options={serviceOptions} label={c.service} />
      </Field>

      {!service && (
        <Field label={c.url} hint={c.urlHint}>
          <input type="url" value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://" className={controlClass} />
        </Field>
      )}

      <Field label={c.subject} required error={shown(errors.title)}>
        <input
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder={c.subjectPlaceholder}
          aria-invalid={!!shown(errors.title)}
          className={controlClass}
        />
      </Field>

      <div key={round} className="grid gap-4 sm:grid-cols-[1.4fr_1fr_1fr]">
        <Field label={c.date} required error={shown(errors.date)} group>
          <DatePicker value={form.date} onChange={(v) => set('date', v)} label={c.date} invalid={!!shown(errors.date)} />
        </Field>
        <Field label={c.start} error={timeErrors.start} group>
          <TimePicker value={form.start} onChange={(v) => set('start', v)} onInvalidChange={setBadStart} label={c.start} clearable />
        </Field>
        <Field label={c.end} error={timeErrors.end ?? shown(errors.end)} group>
          <TimePicker value={form.end} onChange={(v) => set('end', v)} onInvalidChange={setBadEnd} label={c.end} invalid={!!shown(errors.end)} clearable />
        </Field>
      </div>
      <p className="-mt-2 text-[13px] text-muted">{c.timeHint}</p>

      <Field label={c.body}>
        <textarea
          value={form.body}
          onChange={(e) => set('body', e.target.value)}
          placeholder={c.bodyPlaceholder}
          rows={4}
          className={`${controlClass} min-h-24 resize-y leading-relaxed`}
        />
      </Field>
    </ComposeModal>
  )
}
