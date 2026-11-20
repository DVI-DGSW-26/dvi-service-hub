import { ArrowUpRight, LayoutGrid, LogOut, MonitorSmartphone, Palette, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Service } from '@/features/systems'
import { SignInMethods } from './SignInMethods'
import { ThemeSettings } from '@/features/theme'
import { ServiceLogo } from '@/features/systems'
import { Badge, ComingSoon, PageTitle, CountTag, PANEL_LINK, Panel, LoadError, Skeleton, SkeletonText } from '@/shared/ui'
import { hrefOf } from '@/shared/hooks'
import type { PortalTheme } from '@/features/theme'
import { ACCOUNT_URL, LOGOUT_URL } from '../lib/account'
import { useI18n } from '@/shared/i18n'
import { hasNoDepartment } from '@/shared/lib'
import type { Me } from '@dvi/core/types'

interface AccountPageProps {
  me: Me | null
  /** 로그인 정보를 받는 중 */
  loading: boolean
  /** 권한으로 거른 서비스 */
  services: Service[]
  theme: PortalTheme
  /** 화면 설정의 '홈 배경 · 그림 바꾸기' */
  onCustomize: () => void
}

/**
 * 설정. 내 정보 · 로그인 수단 · 로그인한 기기를 보고, 바꾸는 일은 통합 로그인(Keycloak) 화면으로 보낸다
 * — 비밀번호 · OTP · 패스키는 로그인 서버만 다룰 수 있어서다. 화면 설정과 로그아웃도 여기 모았다.
 *
 * 로그인 수단의 바꾸기 · 등록 · 삭제는 통합 로그인으로 보내 지금도 된다. 목록과 로그인한 기기는 API 가 아직 없다
 * (docs/adr/0001-unbacked-features-coming-soon.md).
 */
export function AccountPage({ me, loading, services, theme, onCustomize }: AccountPageProps) {
  const { t, rich } = useI18n()
  const soon = <Badge tone="neutral">{t.common.comingSoon}</Badge>

  return (
    <>
      <PageTitle title={t.account.title} description={t.account.description} />

      {/* 휴대폰은 한 줄로 — 두 칸을 풀어(contents) 자주 쓰는 순서로: 내 정보 · 화면 · 로그인 수단 · 내 서비스 · 기기 · 로그아웃 */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 max-lg:contents lg:space-y-5">
          <ProfileCard me={me} loading={loading} />

          <Panel
            title={t.account.signIn.title}
            icon={ShieldCheck}
            description={t.account.signIn.description}
            className="max-lg:order-2"
            toolbar={
              <a href={ACCOUNT_URL} className={PANEL_LINK}>
                {t.account.signIn.manage}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            }
          >
            <SignInMethods />
          </Panel>

          <Panel
            title={t.account.devices.title}
            icon={MonitorSmartphone}
            meta={soon}
            className="max-lg:order-4"
          >
            <ComingSoon>{t.account.devices.pending}</ComingSoon>
          </Panel>
        </div>

        <div className="min-w-0 max-lg:contents lg:space-y-5">
          <Panel title={t.account.display} icon={Palette} className="max-lg:order-1">
            <ThemeSettings theme={theme} onCustomize={onCustomize} />
          </Panel>

          <Panel
            title={t.account.services.title}
            icon={LayoutGrid}
            meta={<CountTag>{rich(t.account.services.count, { count: loading ? <SkeletonText className="h-3 w-3" /> : services.length })}</CountTag>}
            action={{ label: t.common.viewAll, href: hrefOf('systems') }}
            className="max-lg:order-3"
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

          <section aria-labelledby="logout-title" className="glass rounded-3xl p-5 max-lg:order-5 sm:p-6">
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
  const { t, f } = useI18n()
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
  // 부서는 아직 토큰에 실려 오지 않는다 — 재직자면 '준비 중', employee 가 없으면 정말 미지정
  const department = me.department || (noDept ? t.account.profile.unassigned : <span className="font-normal text-muted">{t.common.comingSoon}</span>)

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
        <Field label={t.account.profile.department}>{department}</Field>
      </dl>
      <p className="mt-4 text-sm text-muted">{t.account.profile.note}</p>
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
