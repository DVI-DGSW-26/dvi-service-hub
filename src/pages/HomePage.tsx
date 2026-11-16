import { CalendarPanel } from '../components/dashboard/CalendarPanel'
import { HeroCard, NoticeBar } from '../components/dashboard/HeroCard'
import { MaintenancePanel } from '../components/dashboard/MaintenancePanel'
import { NewsPanel } from '../components/dashboard/NewsPanel'
import { NoDepartmentNotice } from '../components/dashboard/NoDepartmentNotice'
import { QuickLinksPanel } from '../components/dashboard/QuickLinksPanel'
import { SystemsPanel } from '../components/dashboard/SystemsPanel'
import { TodayPanel } from '../components/dashboard/TodayPanel'
import type { Service } from '../services'
import { hasNoDepartment } from '../lib/access'
import type { Me } from '../types/portal'

interface HomePageProps {
  me: Me | null
  /** 로그인 정보를 받는 중 — 권한에 따라 달라지는 인사 · 업무시스템은 스켈레톤으로 */
  meLoading: boolean
  /** 권한으로 거른 목록 */
  services: Service[]
  /** 권한과 상관없이 전부 */
  allServices: Service[]
  favorites: string[]
  onToggleFavorite: (id: string) => void
}

/**
 * 넓은 화면 12칸:
 *   1줄  인사·공지(8) | 빠른 바로가기(4)
 *   2줄  업무시스템(8) | 오늘 일정(4)
 *   3줄  점검 안내(4) | 사내 소식(4) | 회사 캘린더(4)
 * 충분히 높은 화면(fit)에서는 화면 높이에 맞춘다. 1줄은 내용만큼, 남는 높이는 2줄 · 3줄이 반씩 나눈다
 * (2줄은 내용보다 작아지지 않는다).
 * 한 줄 화면(xl 미만)은 하루를 시작할 때 볼 순서로 다시 놓는다 — 작은 인사 다음에 오늘 일정이 첫 화면에 온다:
 *   인사 → 오늘 일정 → 전사 공지 → 업무시스템 → 빠른 바로가기 → 점검 안내 → 회사 캘린더 → 사내 소식
 */
export function HomePage({ me, meLoading, services, allServices, favorites, onToggleFavorite }: HomePageProps) {
  const favoriteCount = services.filter((s) => favorites.includes(s.id)).length
  const notice = hasNoDepartment(me)
  const rows = notice ? 'fit:grid-rows-[auto_auto_minmax(auto,1fr)_minmax(0,1fr)]' : 'fit:grid-rows-[auto_minmax(auto,1fr)_minmax(0,1fr)]'

  return (
    // grid-cols-1(minmax(0,1fr)): 한 줄 화면에서 칸이 화면 폭을 넘지 않게 — 정하지 않으면 칸이 내용(말줄임할 긴 글 한 줄)만큼 넓어진다
    <div className={`grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-5 fit:h-full fit:gap-4 ${rows}`}>
      {notice && <NoDepartmentNotice className="xl:col-span-12" />}
      <HeroCard me={me} loading={meLoading} favoriteCount={favoriteCount} className="order-1 sm:min-h-56 xl:order-none xl:col-span-8 xl:min-h-72 fit:min-h-0" />
      <QuickLinksPanel className="order-5 xl:order-none xl:col-span-4" />
      <SystemsPanel
        me={me}
        loading={meLoading}
        services={services}
        allServices={allServices}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
        className="order-4 xl:order-none xl:col-span-8"
      />
      <TodayPanel className="order-2 xl:order-none xl:col-span-4" />
      <NoticeBar me={me} className="order-3 xl:hidden" />
      <MaintenancePanel me={me} className="order-6 xl:order-none xl:col-span-4 fit:min-h-0 fit:overflow-hidden" />
      <NewsPanel className="order-8 xl:order-none xl:col-span-4 fit:min-h-0" />
      <CalendarPanel className="order-7 xl:order-none xl:col-span-4 fit:min-h-0" />
    </div>
  )
}
