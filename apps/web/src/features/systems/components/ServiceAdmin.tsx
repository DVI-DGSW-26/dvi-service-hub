import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useI18n } from '@/shared/i18n'
import { alreadyGone } from '@/shared/api'
import { Badge, ComposeModal, DeletableItem, Field, LoadError, Segmented, Select, SkeletonList, TextField, controlClass, isHttpUrl, useComposeForm } from '@/shared/ui'
import type { AdminService, ServiceInput } from '../api/hub'
import { serviceQueries, useCreateService, useDeleteService, useReorderServices, useUpdateService } from '../api/queries'
import type { Access, AuthMode, Category } from '../lib/services'
import { ServiceLogo } from './ServiceCard'

const CATEGORIES: Category[] = ['업무', '인사', '정보', '사내문화']
const AUTHS: AuthMode[] = ['sso', 'separate', 'none']
const ACCESS: Access['type'][] = ['employee', 'client', 'any', 'public']
/** 서버 한도 (feat/flow-posts 의 서비스 관리와 같다) */
const MAX = { id: 50, name: 100, description: 500, label: 30, url: 500, client: 100, emoji: 16, logo: 300, links: 5 }
const ID = /^[a-z0-9][a-z0-9-]{0,49}$/
const LOGO = /^(\/[^/\s]\S*|https:\/\/\S+)$/

/** 입력 칸은 글자로 들고 있다가 보낼 때 서버 모양으로 바꾼다 */
interface Draft {
  id: string
  name: string
  description: string
  category: string
  links: { label: string; url: string }[]
  auth: AuthMode
  access: Access['type']
  client: string
  role: string
  logo: string
  emoji: string
  inDevelopment: boolean
  right: boolean
  offset: string
  hidden: boolean
}

const blank = (): Draft => ({
  id: '',
  name: '',
  description: '',
  category: '업무',
  links: [{ label: '열기', url: 'https://' }],
  auth: 'sso',
  access: 'employee',
  client: '',
  role: 'user',
  logo: '',
  emoji: '🔗',
  inDevelopment: false,
  right: false,
  offset: '',
  hidden: false,
})

const toDraft = (s: AdminService): Draft => ({
  id: s.id,
  name: s.name,
  description: s.description,
  category: s.category,
  links: s.links.map((l) => ({ ...l })),
  auth: s.auth,
  access: s.access.type,
  client: s.access.type === 'client' ? s.access.client : '',
  role: s.access.type === 'client' ? s.access.role : 'user',
  logo: s.logo ?? '',
  emoji: s.emoji,
  inDevelopment: s.inDevelopment ?? false,
  right: s.switcher?.position === 'right',
  offset: s.switcher?.offset != null ? String(s.switcher.offset) : '',
  hidden: !s.enabled,
})

function toInput(d: Draft): ServiceInput {
  const offset = d.offset.trim() === '' ? null : Number(d.offset)
  const position = d.right ? 'right' : null
  return {
    id: d.id.trim(),
    name: d.name.trim(),
    description: d.description.trim(),
    category: d.category as Category,
    links: d.links.map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
    auth: d.auth,
    access: d.access === 'client' ? { type: 'client', client: d.client.trim(), role: d.role.trim() } : { type: d.access },
    logo: d.logo.trim() || null,
    emoji: d.emoji.trim(),
    inDevelopment: d.inDevelopment,
    switcher: position === null && offset === null ? null : { position, offset },
    enabled: !d.hidden,
  }
}

/**
 * 서비스 관리 — 허브에 보이는 서비스 목록을 고친다(admin 만, 서버가 막는다). 왼쪽 목록에서 고르면 오른쪽에서 고치고, 순서는 목록의 위아래 버튼으로.
 * 저장하면 허브 화면과 모든 서비스의 '서비스 이동' 메뉴에 바로 반영된다 — 전에는 services.ts 를 고쳐 배포해야 했다.
 */
export function ServiceAdmin({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, f } = useI18n()
  const a = t.systems.admin
  const list = useQuery({ ...serviceQueries.admin(), enabled: open })
  const services = list.data ?? []
  const compose = useComposeForm(blank)
  const { form, set, error, shown } = compose
  const create = useCreateService()
  const update = useUpdateService()
  const remove = useDeleteService()
  const reorder = useReorderServices()
  // 고치는 서비스 — 없으면 새로 등록
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = services.find((s) => s.id === editingId)
  const pick = (s: AdminService | null) => {
    setEditingId(s?.id ?? null)
    compose.reset(s ? toDraft(s) : blank())
  }

  const errors: Partial<Record<string, string>> = {
    name: form.name.trim() ? undefined : t.compose.required,
    id: editing ? undefined : !form.id.trim() ? t.compose.required : ID.test(form.id.trim()) ? undefined : a.idInvalid,
    emoji: form.emoji.trim() ? undefined : t.compose.required,
    logo: !form.logo.trim() || LOGO.test(form.logo.trim()) ? undefined : a.logoInvalid,
    client: form.access === 'client' && !form.client.trim() ? t.compose.required : undefined,
    role: form.access === 'client' && !form.role.trim() ? t.compose.required : undefined,
    offset: form.offset.trim() === '' || (/^\d+$/.test(form.offset.trim()) && Number(form.offset) <= 400) ? undefined : a.offsetInvalid,
    links: form.links.every((l) => l.label.trim() && isHttpUrl(l.url.trim())) ? undefined : a.linksInvalid,
  }
  const err = (key: string) => shown(errors, key)

  const onSubmit = () =>
    void compose.submit(Object.values(errors).some(Boolean), async () => {
      const input = toInput(form)
      const saved = editing ? await update.mutateAsync({ id: editing.id, input }) : await create.mutateAsync(input)
      // 등록한 뒤에는 그 서비스를 고치는 화면으로 — 이어서 손볼 수 있게
      pick(saved)
    })

  const move = (i: number, delta: -1 | 1) => {
    const ids = services.map((s) => s.id)
    ;[ids[i], ids[i + delta]] = [ids[i + delta], ids[i]]
    reorder.mutate(ids)
  }

  return (
    <ComposeModal
      open={open}
      onClose={onClose}
      eyebrow={a.eyebrow}
      title={editing ? f(a.titleEdit, { name: editing.name }) : a.titleNew}
      description={a.description}
      asideTitle={a.list}
      asideHint={a.listHint}
      aside={
        <>
          <button
            type="button"
            onClick={() => pick(null)}
            aria-pressed={!editing}
            className={`mb-1 flex w-full cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-[15px] font-semibold transition-colors ${editing ? 'text-accent hover:bg-subtle' : 'bg-accent-soft text-accent'}`}
          >
            <Plus className="size-4" aria-hidden="true" />
            {a.add}
          </button>
          {list.isPending ? (
            <SkeletonList rows={4} className="h-12" />
          ) : list.error ? (
            <LoadError error={list.error} className="px-2 text-sm" />
          ) : (
            <ul className="space-y-0.5">
              {services.map((s, i) => (
                <DeletableItem key={s.id} title={s.name} onDelete={() => remove.mutateAsync(s.id).catch(alreadyGone).then(() => { if (editing?.id === s.id) pick(null) })}>
                  <span className="flex items-center gap-2">
                    <span className="flex flex-none flex-col">
                      <OrderButton label={f(a.up, { name: s.name })} disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)}>
                        <ChevronUp className="size-4" aria-hidden="true" />
                      </OrderButton>
                      <OrderButton label={f(a.down, { name: s.name })} disabled={i === services.length - 1 || reorder.isPending} onClick={() => move(i, 1)}>
                        <ChevronDown className="size-4" aria-hidden="true" />
                      </OrderButton>
                    </span>
                    <button
                      type="button"
                      onClick={() => pick(s)}
                      aria-pressed={editing?.id === s.id}
                      className={`flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg p-1 text-left ${editing?.id === s.id ? 'text-accent' : ''} ${s.enabled ? '' : 'opacity-60'}`}
                    >
                      <ServiceLogo service={s} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">{s.name}</span>
                        <span className="block truncate text-[13px] text-muted">{s.id}</span>
                      </span>
                      {!s.enabled && <Badge tone="neutral">{a.hidden}</Badge>}
                    </button>
                  </span>
                </DeletableItem>
              ))}
            </ul>
          )}
        </>
      }
      onSubmit={onSubmit}
      submitting={create.isPending || update.isPending}
      submitLabel={editing ? a.save : undefined}
      error={error}
    >
      <Fields form={form} set={set} err={err} editing={!!editing} />
    </ComposeModal>
  )
}

interface FieldsProps {
  form: Draft
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void
  err: (key: string) => string | undefined
  /** 고치는 중이면 id 를 못 바꾼다 */
  editing: boolean
}

/** 오른쪽 폼 칸 — 등록 · 고치기가 같다 */
function Fields({ form, set, err, editing }: FieldsProps) {
  const { t } = useI18n()
  const a = t.systems.admin
  const setLink = (i: number, key: 'label' | 'url', value: string) => set('links', form.links.map((l, x) => (x === i ? { ...l, [key]: value } : l)))
  return (
    <>
      <div className="grid gap-4 @lg:grid-cols-2">
        <TextField label={a.name} required error={err('name')} value={form.name} onChange={(v) => set('name', v)} max={MAX.name} />
        {editing ? (
          <Field label={a.id} hint={a.idLocked}>
            <input value={form.id} readOnly className={`${controlClass} text-muted`} />
          </Field>
        ) : (
          <TextField label={a.id} required hint={a.idHint} error={err('id')} value={form.id} onChange={(v) => set('id', v)} placeholder="honey-go" max={MAX.id} />
        )}
      </div>
      <TextField label={a.summary} value={form.description} onChange={(v) => set('description', v)} max={MAX.description} />

      <Field label={a.category} group>
        <Segmented<string> label={a.category} value={form.category} onChange={(v) => set('category', v)} options={CATEGORIES.map((c) => ({ value: c, label: t.systems.category[c] }))} />
      </Field>
      <Field label={a.auth} group>
        <Segmented<AuthMode> label={a.auth} value={form.auth} onChange={(v) => set('auth', v)} options={AUTHS.map((v) => ({ value: v, label: t.systems.auth[v] }))} />
      </Field>

      <Field label={a.links} required hint={a.linksHint} error={err('links')} group>
        <div className="space-y-2">
          {form.links.map((l, i) => (
            <div key={i} className="grid grid-cols-[7rem_minmax(0,1fr)_auto] gap-2">
              <input
                value={l.label}
                onChange={(e) => setLink(i, 'label', e.target.value)}
                maxLength={MAX.label}
                placeholder={a.linkLabel}
                aria-label={`${a.linkLabel} ${i + 1}`}
                className={controlClass}
              />
              <input
                type="url"
                value={l.url}
                onChange={(e) => setLink(i, 'url', e.target.value)}
                maxLength={MAX.url}
                placeholder="https://"
                aria-label={`${a.linkUrl} ${i + 1}`}
                className={controlClass}
              />
              {form.links.length > 1 && (
                <button type="button" onClick={() => set('links', form.links.filter((_, x) => x !== i))} className={SMALL_BUTTON}>
                  {a.linkRemove}
                </button>
              )}
            </div>
          ))}
          {form.links.length < MAX.links && (
            <button type="button" onClick={() => set('links', [...form.links, { label: '', url: 'https://' }])} className={SMALL_BUTTON}>
              {a.linkAdd}
            </button>
          )}
        </div>
      </Field>

      <Field label={a.access} hint={a.accessHint} group>
        <Select<Access['type']> label={a.access} value={form.access} onChange={(v) => set('access', v)} options={ACCESS.map((v) => ({ value: v, label: a.accessType[v] }))} />
      </Field>
      {form.access === 'client' && (
        <div className="grid gap-4 @lg:grid-cols-2">
          <TextField label={a.client} required error={err('client')} value={form.client} onChange={(v) => set('client', v)} placeholder="jagigo" max={MAX.client} />
          <TextField label={a.role} required error={err('role')} value={form.role} onChange={(v) => set('role', v)} placeholder="user" max={MAX.client} />
        </div>
      )}

      <div className="grid gap-4 @lg:grid-cols-2">
        <TextField label={a.emoji} required hint={a.emojiHint} error={err('emoji')} value={form.emoji} onChange={(v) => set('emoji', v)} max={MAX.emoji} />
        <TextField label={a.logo} hint={a.logoHint} error={err('logo')} value={form.logo} onChange={(v) => set('logo', v)} placeholder="/logos/name.png" max={MAX.logo} />
      </div>

      <div className="grid gap-4 @lg:grid-cols-2">
        <Field label={a.switcher} group>
          <Segmented<'left' | 'right'>
            label={a.switcher}
            value={form.right ? 'right' : 'left'}
            onChange={(v) => set('right', v === 'right')}
            options={[
              { value: 'left', label: a.switcherLeft },
              { value: 'right', label: a.switcherRight },
            ]}
          />
        </Field>
        <TextField label={a.offset} hint={a.offsetHint} error={err('offset')} value={form.offset} onChange={(v) => set('offset', v)} placeholder="20" max={3} />
      </div>

      <Check checked={form.inDevelopment} onChange={(v) => set('inDevelopment', v)} label={a.inDevelopment} />
      <Check checked={form.hidden} onChange={(v) => set('hidden', v)} label={a.hide} hint={a.hideHint} />
    </>
  )
}

const SMALL_BUTTON = 'flex-none cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-line transition-colors hover:bg-subtle'

function OrderButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="grid size-5 cursor-pointer place-items-center rounded text-muted hover:bg-raised hover:text-fg disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent">
      {children}
    </button>
  )
}

function Check({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-subtle p-3.5 ring-1 ring-line transition-colors hover:bg-raised">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-5 flex-none cursor-pointer accent-[var(--color-accent-fill)]" />
      <span>
        <span className="block text-[15px] font-semibold">{label}</span>
        {hint && <span className="mt-0.5 block text-[13px] text-muted">{hint}</span>}
      </span>
    </label>
  )
}
