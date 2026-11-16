import { ChevronRight, LayoutGrid } from 'lucide-react'
import { useState } from 'react'
import type { Service } from '../../../services'
import { hrefOf } from '../../hooks/useHashRoute'
import { useI18n } from '../../i18n'
import { canSee } from '../../lib/access'
import type { Me } from '../../types/portal'
import { ServiceCard } from '../services/ServiceCard'
import { ServiceCardSkeleton } from '../services/ServiceSkeleton'
import { CountTag, Panel } from '../ui/Panel'
import { Segmented } from '../ui/Segmented'
import { SkeletonText } from '../ui/Skeleton'

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
  className?: string
}

type Filter = 'mine' | 'all' | 'favorites'

/** 넓은 화면 한 줄(5칸) × 2줄 — 실제 서비스 수와 비슷하게 */
const SKELETON_COUNT = 10
/** 휴대폰 홈에 보일 카드 수 (아래 ul 의 nth-child(n+5) 와 맞춘다) — 나머지는 업무시스템 화면에서 */
const MOBILE_SHOWN = 4

export function SystemsPanel({ me, loading = false, services, allServices, favorites, onToggleFavorite, className = '' }: SystemsPanelProps) {
  const [filter, setFilter] = useState<Filter>('mine')
  const { t, f, rich } = useI18n()
  const favCount = services.filter((s) => favorites.includes(s.id)).length
  const list = filter === 'all' ? allServices : filter === 'mine' ? services : services.filter((s) => favorites.includes(s.id))

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
          className="grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-3 fit:flex-1 fit:grid-cols-5 tall:auto-rows-fr fit:gap-2.5"
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
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-3 max-sm:gap-2 max-sm:[&>li:nth-child(n+5)]:hidden fit:flex-1 fit:grid-cols-5 tall:auto-rows-fr fit:gap-2.5">
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
      {!loading && list.length > MOBILE_SHOWN && (
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
