import { HeroCard } from '../components/dashboard/HeroCard'
import { MaintenancePanel } from '../components/dashboard/MaintenancePanel'
import { NewsPanel } from '../components/dashboard/NewsPanel'
import { NoDepartmentNotice } from '../components/dashboard/NoDepartmentNotice'
import { PhotoCard } from '../components/dashboard/PhotoCard'
import { QuickLinksPanel } from '../components/dashboard/QuickLinksPanel'
import { SystemsPanel } from '../components/dashboard/SystemsPanel'
import { TodayPanel } from '../components/dashboard/TodayPanel'
import type { Service } from '../../services'
import { hasNoDepartment } from '../lib/access'
import type { Me } from '../types/portal'

interface HomePageProps {
  me: Me | null
  /** 로그인 정보를 받는 중 — 권한에 따라 달라지는 인사 · 업무시스템은 스켈레톤으로 */
  meLoading: boolean
  services: Service[]
  favorites: string[]
  onToggleFavorite: (id: string) => void
}

/**
 * 넓은 화면 12칸:
 *   1줄  인사·공지(8) | 오늘 일정(4)
 *   2줄  업무시스템(8) | 빠른 바로가기(4)
 *   3줄  점검 안내(4) | 사내 소식(4) | 그림(4)
 * 충분히 높은 화면(fit)에서는 화면 높이에 맞춘다. 1줄은 내용만큼, 남는 높이는 2줄 · 3줄이 반씩 나눈다
 * (2줄은 내용보다 작아지지 않는다).
 * 좁은 화면은 한 줄씩, 그림은 뺀다.
 */
export function HomePage({ me, meLoading, services, favorites, onToggleFavorite }: HomePageProps) {
  const favoriteCount = services.filter((s) => favorites.includes(s.id)).length
  const notice = hasNoDepartment(me)
  const rows = notice ? 'fit:grid-rows-[auto_auto_minmax(auto,1fr)_minmax(0,1fr)]' : 'fit:grid-rows-[auto_minmax(auto,1fr)_minmax(0,1fr)]'

  return (
    <div className={`grid gap-4 xl:grid-cols-12 xl:gap-5 fit:h-full fit:gap-4 ${rows}`}>
      {notice && <NoDepartmentNotice className="xl:col-span-12" />}
      <HeroCard me={me} loading={meLoading} favoriteCount={favoriteCount} className="min-h-72 xl:col-span-8 fit:min-h-0" />
      <TodayPanel className="xl:col-span-4" />
      <SystemsPanel loading={meLoading} services={services} favorites={favorites} onToggleFavorite={onToggleFavorite} className="xl:col-span-8" />
      <QuickLinksPanel className="xl:col-span-4" />
      <MaintenancePanel className="xl:col-span-4 fit:min-h-0 fit:overflow-hidden" />
      <NewsPanel className="xl:col-span-4 fit:min-h-0" />
      <PhotoCard className="hidden xl:col-span-4 xl:block fit:min-h-0" />
    </div>
  )
}
