import { LayoutGrid } from 'lucide-react'
import { useState } from 'react'
import type { Service } from '../../../services'
import { hrefOf } from '../../hooks/useHashRoute'
import { useI18n } from '../../i18n'
import { ServiceCard } from '../services/ServiceCard'
import { ServiceCardSkeleton } from '../services/ServiceSkeleton'
import { CountTag, Panel } from '../ui/Panel'
import { Segmented } from '../ui/Segmented'
import { SkeletonText } from '../ui/Skeleton'

interface SystemsPanelProps {
  /** 로그인 정보(권한)를 받는 중 — 목록이 권한으로 걸러지기 전이라 카드 대신 자리만 */
  loading?: boolean
  services: Service[]
  favorites: string[]
  onToggleFavorite: (id: string) => void
  className?: string
}

type Filter = 'all' | 'favorites'

/** 넓은 화면 한 줄(5칸) × 2줄 — 실제 서비스 수와 비슷하게 */
const SKELETON_COUNT = 10

export function SystemsPanel({ loading = false, services, favorites, onToggleFavorite, className = '' }: SystemsPanelProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const { t, f, rich } = useI18n()
  const favCount = services.filter((s) => favorites.includes(s.id)).length
  const list = filter === 'all' ? services : services.filter((s) => favorites.includes(s.id))

  return (
    <Panel
      title={t.home.systems.title}
      icon={LayoutGrid}
      meta={
        <CountTag>
          {rich(t.home.systems.total, { count: loading ? <SkeletonText className="h-3 w-3" /> : services.length }, loading ? undefined : services.length)}
        </CountTag>
      }
      toolbar={
        <Segmented<Filter>
          label={t.home.systems.filterLabel}
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t.home.systems.all },
            { value: 'favorites', label: f(t.home.systems.favorites, { count: favCount }) },
          ]}
        />
      }
      action={{ label: t.common.viewAll, href: hrefOf('systems') }}
      className={className}
    >
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
              {rich(t.home.systems.noAccessHint, {
                link: (
                  <a href={hrefOf('guide')} className="font-semibold text-accent hover:underline">
                    {t.home.systems.noAccessLink}
                  </a>
                ),
              })}
            </p>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-3 fit:flex-1 fit:grid-cols-5 tall:auto-rows-fr fit:gap-2.5">
          {list.map((s) => (
            <ServiceCard key={s.id} service={s} favorite={favorites.includes(s.id)} onToggleFavorite={onToggleFavorite} />
          ))}
        </ul>
      )}
    </Panel>
  )
}
