import {
  ArrowUpRight,
  Fingerprint,
  KeyRound,
  LayoutGrid,
  LogOut,
  Monitor,
  MonitorSmartphone,
  Palette,
  ShieldCheck,
  Smartphone,
  SmartphoneNfc,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { Service } from '../../services'
import { portalApi } from '../api/portal'
import { ThemeSettings } from '../components/layout/ThemeSettings'
import { ServiceLogo } from '../components/services/ServiceCard'
import { Badge } from '../components/ui/Badge'
import { PageTitle } from '../components/ui/PageTitle'
import { CountTag, Panel } from '../components/ui/Panel'
import { LoadError, Skeleton, SkeletonText } from '../components/ui/Skeleton'
import { useAsync } from '../hooks/useAsync'
import { hrefOf } from '../hooks/useHashRoute'
import type { PortalTheme } from '../hooks/usePortalTheme'
import { ACCOUNT_URL, LOGOUT_URL } from '../lib/account'
import { useI18n } from '../i18n'
import { hasNoDepartment } from '../lib/access'
import { formatDate } from '../lib/format'
import type { AccountSecurity, Me } from '../types/portal'

interface AccountPageProps {
  me: Me | null
  /** 로그인 정보를 받는 중 */
  loading: boolean
  /** 권한으로 거른 서비스 */
  services: Service[]
  theme: PortalTheme
}

/** 비밀번호를 이만큼 안 바꿨으면 바꾸라고 알린다 */
const PASSWORD_STALE_DAYS = 180

const daysSince = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((today.getTime() - new Date(y, m - 1, d).getTime()) / 86_400_000)
}

/** 같은 탭에서 열어 뒤로 가기로 포털에 돌아오게 한다 */
const MANAGE_LINK =
  'inline-flex min-h-10 flex-none cursor-pointer items-center gap-1 rounded-xl px-3.5 text-sm font-semibold ring-1 ring-line transition-[background-color,color,scale] duration-150 hover:bg-subtle hover:text-accent active:scale-[0.97]'

/**
 * 설정. 내 정보 · 로그인 수단 · 로그인한 기기를 한눈에 보고, 바꾸는 일은 통합 로그인(Keycloak) 화면으로 보낸다
 * — 비밀번호 · OTP · 패스키는 로그인 서버만 다룰 수 있어서다. 화면 설정과 로그아웃도 여기 모았다.
 */
export function AccountPage({ me, loading, services, theme }: AccountPageProps) {
  const { t, f, rich } = useI18n()
  const security = useAsync(portalApi.accountSecurity)

  return (
    <>
      <PageTitle title={t.account.title} description={t.account.description} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-5">
          <ProfileCard me={me} loading={loading} />

          <Panel
            title={t.account.signIn.title}
            icon={ShieldCheck}
            meta={security.data && <SecurityBadge data={security.data} />}
            toolbar={
              <a href={ACCOUNT_URL} className="flex items-center gap-0.5 rounded-lg px-2 py-1 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft">
                {t.account.signIn.manage}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            }
          >
            {security.loading ? (
              <>
                <Skeleton className="mb-4 h-[74px] rounded-2xl" />
                <MethodSkeleton rows={3} />
              </>
            ) : security.error || !security.data ? (
              <LoadError />
            ) : (
              <SignInMethods data={security.data} />
            )}
          </Panel>

          <Panel
            title={t.account.devices.title}
            icon={MonitorSmartphone}
            meta={security.data && <CountTag>{f(t.account.devices.count, { count: security.data.sessions.length })}</CountTag>}
          >
            {security.loading ? (
              <MethodSkeleton rows={3} />
            ) : security.error || !security.data ? (
              <LoadError />
            ) : (
              <>
                <ul className="divide-y divide-line">
                  {security.data.sessions.map((s) => {
                    const I = s.device === 'mobile' ? Smartphone : Monitor
                    return (
                      <li key={s.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                        <span className="grid size-11 flex-none place-items-center rounded-xl bg-subtle text-muted ring-1 ring-line">
                          <I className="size-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-semibold">{s.client}</span>
                            {s.current && <Badge tone="ok">{t.account.devices.current}</Badge>}
                          </span>
                          <span className="mt-0.5 block text-sm text-muted">
                            {s.place} · {s.lastActive}
                          </span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-4 rounded-2xl bg-subtle px-4 py-3 text-sm/relaxed text-muted">
                  {rich(t.account.devices.note, {
                    link: (
                      <a href={hrefOf('guide')} className="font-semibold text-accent hover:underline">
                        {t.account.contactLink}
                      </a>
                    ),
                  })}
                </p>
              </>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-5">
          <Panel title={t.account.display} icon={Palette}>
            <ThemeSettings theme={theme} />
          </Panel>

          <Panel
            title={t.account.services.title}
            icon={LayoutGrid}
            meta={<CountTag>{rich(t.account.services.count, { count: loading ? <SkeletonText className="h-3 w-3" /> : services.length })}</CountTag>}
            action={{ label: t.common.viewAll, href: hrefOf('systems') }}
          >
            <p className="mb-3 text-sm text-muted">{t.account.services.hint}</p>
            {loading ? (
              <div className="grid grid-cols-2 gap-2" role="status" aria-label={t.common.loading}>
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-11" />
                ))}
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-2">
                {services.map((s) => (
                  <li key={s.id}>
                    <a
                      href={s.links[0].url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-11 items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm font-semibold transition-colors hover:bg-subtle"
                    >
                      <ServiceLogo service={s} size="sm" />
                      <span className="min-w-0 truncate">{s.name}</span>
                      <span className="sr-only"> {t.common.newTab}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <section aria-labelledby="logout-title" className="glass rounded-3xl p-5 sm:p-6">
            <h2 id="logout-title" className="text-lg font-bold tracking-[-0.015em]">
              {t.account.logout.title}
            </h2>
            <p className="mt-1.5 text-sm/relaxed text-muted">{t.account.logout.body}</p>
            {/* SSO 세션까지 끊는다 */}
            <a
              href={LOGOUT_URL}
              className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-danger-soft text-[15px] font-semibold text-danger transition-[background-color,scale] duration-150 hover:bg-danger-fill hover:text-white active:scale-[0.98]"
            >
              <LogOut className="size-[18px]" aria-hidden="true" />
              {t.account.logout.action}
            </a>
          </section>
        </div>
      </div>
    </>
  )
}

/** 이름 · 이메일 · 부서. 바꾸는 일은 관리팀 몫이라 보기만 한다 */
function ProfileCard({ me, loading }: { me: Me | null; loading: boolean }) {
  const { t, f, rich } = useI18n()
  if (loading) {
    return (
      <section className="glass rounded-3xl p-6 sm:p-8" role="status" aria-label={t.account.profile.loading}>
        <div className="flex items-center gap-5">
          <Skeleton className="size-20 flex-none rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-7 w-32 rounded-lg" />
            <Skeleton className="mt-2.5 h-4 w-56 max-w-full rounded-md" />
            <Skeleton className="mt-3 h-6 w-24 rounded-md" />
          </div>
        </div>
        <div className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i}>
              <Skeleton className="h-3.5 w-12 rounded-md" />
              <Skeleton className="mt-2 h-5 w-28 rounded-md" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (!me) {
    return (
      <section className="glass rounded-3xl p-6 sm:p-8">
        <LoadError />
      </section>
    )
  }

  const noDept = hasNoDepartment(me)

  return (
    <section aria-labelledby="profile-name" className="glass rounded-3xl p-6 sm:p-8">
      <div className="flex items-center gap-5">
        <span
          className="grid size-20 flex-none place-items-center rounded-full bg-accent-fill text-[32px] font-bold text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.3),0_8px_20px_-8px_oklch(0_0_0/0.35)]"
          aria-hidden="true"
        >
          {me.name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <h2 id="profile-name" className="text-[clamp(22px,2.2vw,26px)]/tight font-bold tracking-[-0.025em]">
            {f(t.account.profile.greeting, { name: me.name })}
          </h2>
          <p className="mt-1 truncate text-[15px] text-muted">{me.email}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {noDept ? (
              <Badge tone="warn">{t.account.profile.noDepartment}</Badge>
            ) : (
              <Badge tone="accent">{me.department ?? t.account.profile.defaultDepartment}</Badge>
            )}
            <Badge tone="ok">{t.account.profile.signedIn}</Badge>
          </div>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
        <Field label={t.account.profile.name}>{me.name}</Field>
        <Field label={t.account.profile.email}>{me.email}</Field>
        <Field label={t.account.profile.department}>{me.department || t.account.profile.unassigned}</Field>
      </dl>
      <p className="mt-4 text-sm text-muted">
        {rich(t.account.profile.note, {
          link: (
            <a href={hrefOf('guide')} className="font-semibold text-accent hover:underline">
              {t.account.contactLink}
            </a>
          ),
        })}
      </p>
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 truncate text-base font-semibold">{children}</dd>
    </div>
  )
}

/** 비밀번호 + OTP + 패스키 중 몇 가지를 쓰는지 */
const methodsInUse = (d: AccountSecurity) => 1 + Number(d.otp.registered) + Number(d.passkeys.length > 0)

function SecurityBadge({ data }: { data: AccountSecurity }) {
  const { t } = useI18n()
  const { level } = t.account.signIn
  const n = methodsInUse(data)
  return n === 3 ? <Badge tone="ok">{level.good}</Badge> : n === 2 ? <Badge tone="accent">{level.fair}</Badge> : <Badge tone="warn">{level.weak}</Badge>
}

function SignInMethods({ data }: { data: AccountSecurity }) {
  const { t, f, rich, lang } = useI18n()
  const { password, otp, passkey } = t.account
  const { summary } = t.account.signIn
  const n = methodsInUse(data)
  const pwDays = daysSince(data.password.changed)
  const stale = pwDays >= PASSWORD_STALE_DAYS

  return (
    <>
      {/* 몇 가지를 쓰는지 막대로 — 색만이 아니라 글로도 적는다 */}
      <div className="mb-4 rounded-2xl bg-subtle px-4 py-3.5">
        <p className="text-[15px] font-semibold">
          {rich(summary.text, { n: <strong className="text-accent">{f(summary.n, { count: n })}</strong> })}
        </p>
        <div className="mt-2.5 flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i < n ? 'bg-accent-fill' : 'bg-fg/10'}`} />
          ))}
        </div>
      </div>

      <ul className="divide-y divide-line">
        <MethodRow
          icon={KeyRound}
          title={password.title}
          status={
            <>
              {f(password.changed, { date: formatDate(data.password.changed, lang), count: pwDays })}
              {stale && <span className="font-semibold text-warn"> · {password.stale}</span>}
            </>
          }
          action={password.change}
        />
        <MethodRow
          icon={SmartphoneNfc}
          title={otp.title}
          badge={data.otp.registered ? <Badge tone="ok">{otp.inUse}</Badge> : <Badge tone="warn">{otp.notRegistered}</Badge>}
          status={
            data.otp.registered
              ? `${data.otp.label ?? otp.defaultLabel}${data.otp.added ? ` · ${f(otp.added, { date: formatDate(data.otp.added, lang) })}` : ''}`
              : otp.pitch
          }
          action={data.otp.registered ? otp.manage : otp.register}
        />
        <MethodRow
          icon={Fingerprint}
          title={passkey.title}
          badge={data.passkeys.length ? <Badge tone="ok">{f(passkey.count, { count: data.passkeys.length })}</Badge> : <Badge tone="neutral">{passkey.none}</Badge>}
          status={data.passkeys.length ? passkey.inUse : passkey.pitch}
          action={passkey.add}
        >
          {data.passkeys.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {data.passkeys.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-xl bg-subtle px-3.5 py-2.5 text-sm">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-muted">{f(passkey.detail, { added: formatDate(p.added, lang), lastUsed: p.lastUsed })}</span>
                </li>
              ))}
            </ul>
          )}
        </MethodRow>
      </ul>
    </>
  )
}

interface MethodRowProps {
  icon: LucideIcon
  title: string
  badge?: ReactNode
  status: ReactNode
  /** 오른쪽 버튼 글자 — 누르면 통합 로그인 화면으로 */
  action: string
  children?: ReactNode
}

function MethodRow({ icon: I, title, badge, status, action, children }: MethodRowProps) {
  const { t, f } = useI18n()
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-4">
        <span className="grid size-11 flex-none place-items-center rounded-xl bg-accent-soft text-accent">
          <I className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold">{title}</h3>
            {badge}
          </div>
          <p className="mt-0.5 text-sm text-muted">{status}</p>
        </div>
        <a href={ACCOUNT_URL} className={MANAGE_LINK} aria-label={f(t.account.signIn.actionLabel, { method: title, action })}>
          {action}
        </a>
      </div>
      {children && <div className="sm:pl-[60px]">{children}</div>}
    </li>
  )
}

function MethodSkeleton({ rows }: { rows: number }) {
  const { t } = useI18n()
  return (
    <div className="divide-y divide-line" role="status" aria-label={t.common.loading}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
          <Skeleton className="size-11 flex-none" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="mt-1.5 h-4 w-56 max-w-full rounded-md" />
          </div>
          <Skeleton className="h-10 w-14 flex-none" />
        </div>
      ))}
    </div>
  )
}
