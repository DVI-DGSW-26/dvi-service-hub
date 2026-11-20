import { useQuery } from '@tanstack/react-query'
import { Globe } from 'lucide-react'
import { useState } from 'react'
import { services as bundledServices, serviceQueries, ServiceLogo } from '@/features/systems'
import { useI18n } from '@/shared/i18n'
import { toIso } from '@/shared/lib'
import { useCreateMaintenance, useDeleteMaintenance } from '../api/queries'
import type { Maintenance, MaintenanceKind } from '@/shared/types'
import { Badge, DatePicker, Field, Segmented, TimePicker, ComposeModal, DeletableItem, TextField, isHttpUrl, useComposeForm } from '@/shared/ui'
import { Select, type SelectOption } from '@/shared/ui'
import { MAINTENANCE_TONE } from '../lib/constants'
import { maintenanceWhen } from '../lib/maintenanceWhen'

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
  const serverServices = useQuery({ ...serviceQueries.list(), enabled: open })
  const services = serverServices.data ?? bundledServices
  const firstId = services[0]?.id ?? OTHER
  const { form, set, error, shown, submit } = useComposeForm(() => blank(firstId))
  const create = useCreateMaintenance()
  const remove = useDeleteMaintenance()
  // 시각 칸에 읽을 수 없는 글을 적어 둔 상태
  const [badStart, setBadStart] = useState(false)
  const [badEnd, setBadEnd] = useState(false)

  // 창을 연 뒤에 서버 목록이 와서 고른 시스템이 목록에 없으면 첫 시스템으로
  const serviceId = form.serviceId === OTHER || services.some((s) => s.id === form.serviceId) ? form.serviceId : firstId
  const service = services.find((s) => s.id === serviceId)
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
  const err = (key: string) => shown(errors, key)

  const onSubmit = () =>
    submit(badStart || badEnd || Object.values(errors).some(Boolean), async () => {
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
      onSubmit={onSubmit}
      submitting={create.isPending}
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

      <Field label={c.service} error={err('serviceId')} group>
        <Select value={serviceId} onChange={(v) => set('serviceId', v)} options={serviceOptions} label={c.service} />
      </Field>

      {!service && (
        <TextField label={c.url} hint={c.urlHint} error={err('url')} type="url" value={form.url} onChange={(v) => set('url', v)} placeholder="https://" max={MAX.url} />
      )}

      <TextField label={c.subject} required error={err('title')} value={form.title} onChange={(v) => set('title', v)} placeholder={c.subjectPlaceholder} max={MAX.title} />

      <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr_1fr]">
        <Field label={c.date} required error={err('date')} group>
          <DatePicker value={form.date} onChange={(v) => set('date', v)} label={c.date} invalid={!!err('date')} />
        </Field>
        <Field label={c.start} error={timeErrors.start ?? err('start')} group>
          <TimePicker value={form.start} onChange={(v) => set('start', v)} onInvalidChange={setBadStart} label={c.start} clearable />
        </Field>
        <Field label={c.end} error={timeErrors.end ?? err('end')} group>
          <TimePicker value={form.end} onChange={(v) => set('end', v)} onInvalidChange={setBadEnd} label={c.end} invalid={!!err('end')} clearable />
        </Field>
      </div>
      <p className="-mt-2 text-[13px] text-muted">{c.timeHint}</p>

      <TextField label={c.body} required error={err('body')} value={form.body} onChange={(v) => set('body', v)} placeholder={c.bodyPlaceholder} max={MAX.body} rows={4} />
    </ComposeModal>
  )
}
