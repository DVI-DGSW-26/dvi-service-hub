import { LayoutGrid, List } from 'lucide-react'
import { useState } from 'react'
import { NoDepartmentNotice } from '../components/dashboard/NoDepartmentNotice'
import { SearchBox } from '../components/layout/SearchBox'
import { ServiceCard } from '../components/services/ServiceCard'
import { ServiceRow } from '../components/services/ServiceRow'
import { ServiceCardSkeleton, ServiceRowSkeleton } from '../components/services/ServiceSkeleton'
import { PageTitle } from '../components/ui/PageTitle'
import { Segmented } from '../components/ui/Segmented'
import type { Category, Service } from '../../services'
import { useI18n } from '../i18n'
import { hasNoDepartment, matchesQuery } from '../lib/access'
import { readPref, writePref } from '../lib/theme'
import type { Me } from '../types/portal'

const CATEGORIES: ('전체' | Category)[] = ['전체', '업무', '인사', '정보', '사내문화']
const VIEW_KEY = 'portal-systems-view'
const SKELETON_COUNT = 9

type View = 'card' | 'list'

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
  const [view, setView] = useState<View>(() => (readPref(VIEW_KEY) === 'list' ? 'list' : 'card'))
  const changeView = (v: View) => {
    setView(v)
    writePref(VIEW_KEY, v === 'card' ? null : v)
  }
  const visible = services.filter((s) => (category === '전체' || s.category === category) && matchesQuery(s, query))

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
        <Segmented<View>
          label={t.systems.view.label}
          value={view}
          onChange={changeView}
          options={[
            { value: 'card', label: t.systems.view.card, icon: LayoutGrid },
            { value: 'list', label: t.systems.view.list, icon: List },
          ]}
        />
      </div>

      <p className="sr-only" aria-live="polite">
        {loading ? t.common.loading : f(t.systems.count, { count: visible.length })}
      </p>

      {loading ? (
        view === 'list' ? (
          <ul className="glass divide-y divide-line overflow-hidden rounded-3xl" aria-busy="true">
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <ServiceRowSkeleton key={i} />
            ))}
          </ul>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-4" aria-busy="true">
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <ServiceCardSkeleton key={i} variant="detailed" />
            ))}
          </ul>
        )
      ) : visible.length === 0 ? (
        <div className="glass rounded-3xl py-16 text-center">
          <p className="font-semibold">{t.systems.empty.title}</p>
          <p className="mt-1 text-sm text-muted">{t.systems.empty.hint}</p>
        </div>
      ) : view === 'list' ? (
        <ul className="glass divide-y divide-line overflow-hidden rounded-3xl">
          {visible.map((s) => (
            <ServiceRow key={s.id} service={s} favorite={favorites.includes(s.id)} onToggleFavorite={onToggleFavorite} />
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-4">
          {visible.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              variant="detailed"
              favorite={favorites.includes(s.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </ul>
      )}
    </>
  )
}
