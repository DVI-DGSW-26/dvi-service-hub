import { useQuery } from '@tanstack/react-query'
import { Grid3x3, LayoutGrid, List, Settings2 } from 'lucide-react'
import { lazy, Suspense, useState, type ComponentType } from 'react'
import { useLazyModal } from '@/shared/hooks'
import { NoDepartmentNotice, SearchBox, PageTitle, Segmented } from '@/shared/ui'
import { ServiceCard } from './ServiceCard'
import { ServiceRow } from './ServiceRow'
import { ServiceTile } from './ServiceTile'
import { ServiceCardSkeleton, ServiceRowSkeleton, ServiceTileSkeleton } from './ServiceSkeleton'
import type { Category, Service } from '../lib/services'
import { useI18n } from '@/shared/i18n'
import { hasNoDepartment, KEYS, readPref, writePref } from '@/shared/lib'
import { matchesQuery } from '../lib/access'
import { preferenceQueries } from '../api/queries'
import type { Me } from '@/shared/types'

const ServiceAdmin = lazy(() => import('./ServiceAdmin').then((m) => ({ default: m.ServiceAdmin })))

const CATEGORIES: ('전체' | Category)[] = ['전체', '업무', '인사', '정보', '사내문화']
const SKELETON_COUNT = 9

type View = 'card' | 'list' | 'icon'

/** 보기마다 목록 틀 — 아이콘은 휴대폰 홈 화면처럼 한 줄에 넷, 넓으면 칸 폭(6.5rem)에 맞춰 더 */
const FRAME: Record<View, string> = {
  card: 'grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-4',
  list: 'glass divide-y divide-line overflow-hidden rounded-3xl',
  icon: 'glass grid grid-cols-4 gap-x-1 gap-y-2 rounded-3xl p-2 sm:grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] sm:p-4',
}
const SKELETON: Record<View, ComponentType> = {
  card: () => <ServiceCardSkeleton variant="detailed" />,
  list: ServiceRowSkeleton,
  icon: ServiceTileSkeleton,
}

interface SystemsPageProps {
  me: Me | null
  /** 로그인 정보(권한)를 받는 중 — 목록 대신 자리만 잡아 둔다 */
  loading?: boolean
  /** 권한으로 거르고 즐겨찾기 순으로 정렬된 목록 */
  services: Service[]
  query: string
  onQueryChange: (q: string) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
}

export function SystemsPage({ me, loading = false, services, query, onQueryChange, favorites, onToggleFavorite }: SystemsPageProps) {
  const { t, f } = useI18n()
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('전체')
  // 마지막으로 고른 보기 방식을 기억한다
  const [view, setView] = useState<View>(() => {
    const saved = readPref(KEYS.systemsView)
    return saved === 'list' || saved === 'icon' ? saved : 'card'
  })
  const changeView = (v: View) => {
    setView(v)
    writePref(KEYS.systemsView, v === 'card' ? null : v)
  }
  const Skeleton = SKELETON[view]
  const visible = services.filter((s) => (category === '전체' || s.category === category) && matchesQuery(s, query))
  // 관리 버튼 · 최근 사용은 허브 서버의 내 정보(GET /me) — 즐겨찾기와 같은 캐시
  const prefs = useQuery(preferenceQueries.me()).data
  const recent = (prefs?.recent ?? []).flatMap((id) => services.filter((s) => s.id === id))
  const admin = useLazyModal()

  return (
    <>
      <PageTitle title={t.systems.title} description={loading ? t.systems.description : f(t.systems.descriptionCount, { count: services.length })} />

      {/* 넓은 화면에서는 상단 바의 검색칸을 쓴다 */}
      <SearchBox value={query} onChange={onQueryChange} className="mb-4 md:hidden" />

      {hasNoDepartment(me) && <NoDepartmentNotice className="mb-4" />}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.systems.categoryGroup}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === category}
              onClick={() => setCategory(c)}
              className={`min-h-10 cursor-pointer rounded-full px-4 text-sm font-semibold transition-[background-color,color,box-shadow,scale] duration-200 active:scale-95 ${
                c === category
                  ? 'bg-accent-fill text-white shadow-[0_4px_12px_-4px_oklch(0_0_0/0.25)]'
                  : 'glass text-fg hover:text-accent'
              }`}
            >
              {t.systems.category[c]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 버튼만 숨긴다 — 막는 건 서버(/admin/**)가 한다 */}
          {prefs?.admin && (
            <button
              type="button"
              onClick={admin.show}
              aria-haspopup="dialog"
              className="glass flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-[color,scale] duration-200 hover:text-accent active:scale-95"
            >
              <Settings2 className="size-4" aria-hidden="true" />
              {t.systems.admin.open}
            </button>
          )}
          <Segmented<View>
            label={t.systems.view.label}
            value={view}
            onChange={changeView}
            options={[
              { value: 'card', label: t.systems.view.card, icon: LayoutGrid },
              { value: 'list', label: t.systems.view.list, icon: List },
              { value: 'icon', label: t.systems.view.icon, icon: Grid3x3 },
            ]}
          />
        </div>
      </div>

      {/* 검색 · 분류를 고르지 않았을 때만 — 찾는 중에는 결과만 */}
      {!loading && !query.trim() && category === '전체' && recent.length > 0 && (
        <section aria-label={t.systems.recent} className="mb-5">
          <h2 className="mb-2 px-1 text-sm font-bold text-muted">{t.systems.recent}</h2>
          <ul className={FRAME.icon}>
            {recent.map((s) => (
              <ServiceTile key={s.id} service={s} />
            ))}
          </ul>
        </section>
      )}

      <p className="sr-only" aria-live="polite">
        {loading ? t.common.loading : f(t.systems.count, { count: visible.length })}
      </p>

      {!loading && visible.length === 0 ? (
        <div className="glass rounded-3xl py-16 text-center">
          <p className="font-semibold">{t.systems.empty.title}</p>
          <p className="mt-1 text-sm text-muted">{t.systems.empty.hint}</p>
        </div>
      ) : (
        <ul className={FRAME[view]} aria-busy={loading || undefined}>
          {loading
            ? Array.from({ length: SKELETON_COUNT }, (_, i) => <Skeleton key={i} />)
            : visible.map((s) =>
                view === 'icon' ? (
                  <ServiceTile key={s.id} service={s} />
                ) : view === 'list' ? (
                  <ServiceRow key={s.id} service={s} favorite={favorites.includes(s.id)} onToggleFavorite={onToggleFavorite} />
                ) : (
                  <ServiceCard key={s.id} service={s} variant="detailed" favorite={favorites.includes(s.id)} onToggleFavorite={onToggleFavorite} />
                ),
              )}
        </ul>
      )}

      {admin.mounted && (
        <Suspense>
          <ServiceAdmin key={admin.key} open={admin.open} onClose={admin.close} />
        </Suspense>
      )}
    </>
  )
}
