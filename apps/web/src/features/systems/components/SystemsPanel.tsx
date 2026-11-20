import { LayoutGrid } from 'lucide-react'
import { useState } from 'react'
import { hrefOf } from '@/shared/hooks'
import type { Service } from '../lib/services'
import { useI18n } from '@/shared/i18n'
import { canSee } from '../lib/access'
import type { Me } from '@/shared/types'
import { isMini, type StackSize } from '@/shared/widget'
import { CardPages } from './CardPages'
import { ServiceCard, ServiceLogo } from './ServiceCard'
import { ServiceCardSkeleton } from './ServiceSkeleton'
import { CountTag, Panel, SmallPanel, Segmented, Skeleton, SkeletonText } from '@/shared/ui'

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
/** 작은 칸마다 한 페이지 로고 수 · 페이지 grid */
const SMALL = {
  '1x1': [1, 'grid-rows-1'],
  '1x2': [2, 'grid-rows-2 gap-2'],
  '4x1': [4, 'grid-cols-4 grid-rows-1 gap-2'],
  s: [4, 'grid-cols-2 grid-rows-2 gap-2'],
  w: [4, 'grid-cols-4 grid-rows-1 gap-2'],
} as const

export function SystemsPanel({ me, loading = false, services, allServices, favorites, onToggleFavorite, stack, className = '' }: SystemsPanelProps) {
  const [filter, setFilter] = useState<Filter>('mine')
  const { t, f, rich } = useI18n()
  const favCount = services.filter((s) => favorites.includes(s.id)).length
  const list = filter === 'all' ? allServices : filter === 'mine' ? services : services.filter((s) => favorites.includes(s.id))

  // 작은 칸 — 로고(넓게 4×2 는 이름까지)를 칸마다 정해진 수씩 페이지로, 옆 · 위아래로 쓸어 넘긴다(점은 자리가 없어 없다). services 는 App 이 즐겨찾기를 앞에 둬서(sortByFavorite) 넘긴다
  const small = stack && stack in SMALL ? SMALL[stack as keyof typeof SMALL] : undefined
  const tiles = small && (
    <CardPages count={services.length} label={t.home.systems.pages} perPage={small[0]} grid={small[1]} dots={false}>
      {(from, to) =>
        services.slice(from, to).map((s) => (
          <li key={s.id} className="min-w-0">
            <a
              href={s.links[0].url}
              target="_blank"
              rel="noreferrer"
              aria-label={`${s.name} ${t.common.newTab}`}
              title={s.name}
              className="flex h-full flex-col items-center justify-center gap-1 rounded-2xl bg-subtle ring-1 ring-line transition-[background-color,scale] duration-200 hover:bg-raised active:scale-95"
            >
              <ServiceLogo service={s} />
              {stack === 'w' && <span className="max-w-full truncate px-1.5 text-xs font-semibold">{s.name}</span>}
            </a>
          </li>
        ))
      }
    </CardPages>
  )

  // 아주 작은 칸 — 제목 없이 로고만: 1×1 하나, 1×2 둘(세로), 4×1 넷(가로)
  if (isMini(stack)) {
    return (
      <section aria-label={t.home.systems.title} className={`glass flex flex-col rounded-3xl p-2 ${className}`}>
        {loading ? <Skeleton className="w-full flex-1 rounded-2xl" /> : tiles}
      </section>
    )
  }

  // 작게 — 로고 2 × 2(넓게 4×2 는 한 줄 넷에 이름까지). 이름은 화면낭독 · 마우스 올리기로
  if (stack === 's' || stack === 'w') {
    return (
      <SmallPanel title={t.home.systems.title} icon={LayoutGrid} className={className}>
        {loading ? <Skeleton className="h-20 w-full" /> : services.length ? tiles : <p className="text-[13px] text-muted break-keep">{t.home.systems.noAccess}</p>}
        {stack === 'w' && (
          <a href={hrefOf('systems')} className="mt-2 text-[13px] font-semibold text-accent">
            {f(t.home.systems.mobileAll, { count: services.length })}
          </a>
        )}
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
      <div className="mb-3 flex-none sm:hidden">{filterControl}</div>
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
        // 위젯 칸에 다 들어가는 만큼씩 페이지로 — 옆으로 밀거나 아래 점을 눌러 넘긴다. 반쯤 잘린 줄 없이 카드 크기는 모두 같다. 필터를 바꾸면 첫 페이지부터(key)
        <CardPages key={filter} count={list.length} label={t.home.systems.pages}>
          {(from, to) =>
            list.slice(from, to).map((s) => (
              <ServiceCard
                key={s.id}
                service={s}
                favorite={favorites.includes(s.id)}
                onToggleFavorite={onToggleFavorite}
                locked={filter === 'all' && !canSee(s, me)}
              />
            ))
          }
        </CardPages>
      )}
    </Panel>
  )
}
