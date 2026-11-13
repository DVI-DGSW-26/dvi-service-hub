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
import { ACCOUNT_URL } from '../lib/account'
import { hasNoDepartment } from '../lib/access'
import { dotDate } from '../lib/format'
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
 * 계정 설정. 내 정보 · 로그인 수단 · 로그인한 기기를 한눈에 보고, 바꾸는 일은 통합 로그인(Keycloak) 화면으로 보낸다
 * — 비밀번호 · OTP · 패스키는 로그인 서버만 다룰 수 있어서다. 화면 설정과 로그아웃도 여기 모았다.
 */
export function AccountPage({ me, loading, services, theme }: AccountPageProps) {
  const security = useAsync(portalApi.accountSecurity)

  return (
    <>
      <PageTitle title="계정 설정" description="회사 계정 정보와 로그인 수단을 확인하고 관리하세요." />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-5">
          <ProfileCard me={me} loading={loading} />

          <Panel
            title="로그인 수단"
            icon={ShieldCheck}
            meta={security.data && <SecurityBadge data={security.data} />}
            toolbar={
              <a href={ACCOUNT_URL} className="flex items-center gap-0.5 rounded-lg px-2 py-1 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft">
                통합 로그인에서 관리
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

          <Panel title="로그인한 기기" icon={MonitorSmartphone} meta={security.data && <CountTag>{security.data.sessions.length}대</CountTag>}>
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
                            {s.current && <Badge tone="ok">이 기기</Badge>}
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
                  모르는 기기가 있으면 바로 비밀번호를 바꾸고{' '}
                  <a href={hrefOf('guide')} className="font-semibold text-accent hover:underline">
                    시스템 문의
                  </a>
                  로 알려 주세요.
                </p>
              </>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-5">
          <Panel title="화면 설정" icon={Palette}>
            <ThemeSettings theme={theme} />
          </Panel>

          <Panel
            title="쓸 수 있는 서비스"
            icon={LayoutGrid}
            meta={<CountTag>{loading ? <SkeletonText className="h-3 w-3" /> : services.length}개</CountTag>}
            action={{ label: '전체보기', href: hrefOf('systems') }}
          >
            <p className="mb-3 text-sm text-muted">회사 계정의 권한에 따라 보이는 서비스예요.</p>
            {loading ? (
              <div className="grid grid-cols-2 gap-2" role="status" aria-label="불러오는 중">
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
                      <span className="sr-only"> (새 탭에서 열림)</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <section aria-labelledby="logout-title" className="glass rounded-3xl p-5 sm:p-6">
            <h2 id="logout-title" className="text-lg font-bold tracking-[-0.015em]">
              로그아웃
            </h2>
            <p className="mt-1.5 text-sm/relaxed text-muted">포털과 회사 계정을 쓰는 모든 사내 서비스에서 함께 로그아웃돼요.</p>
            {/* SSO 세션까지 끊는다 */}
            <a
              href="/api/auth/logout"
              className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-danger-soft text-[15px] font-semibold text-danger transition-[background-color,scale] duration-150 hover:bg-danger hover:text-white active:scale-[0.98]"
            >
              <LogOut className="size-[18px]" aria-hidden="true" />
              로그아웃
            </a>
          </section>
        </div>
      </div>
    </>
  )
}

/** 이름 · 이메일 · 부서. 바꾸는 일은 관리팀 몫이라 보기만 한다 */
function ProfileCard({ me, loading }: { me: Me | null; loading: boolean }) {
  if (loading) {
    return (
      <section className="glass rounded-3xl p-6 sm:p-8" role="status" aria-label="내 정보 불러오는 중">
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
            {me.name} 님
          </h2>
          <p className="mt-1 truncate text-[15px] text-muted">{me.email}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {noDept ? <Badge tone="warn">부서 미지정</Badge> : <Badge tone="accent">{me.department ?? '직원'}</Badge>}
            <Badge tone="ok">회사 계정 로그인 중</Badge>
          </div>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
        <Field label="이름">{me.name}</Field>
        <Field label="회사 이메일">{me.email}</Field>
        <Field label="부서">{me.department || '미지정'}</Field>
      </dl>
      <p className="mt-4 text-sm text-muted">
        이름 · 이메일 · 부서는 관리팀에서 관리해요. 바꿔야 하면{' '}
        <a href={hrefOf('guide')} className="font-semibold text-accent hover:underline">
          시스템 문의
        </a>
        로 알려 주세요.
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
  const n = methodsInUse(data)
  return n === 3 ? <Badge tone="ok">보안 좋음</Badge> : n === 2 ? <Badge tone="accent">보통</Badge> : <Badge tone="warn">보강 필요</Badge>
}

function SignInMethods({ data }: { data: AccountSecurity }) {
  const n = methodsInUse(data)
  const pwDays = daysSince(data.password.changed)
  const stale = pwDays >= PASSWORD_STALE_DAYS

  return (
    <>
      {/* 몇 가지를 쓰는지 막대로 — 색만이 아니라 글로도 적는다 */}
      <div className="mb-4 rounded-2xl bg-subtle px-4 py-3.5">
        <p className="text-[15px] font-semibold">
          로그인 수단 3가지 중 <strong className="text-accent">{n}가지</strong>를 쓰고 있어요
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
          title="비밀번호"
          status={
            <>
              마지막 변경 {dotDate(data.password.changed)} ({pwDays}일 전)
              {stale && <span className="font-semibold text-warn"> · 바꾼 지 오래됐어요</span>}
            </>
          }
          action="변경"
        />
        <MethodRow
          icon={SmartphoneNfc}
          title="OTP 인증 앱"
          badge={data.otp.registered ? <Badge tone="ok">사용 중</Badge> : <Badge tone="warn">미등록</Badge>}
          status={
            data.otp.registered
              ? `${data.otp.label ?? '인증 앱'}${data.otp.added ? ` · ${dotDate(data.otp.added)} 등록` : ''}`
              : '등록하면 비밀번호가 새어도 계정을 지킬 수 있어요'
          }
          action={data.otp.registered ? '관리' : '등록'}
        />
        <MethodRow
          icon={Fingerprint}
          title="패스키 (지문 · 얼굴)"
          badge={data.passkeys.length ? <Badge tone="ok">{data.passkeys.length}개 등록</Badge> : <Badge tone="neutral">없음</Badge>}
          status={data.passkeys.length ? '비밀번호 없이 지문이나 얼굴로 로그인해요' : '등록하면 비밀번호 없이 로그인할 수 있어요'}
          action="추가"
        >
          {data.passkeys.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {data.passkeys.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-xl bg-subtle px-3.5 py-2.5 text-sm">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-muted">
                    {dotDate(p.added)} 등록 · 마지막 사용 {p.lastUsed}
                  </span>
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
        <a href={ACCOUNT_URL} className={MANAGE_LINK} aria-label={`${title} ${action}`}>
          {action}
        </a>
      </div>
      {children && <div className="sm:pl-[60px]">{children}</div>}
    </li>
  )
}

function MethodSkeleton({ rows }: { rows: number }) {
  return (
    <div className="divide-y divide-line" role="status" aria-label="불러오는 중">
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
