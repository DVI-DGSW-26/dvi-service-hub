import { LayoutGrid } from 'lucide-react'
import { useState } from 'react'
import type { Service } from '../../../services'
import { hrefOf } from '../../hooks/useHashRoute'
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
  const favCount = services.filter((s) => favorites.includes(s.id)).length
  const list = filter === 'all' ? services : services.filter((s) => favorites.includes(s.id))

  return (
    <Panel
      title="업무시스템"
      icon={LayoutGrid}
      meta={<CountTag>총 {loading ? <SkeletonText className="h-3 w-3" /> : services.length}개</CountTag>}
      toolbar={
        <Segmented<Filter>
          label="표시할 서비스"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: '전체' },
            { value: 'favorites', label: `즐겨찾기 ${favCount}` },
          ]}
        />
      }
      action={{ label: '전체보기', href: hrefOf('systems') }}
      className={className}
    >
      {loading ? (
        <ul
          className="grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-3 fit:flex-1 fit:grid-cols-5 tall:auto-rows-fr fit:gap-2.5"
          aria-busy="true"
          aria-label="업무시스템 불러오는 중"
        >
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </ul>
      ) : list.length === 0 ? (
        <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-line px-4 py-12 text-center">
          {filter === 'favorites' ? (
            <p className="text-sm text-muted">
              아직 즐겨찾기한 서비스가 없습니다.
              <br />
              카드 오른쪽 위의 별을 눌러 추가하세요.
            </p>
          ) : (
            // 권한으로 모두 걸러진 경우 — 별을 누를 카드도 없으니 권한 요청 쪽으로 안내한다
            <p className="text-sm text-muted">
              지금 계정으로 쓸 수 있는 서비스가 없습니다.
              <br />
              권한이 필요하면{' '}
              <a href={hrefOf('guide')} className="font-semibold text-accent hover:underline">
                시스템 문의
              </a>
              로 알려 주세요.
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
