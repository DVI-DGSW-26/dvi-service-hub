import { useQuery } from '@tanstack/react-query'
import { Fingerprint, KeyRound, SmartphoneNfc, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { isApiError } from '@/shared/api'
import { useI18n } from '@/shared/i18n'
import {
  accountActionUrl,
  clearAccountActionResult,
  readAccountActionResult,
  type AccountAction,
} from '../lib/account'
import { dateTime } from '@/shared/format'
import { accountQueries } from '../api/queries'
import type { Credential } from '@dvi/core/types'
import { LoadError, Skeleton } from '@/shared/ui'

const OUTLINE =
  'inline-flex min-h-9 flex-none items-center rounded-xl px-3 text-sm font-semibold text-accent ring-1 ring-accent/60 transition-[background-color,scale] duration-150 hover:bg-accent-soft active:scale-[0.97]'
const DANGER =
  'inline-flex min-h-9 flex-none items-center rounded-xl bg-danger-fill px-3 text-sm font-semibold text-white transition-[filter,scale] duration-150 hover:brightness-110 active:scale-[0.97]'
/** 목록을 못 받았을 때의 안내 — 맨 위에 한 번, 내용 사이에 끼지 않게 */
const NOTE = 'rounded-2xl bg-subtle px-4 py-3 text-sm/relaxed text-muted'

/**
 * 로그인 수단 — 비밀번호 · OTP 앱 · 패스키를 보고, 바꾸기 · 등록 · 삭제는 통합 로그인(Keycloak) 화면으로 보낸다.
 * 기본 인증 · 2차 인증을 따로 묶은 목록(설정 앱처럼) — 수단마다 한 줄, 등록한 것은 그 아래 줄로.
 * 버튼은 지금도 동작한다(서버 API 불필요). 목록은 서버 API(docs/bd.md 3.1)가 생기기 전이라 운영에서는 비어 있고,
 * pnpm dev:mock 에서는 가짜 목록이 나온다.
 */
export function SignInMethods() {
  const { t } = useI18n()
  const c = t.account.signIn
  const query = useQuery(accountQueries.credentials())
  const data = query.data
  // 404 — 서버에 API 가 아직 없다. 목록 없이 변경 · 등록만
  const notYet = isApiError(query.error) && query.error.status === 404

  return (
    <div className="space-y-5">
      <ActionResult />

      {query.isError && (notYet ? <p className={NOTE}>{c.listPending}</p> : <LoadError error={query.error} className={NOTE} />)}

      <Group title={c.basic}>
        <MethodRow
          icon={KeyRound}
          title={c.password.title}
          description={c.password.description}
          action={
            <a href={accountActionUrl('UPDATE_PASSWORD')} className={OUTLINE}>
              {c.password.change}
            </a>
          }
        >
          {query.isPending ? <Skeleton className="mt-2 h-4 w-40 rounded-md" /> : data?.password && <Created credential={data.password} />}
        </MethodRow>
      </Group>

      <Group title={c.secondFactor}>
        <MethodRow
          icon={SmartphoneNfc}
          title={c.otp.title}
          description={c.otp.description}
          action={<a href={accountActionUrl('CONFIGURE_TOTP')} className={OUTLINE} aria-label={c.otp.add}>{c.register}</a>}
        />
        <CredentialList items={data?.otp} loading={query.isPending} fallbackLabel={c.otp.defaultLabel} empty={c.otp.empty} />
        <MethodRow
          icon={Fingerprint}
          title={c.passkey.title}
          description={c.passkey.description}
          action={<a href={accountActionUrl('webauthn-register-passwordless')} className={OUTLINE} aria-label={c.passkey.add}>{c.register}</a>}
        />
        <CredentialList items={data?.passkeys} loading={query.isPending} fallbackLabel={c.passkey.defaultLabel} empty={c.passkey.empty} />
      </Group>
    </div>
  )
}

/** 통합 로그인에서 돌아왔을 때 결과 한 줄 */
function ActionResult() {
  const { t } = useI18n()
  const r = t.account.signIn.result
  // 처음 그릴 때 한 번 읽고, 주소에서는 지운다 — 새로 고침하면 다시 뜨지 않는다
  const [result] = useState(readAccountActionResult)
  useEffect(clearAccountActionResult, [])
  if (!result) return null

  const message =
    result.status === 'cancelled' ? r.cancelled : result.status === 'error' ? r.error : (r[result.action as keyof typeof r] ?? r.done)
  const tone = result.status === 'success' ? 'bg-ok-soft text-ok' : result.status === 'error' ? 'bg-danger-soft text-danger' : 'bg-subtle text-muted'
  return (
    <p role="status" className={`rounded-2xl px-4 py-3 text-sm font-semibold ${tone}`}>
      {message}
    </p>
  )
}

/** 제목 아래 한 덩어리 목록 — 줄 사이는 가는 선 */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 px-1 text-[13px] font-semibold text-muted">{title}</h3>
      <div className="divide-y divide-line overflow-hidden rounded-2xl bg-subtle ring-1 ring-line">{children}</div>
    </section>
  )
}

function MethodRow({ icon: I, title, description, action, children }: { icon: LucideIcon; title: string; description: string; action: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span className="grid size-9 flex-none place-items-center rounded-xl bg-accent-soft text-accent">
        <I className="size-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="text-[15px] font-bold">{title}</h4>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
        {children}
      </div>
      {action}
    </div>
  )
}

/** 등록한 OTP · 패스키 — 수단 줄 아래, 아이콘 자리만큼 들여서 */
function CredentialList({ items, loading, fallbackLabel, empty }: { items?: Credential[]; loading: boolean; fallbackLabel: string; empty: string }) {
  const { t, f } = useI18n()
  if (loading) return <div className="py-3 pr-4 pl-16"><Skeleton className="h-10 rounded-xl" /></div>
  // 목록을 못 받았으면(서버 API 전) 아무것도 그리지 않는다 — 위에 안내가 한 번 나온다
  if (!items) return null
  if (items.length === 0) return <p className="py-3 pr-4 pl-16 text-sm text-muted">{empty}</p>
  return (
    <ul className="divide-y divide-line">
      {items.map((cr) => {
        const name = cr.label || fallbackLabel
        return (
          <li key={cr.id} className="flex items-center gap-3 py-3 pr-4 pl-16">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{name}</p>
              {cr.provider && <p className="truncate text-sm text-muted">{cr.provider}</p>}
              <Created credential={cr} />
            </div>
            <a href={accountActionUrl(`delete_credential:${cr.id}` satisfies AccountAction)} className={DANGER} aria-label={f(t.account.signIn.deleteLabel, { name })}>
              {t.account.signIn.delete}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

function Created({ credential }: { credential: Credential }) {
  const { t, lang } = useI18n()
  return (
    <p className="mt-1 text-sm text-muted">
      <span className="mr-2 font-semibold">{t.account.signIn.created}</span>
      {dateTime(credential.createdDate, credential.createdTime, lang)}
    </p>
  )
}
