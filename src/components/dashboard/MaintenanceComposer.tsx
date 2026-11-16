import { useQuery } from '@tanstack/react-query'
import { Globe } from 'lucide-react'
import { useEffect, useState } from 'react'
import { services as bundledServices } from '../../services'
import { useI18n } from '../../i18n'
import { toIso } from '../../lib/calendar'
import { useCreateMaintenance, useDeleteMaintenance } from '../../queries/dashboard'
import { serviceQueries } from '../../queries/hub'
import type { Maintenance, MaintenanceKind } from '../../types/portal'
import { ServiceLogo } from '../services/ServiceCard'
import { Badge } from '../ui/Badge'
import { DatePicker } from '../ui/DatePicker'
import { Field, controlClass } from '../ui/Field'
import { Segmented } from '../ui/Segmented'
import { Select, type SelectOption } from '../ui/Select'
import { TimePicker } from '../ui/TimePicker'
import { ComposeModal, DeletableItem, isHttpUrl, useSubmitError } from './ComposeModal'
import { MAINTENANCE_TONE, maintenanceWhen } from './MaintenancePanel'

const KINDS: MaintenanceKind[] = ['MAINTENANCE', 'NOTICE', 'INCIDENT']
/** 서버 한도 (명세 3.2) */
const MAX = { title: 100, body: 2000, url: 500 }
/** 대상 시스템 '기타' — 주소를 직접 적는다 */
const OTHER = ''

const blank = (serviceId: string) => ({ kind: 'MAINTENANCE' as MaintenanceKind, serviceId, title: '', body: '', date: toIso(new Date()), start: '', end: '', url: '' })
const host = (url: string) => new URL(url).host

interface MaintenanceComposerProps {
  open: boolean
  onClose: () => void
  /** 이미 올라온 안내 — 왼쪽 목록 */
  items: Maintenance[]
}

/**
 * 시스템 점검 · 안내 작성. 대상 시스템을 고르면 서버가 그 서비스 주소를 링크로 붙이고, '기타' 면 주소를 직접 적는다.
 * 일정은 날짜 · 시각으로 따로 받는다 — 문구('11.16 (일) 02:00 ~ 06:00')는 화면이 만든다.
 */
export function MaintenanceComposer({ open, onClose, items }: MaintenanceComposerProps) {
  const { t, lang } = useI18n()
  const c = t.compose.maintenance
  // serviceId 는 서버 목록의 id 와 글자 그대로 같아야 한다 (명세 3.2) — 서버 목록을 쓰고, 못 받으면 내장 목록
  const serverServices = useQuery(serviceQueries.list())
  const services = serverServices.data ?? bundledServices
  const firstId = services[0]?.id ?? OTHER
  const [form, setForm] = useState(() => blank(firstId))
  // 한 번 등록을 눌러 본 뒤에만 빠진 칸을 빨갛게 — 열자마자 혼내지 않는다
  const [tried, setTried] = useState(false)
  const create = useCreateMaintenance()
  const remove = useDeleteMaintenance()
  const submitError = useSubmitError()
  // 시각 칸에 읽을 수 없는 글을 적어 둔 상태
  const [badStart, setBadStart] = useState(false)
  const [badEnd, setBadEnd] = useState(false)
  // 열 때마다 늘려 시각 칸을 새로 그린다 — 적다 만 글이 남지 않게
  const [round, setRound] = useState(0)

  // 열 때마다 빈 폼으로
  useEffect(() => {
    if (!open) return
    setForm(blank(firstId))
    setTried(false)
    submitError.reset()
    setRound((r) => r + 1)
  }, [open])

  // 창을 연 뒤에 서버 목록이 와서 고른 시스템이 목록에 없으면 첫 시스템으로
  useEffect(() => {
    setForm((f) => (f.serviceId === OTHER || services.some((s) => s.id === f.serviceId) ? f : { ...f, serviceId: firstId }))
  }, [services, firstId])

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
  const errors: Partial<Record<string, string>> = {
    title: form.title.trim() ? undefined : t.compose.required,
    date: form.date ? undefined : t.compose.required,
    // 같은 시각은 받는다 (명세 3.2)
    end: form.start && form.end && form.end < form.start ? c.endBeforeStart : undefined,
    body: form.body.trim() ? undefined : t.compose.required,
    url: service || !form.url.trim() || isHttpUrl(form.url.trim()) ? undefined : t.compose.urlInvalid,
  }
  // 칸 검사를 지나 서버가 거절한 칸이 있으면(field) 그 칸 아래에 서버 문구를
  const shown = (key: string) => (tried ? errors[key] : undefined) ?? submitError.field(key)

  const submit = async () => {
    setTried(true)
    if (badStart || badEnd || Object.values(errors).some(Boolean)) return
    submitError.reset()
    try {
      await create.mutateAsync({
        kind: form.kind,
        serviceId: service?.id ?? null,
        title: form.title.trim(),
        // 본문은 줄바꿈 그대로 저장한다
        body: form.body,
        date: form.date,
        start: form.start || null,
        // 시작 없이 끝만 적었으면 버린다 — 서버는 그 경우를 거절한다
        end: form.start && form.end ? form.end : null,
        // 대상 시스템을 골랐으면 서버가 그 주소를 붙인다. '기타' 일 때만 보낸다
        url: service ? null : form.url.trim() || null,
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
            {items.map((m) => (
              <DeletableItem key={m.id} title={m.title} onDelete={() => remove.mutateAsync(m.id)}>
                <span className="flex items-start gap-2.5">
                  <Badge tone={MAINTENANCE_TONE[m.kind]}>{t.home.maintenance.kind[m.kind]}</Badge>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold break-keep">{m.title}</span>
                    <span className="mt-0.5 block text-[13px] text-muted">{maintenanceWhen(m, lang)}</span>
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
      submitting={create.isPending}
      error={submitError.message}
    >
      <Field label={c.kind} group>
        <Segmented<MaintenanceKind>
          label={c.kind}
          value={form.kind}
          onChange={(v) => set('kind', v)}
          options={KINDS.map((k) => ({ value: k, label: t.home.maintenance.kind[k] }))}
        />
      </Field>

      <Field label={c.service} error={shown('serviceId')} group>
        <Select value={form.serviceId} onChange={(v) => set('serviceId', v)} options={serviceOptions} label={c.service} />
      </Field>

      {!service && (
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
      )}

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

      <div key={round} className="grid gap-4 sm:grid-cols-[1.4fr_1fr_1fr]">
        <Field label={c.date} required error={shown('date')} group>
          <DatePicker value={form.date} onChange={(v) => set('date', v)} label={c.date} invalid={!!shown('date')} />
        </Field>
        <Field label={c.start} error={timeErrors.start ?? shown('start')} group>
          <TimePicker value={form.start} onChange={(v) => set('start', v)} onInvalidChange={setBadStart} label={c.start} clearable />
        </Field>
        <Field label={c.end} error={timeErrors.end ?? shown('end')} group>
          <TimePicker value={form.end} onChange={(v) => set('end', v)} onInvalidChange={setBadEnd} label={c.end} invalid={!!shown('end')} clearable />
        </Field>
      </div>
      <p className="-mt-2 text-[13px] text-muted">{c.timeHint}</p>

      <Field label={c.body} required error={shown('body')}>
        <textarea
          value={form.body}
          onChange={(e) => set('body', e.target.value)}
          placeholder={c.bodyPlaceholder}
          maxLength={MAX.body}
          aria-invalid={!!shown('body')}
          rows={4}
          className={`${controlClass} min-h-24 resize-y leading-relaxed`}
        />
      </Field>
    </ComposeModal>
  )
}
