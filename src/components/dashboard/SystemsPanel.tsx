import { ChevronRight, LayoutGrid } from 'lucide-react'
import { useState } from 'react'
import type { Service } from '../../services'
import { hrefOf } from '../../hooks/useHashRoute'
import { useI18n } from '../../i18n'
import { canSee } from '../../lib/access'
import type { Me } from '../../types/portal'
import type { StackSize } from '../../lib/widgetLayout'
import { ServiceCard, ServiceLogo } from '../services/ServiceCard'
import { ServiceCardSkeleton } from '../services/ServiceSkeleton'
import { CountTag, Panel, SmallPanel } from '../ui/Panel'
import { Segmented } from '../ui/Segmented'
import { Skeleton, SkeletonText } from '../ui/Skeleton'

interface SystemsPanelProps {
  me: Me | null
  /** 로그인 정보(권한)를 받는 중 — 목록이 권한으로 걸러지기 전이라 카드 대신 자리만 */
  loading?: boolean
  /** 권한으로 거른 목록 (/api/auth/me 의 realm · svc 역할과 services.ts 의 access 를 맞춰 본다) */
  services: Service[]
  /** 권한과 상관없이 전부 — 권한 없는 서비스는 '권한 없음' 으로 표시한다 */
  allServices: Service[]
  favorites: string[]
  onToggleFavorite: (id: string) => void
  /** 좁은 화면 크기 — 작게는 로고 네 개, 크게면 휴대폰에서도 카드를 모두 */
  stack?: StackSize
  className?: string
}

type Filter = 'mine' | 'all' | 'favorites'

/** 넓은 화면 한 줄(5칸) × 2줄 — 실제 서비스 수와 비슷하게 */
const SKELETON_COUNT = 10
/** 휴대폰 홈에 보일 카드 수 (아래 ul 의 nth-child(n+5) 와 맞춘다) — 나머지는 업무시스템 화면에서 */
const MOBILE_SHOWN = 4

export function SystemsPanel({ me, loading = false, services, allServices, favorites, onToggleFavorite, stack, className = '' }: SystemsPanelProps) {
  const all = stack === 'l'
  const [filter, setFilter] = useState<Filter>('mine')
  const { t, f, rich } = useI18n()
  const favCount = services.filter((s) => favorites.includes(s.id)).length
  const list = filter === 'all' ? allServices : filter === 'mine' ? services : services.filter((s) => favorites.includes(s.id))

  // 작게 — 즐겨찾기를 앞에 두고 로고 2 × 2. 이름은 화면낭독 · 마우스 올리기로, 나머지는 업무시스템 화면에서
  if (stack === 's') {
    const top = [...services].sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id))).slice(0, 4)
    return (
      <SmallPanel title={t.home.systems.title} icon={LayoutGrid} className={className}>
        {loading ? (
          <Skeleton className="h-28 w-full" />
        ) : top.length ? (
          <ul className="grid flex-1 grid-cols-2 gap-2">
            {top.map((s) => (
              <li key={s.id}>
                <a
                  href={s.links[0].url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${s.name} ${t.common.newTab}`}
                  title={s.name}
                  className="grid h-full min-h-14 place-items-center rounded-2xl bg-subtle ring-1 ring-line transition-[background-color,scale] duration-200 hover:bg-raised active:scale-95"
                >
                  <ServiceLogo service={s} />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-muted break-keep">{t.home.systems.noAccess}</p>
        )}
        <a href={hrefOf('systems')} className="mt-2 text-[13px] font-semibold text-accent">
          {f(t.home.systems.mobileAll, { count: services.length })}
        </a>
      </SmallPanel>
    )
  }

  const filterControl = (
    <Segmented<Filter>
      label={t.home.systems.filterLabel}
      value={filter}
      onChange={setFilter}
      options={[
        { value: 'mine', label: t.home.systems.mine },
        { value: 'all', label: t.home.systems.all },
        { value: 'favorites', label: f(t.home.systems.favorites, { count: favCount }) },
      ]}
    />
  )

  return (
    <Panel
      title={t.home.systems.title}
      icon={LayoutGrid}
      meta={
        <CountTag>
          {rich(t.home.systems.total, { count: loading ? <SkeletonText className="h-3 w-3" /> : list.length }, loading ? undefined : list.length)}
        </CountTag>
      }
      // 휴대폰은 제목 줄에 자리가 없어 전환 단추를 본문 맨 위로 내린다
      toolbar={<div className="max-sm:hidden">{filterControl}</div>}
      action={{ label: t.common.viewAll, href: hrefOf('systems') }}
      className={className}
    >
      <div className="mb-3 sm:hidden">{filterControl}</div>
      {loading ? (
        <ul
          className="grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-3 fit:flex-1 fit:grid-cols-5 auto-rows-fr fit:gap-2.5"
          aria-busy="true"
          aria-label={t.home.systems.loading}
        >
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </ul>
      ) : list.length === 0 ? (
        <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-line px-4 py-12 text-center">
          {filter === 'favorites' ? (
            <p className="text-sm text-muted">
              {t.home.systems.noFavorites}
              <br />
              {t.home.systems.noFavoritesHint}
            </p>
          ) : (
            // 권한으로 모두 걸러진 경우 — 별을 누를 카드도 없으니 권한 요청 쪽으로 안내한다
            <p className="text-sm text-muted">
              {t.home.systems.noAccess}
              <br />
              {t.home.systems.noAccessHint}
            </p>
          )}
        </div>
      ) : (
        // 휴대폰은 앞의 MOBILE_SHOWN 개만 — 나머지는 아래 '모두 보기'(업무시스템 화면)에서
        <ul className={`grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-3 max-sm:gap-2 ${all ? '' : 'max-sm:[&>li:nth-child(n+5)]:hidden'} fit:flex-1 fit:grid-cols-5 auto-rows-fr fit:gap-2.5`}>
          {list.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              favorite={favorites.includes(s.id)}
              onToggleFavorite={onToggleFavorite}
              locked={filter === 'all' && !canSee(s, me)}
            />
          ))}
        </ul>
      )}
      {!loading && !all && list.length > MOBILE_SHOWN && (
        <a
          href={hrefOf('systems')}
          className="mt-2 flex items-center justify-center gap-1 rounded-2xl py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft sm:hidden"
        >
          {f(t.home.systems.mobileAll, { count: list.length })}
          <ChevronRight className="size-4" aria-hidden="true" />
        </a>
      )}
    </Panel>
  )
}
