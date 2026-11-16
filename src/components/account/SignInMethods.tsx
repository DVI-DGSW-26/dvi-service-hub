import { useQuery } from '@tanstack/react-query'
import { Fingerprint, KeyRound, SmartphoneNfc, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { isApiError } from '../../api/errors'
import { useI18n } from '../../i18n'
import {
  accountActionUrl,
  clearAccountActionResult,
  readAccountActionResult,
  type AccountAction,
} from '../../lib/account'
import { dateTime } from '../../lib/format'
import { accountQueries } from '../../queries/account'
import type { Credential } from '../../types/portal'
import { LoadError, Skeleton } from '../ui/Skeleton'

const OUTLINE =
  'inline-flex min-h-9 flex-none items-center rounded-xl px-3 text-sm font-semibold text-accent ring-1 ring-accent/60 transition-[background-color,scale] duration-150 hover:bg-accent-soft active:scale-[0.97]'
const DANGER =
  'inline-flex min-h-9 flex-none items-center rounded-xl bg-danger-fill px-3 text-sm font-semibold text-white transition-[filter,scale] duration-150 hover:brightness-110 active:scale-[0.97]'
const LINK = 'flex-none rounded-lg px-2 py-1 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft'

/**
 * 로그인 수단 — 비밀번호 · OTP 앱 · 패스키를 보고, 바꾸기 · 등록 · 삭제는 통합 로그인(Keycloak) 화면으로 보낸다.
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
    <div className="space-y-6">
      <ActionResult />

      {query.isError && (notYet ? <p className="rounded-2xl bg-subtle px-4 py-3 text-sm/relaxed text-muted">{c.listPending}</p> : <LoadError error={query.error} />)}

      <section>
        <h3 className="mb-3 text-[17px] font-bold">{c.basic}</h3>
        <MethodGroup icon={KeyRound} title={c.password.title} description={c.password.description}>
          <CredentialCard
            title={c.password.mine}
            credential={data?.password}
            loading={query.isPending}
            action={
              <a href={accountActionUrl('UPDATE_PASSWORD')} className={OUTLINE}>
                {c.password.change}
              </a>
            }
          />
        </MethodGroup>
      </section>

      <section>
        <h3 className="mb-3 text-[17px] font-bold">{c.secondFactor}</h3>
        <div className="space-y-5">
          <MethodGroup
            icon={SmartphoneNfc}
            title={c.otp.title}
            description={c.otp.description}
            add={<a href={accountActionUrl('CONFIGURE_TOTP')} className={LINK}>{c.otp.add}</a>}
          >
            <CredentialList items={data?.otp} loading={query.isPending} fallbackLabel={c.otp.defaultLabel} empty={c.otp.empty} />
          </MethodGroup>

          <MethodGroup
            icon={Fingerprint}
            title={c.passkey.title}
            description={c.passkey.description}
            add={<a href={accountActionUrl('webauthn-register-passwordless')} className={LINK}>{c.passkey.add}</a>}
          >
            <CredentialList items={data?.passkeys} loading={query.isPending} fallbackLabel={c.passkey.defaultLabel} empty={c.passkey.empty} />
          </MethodGroup>
        </div>
      </section>
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

function MethodGroup({ icon: I, title, description, add, children }: { icon: LucideIcon; title: string; description: string; add?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-[15px] font-bold">
          <I className="size-4 text-accent" aria-hidden="true" />
          {title}
        </h4>
        {add}
      </div>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function CredentialList({ items, loading, fallbackLabel, empty }: { items?: Credential[]; loading: boolean; fallbackLabel: string; empty: string }) {
  const { t, f } = useI18n()
  if (loading) return <Skeleton className="h-[74px] rounded-2xl" />
  // 목록을 못 받았으면(서버 API 전) 아무것도 그리지 않는다 — 위에 안내가 한 번 나온다
  if (!items) return null
  if (items.length === 0) return <p className="rounded-2xl bg-subtle px-4 py-3 text-sm text-muted">{empty}</p>
  return (
    <ul className="space-y-2">
      {items.map((cr) => {
        const name = cr.label || fallbackLabel
        return (
          <li key={cr.id}>
            <CredentialCard
              title={name}
              credential={cr}
              action={
                <a href={accountActionUrl(`delete_credential:${cr.id}` satisfies AccountAction)} className={DANGER} aria-label={f(t.account.signIn.deleteLabel, { name })}>
                  {t.account.signIn.delete}
                </a>
              }
            />
          </li>
        )
      })}
    </ul>
  )
}

function CredentialCard({ title, credential, loading = false, action }: { title: string; credential?: Credential; loading?: boolean; action: ReactNode }) {
  const { t, lang } = useI18n()
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-subtle px-4 py-3.5 ring-1 ring-line">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{title}</p>
        {credential?.provider && <p className="truncate text-sm text-muted">{credential.provider}</p>}
        {loading ? (
          <Skeleton className="mt-2 h-4 w-48 rounded-md" />
        ) : (
          credential && (
            <p className="mt-1.5 text-sm text-muted">
              <span className="mr-3 font-semibold">{t.account.signIn.created}</span>
              {dateTime(credential.createdDate, credential.createdTime, lang)}
            </p>
          )
        )}
      </div>
      {action}
    </div>
  )
}
