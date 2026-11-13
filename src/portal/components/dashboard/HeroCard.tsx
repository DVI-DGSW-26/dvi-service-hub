import { CalendarDays, ChevronLeft, ChevronRight, Megaphone, Star, Wrench } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { portalApi } from '../../api/portal'
import { useAsync } from '../../hooks/useAsync'
import { useNow } from '../../hooks/useNow'
import { longToday, shortDate } from '../../lib/format'
import { greetings, plainGreeting } from '../../lib/greetings'
import type { Me } from '../../types/portal'
import { SkeletonText } from '../ui/Skeleton'
import { HeroIllustration } from './HeroIllustration'

interface HeroCardProps {
  me: Me | null
  /** 로그인 정보를 받는 중 — 인사 · 즐겨찾기 수는 자리만 잡아 둔다 */
  loading?: boolean
  favoriteCount: number
  className?: string
}

function Pill({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="hero-glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-[15px] font-semibold">
      <span className="text-accent">{icon}</span>
      {children}
    </span>
  )
}

/**
 * 인사 + 오늘 요약 + 전사 공지. 옅은 하늘색 배경, 오른쪽에 건물 그림.
 * 카드가 옆 패널 높이에 맞춰 늘어나도 내용은 세로 가운데에 둔다.
 */
export function HeroCard({ me, loading = false, favoriteCount, className = '' }: HeroCardProps) {
  const schedule = useAsync(portalApi.schedule)
  const maintenance = useAsync(portalApi.maintenance)
  // 자정을 넘겨 켜 두어도 날짜가 바뀌게
  const now = useNow()

  return (
    <section className={`hero relative flex flex-col justify-center gap-8 overflow-hidden rounded-3xl p-7 sm:p-10 fit:gap-5 fit:px-9 fit:py-6 ${className}`}>
      {/* 카드 높이에 맞춰 잘리지 않게 그리고, 왼쪽으로 갈수록 배경에 녹인다 */}
      <HeroIllustration className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-auto max-w-[62%] mask-[linear-gradient(to_right,transparent,black_45%)] sm:block dark:opacity-35 dark:saturate-50" />

      <div className="relative sm:max-w-[60%]">
        <p className="text-[15px] font-semibold text-accent">{longToday(now)}</p>
        <Greeting name={me?.name} loading={loading} />
        <p className="mt-3 text-base/relaxed text-muted fit:hidden">오늘도 DVI Portal에서 필요한 업무와 정보를 빠르게 확인하세요.</p>

        <div className="mt-6 flex flex-wrap gap-2.5 fit:mt-4">
          <Pill icon={<CalendarDays className="size-[18px]" aria-hidden="true" />}>오늘 일정 <Count value={schedule.data?.length} loading={schedule.loading} />건</Pill>
          <Pill icon={<Wrench className="size-[18px]" aria-hidden="true" />}>점검 · 안내 <Count value={maintenance.data?.length} loading={maintenance.loading} />건</Pill>
          <Pill icon={<Star className="size-[18px]" aria-hidden="true" />}>즐겨찾기 <Count value={favoriteCount} loading={loading} />개</Pill>
        </div>
      </div>

      <NoticeTicker />
    </section>
  )
}

/** 요약 숫자. 오기 전에는 숫자 폭만큼 자리를 잡아 두고, 못 불러왔으면 '–' */
function Count({ value, loading }: { value?: number; loading: boolean }) {
  if (loading) return <SkeletonText className="h-4 w-5" />
  return <>{value ?? '–'}</>
}

/**
 * 인사 문구 — 시간대 · 요일에 맞는 문구 중 하나를 새로고침할 때마다 골라 보여준다.
 * 문구 길이가 달라도 카드 높이가 같도록 두 줄 자리를 잡아 두고, 한 화면 모드에서는 한 줄로 맞춘다.
 */
function Greeting({ name, loading }: { name?: string; loading: boolean }) {
  // 한 번 고른 자리 · 시각은 그대로 — 이름이 늦게 와도, 켜 둔 채 시간대가 바뀌어도 같은 문구를 쓴다
  const [pick] = useState(Math.random)
  const [now] = useState(() => new Date())
  const lines = name ? greetings(now, name) : [plainGreeting(now)]
  const line = lines[Math.floor(pick * lines.length)]

  if (loading) {
    return (
      <h1 className="mt-3 min-h-[2.5em] text-[clamp(26px,2.8vw,36px)]/[1.25] fit:min-h-0 fit:text-[32px]">
        <span className="block">
          <SkeletonText className="h-[0.9em] w-[min(440px,90%)] rounded-xl" />
        </span>
        <span className="sr-only">인사말 불러오는 중</span>
      </h1>
    )
  }

  return (
    <h1 className="mt-3 min-h-[2.5em] text-[clamp(26px,2.8vw,36px)]/[1.25] font-bold tracking-[-0.03em] text-balance fit:min-h-0 fit:text-[32px]">
      <span key={line} className="block animate-greet fit:truncate">
        {line} <span aria-hidden="true">👋</span>
      </span>
    </h1>
  )
}

/** 전사 공지 한 건씩. 날짜 · 넘김 버튼은 오른쪽에 모아 세로 가운데로 맞춘다. */
function NoticeTicker() {
  const { data, loading } = useAsync(portalApi.notices)
  const [index, setIndex] = useState(0)
  const notices = data ?? []
  const n = notices[index]
  const step = (d: number) => setIndex((i) => (i + d + notices.length) % notices.length)
  const arrow =
    'grid size-10 cursor-pointer place-items-center rounded-xl text-muted transition-[background-color,color,scale] duration-150 hover:bg-subtle hover:text-fg active:scale-90'

  return (
    <div className="hero-glass relative flex items-center gap-4 rounded-2xl py-3.5 pr-2.5 pl-4 sm:max-w-[min(100%,760px)]">
      <span className="hidden flex-none items-center gap-1.5 rounded-xl bg-accent-fill px-3 py-2 text-sm font-bold text-white sm:flex">
        <Megaphone className="size-4" aria-hidden="true" />
        전사 공지
      </span>
      <div className="min-w-0 flex-1" aria-live="polite">
        {loading ? (
          <div className="h-12 animate-pulse rounded-lg bg-fg/[0.07]" />
        ) : n ? (
          <a href={n.url} target="_blank" rel="noreferrer" className="group block min-w-0">
            <span className="flex items-center gap-2.5">
              {n.important && <span className="flex-none rounded-md bg-danger px-2 py-0.5 text-xs font-bold text-white">중요</span>}
              <span className="truncate text-base font-bold group-hover:text-accent group-hover:underline">{n.title}</span>
            </span>
            <span className="mt-1.5 block truncate text-sm text-muted">{n.summary}</span>
          </a>
        ) : (
          <p className="text-[15px] text-muted">새 공지가 없습니다.</p>
        )}
      </div>
      <div className="flex flex-none items-center gap-1">
        {n && <span className="mr-2 hidden text-sm font-medium text-muted md:inline">{shortDate(n.date)}</span>}
        {notices.length > 1 && (
          <>
            <button type="button" onClick={() => step(-1)} aria-label="이전 공지" className={arrow}>
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <span className="w-10 text-center text-sm text-muted tabular-nums">
              {index + 1}/{notices.length}
            </span>
            <button type="button" onClick={() => step(1)} aria-label="다음 공지" className={arrow}>
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
