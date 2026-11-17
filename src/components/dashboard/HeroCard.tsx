import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, Megaphone, PenLine, Star, Wrench } from 'lucide-react'
import { Suspense, lazy, useRef, useState, type MouseEvent, type ReactNode, type TouchEvent } from 'react'
import { useNow } from '../../hooks/useNow'
import { useI18n, type Plural } from '../../i18n'
import { formatDate, longToday, shortDate } from '../../lib/format'
import { canWriteNotice } from '../../lib/access'
import { toIso } from '../../lib/calendar'
import { greetings, plainGreeting } from '../../lib/greetings'
import { maintenanceQueries, noticeQueries, scheduleQueries } from '../../queries/dashboard'
import type { Me, Notice } from '../../types/portal'
import { LoadError, SkeletonText } from '../ui/Skeleton'
import { DetailModal } from './DetailModal'
import { HeroIllustration } from './HeroIllustration'
import { useLazyModal } from '../../hooks/useLazyModal'

// 눌러서 열 때 받는다 — 첫 화면 번들에서 뺀다
const NoticeComposer = lazy(() => import('./NoticeComposer').then((m) => ({ default: m.NoticeComposer })))

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
  // 자정을 넘겨 켜 두어도 날짜가 바뀌게
  const now = useNow()
  // 오늘 일정 수 — 오늘 패널과 같은 요청(오늘 + 지난 2주)의 마지막 날
  const schedule = useQuery({ ...scheduleQueries.recent(toIso(now)), select: (days) => days.at(-1)?.items ?? [] })
  const maintenance = useQuery(maintenanceQueries.list())
  const { t, lang } = useI18n()

  return (
    <section className={`hero relative flex flex-col justify-center gap-8 overflow-hidden rounded-3xl p-6 sm:p-10 fit:gap-5 fit:px-9 fit:py-6 ${className}`}>
      {/* 카드 높이에 맞춰 잘리지 않게 그리고, 왼쪽으로 갈수록 배경에 녹인다 */}
      <HeroIllustration className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-auto max-w-[62%] mask-[linear-gradient(to_right,transparent,black_45%)] sm:block dark:opacity-35 dark:saturate-50" />

      <div className="relative sm:max-w-[60%]">
        <p className="text-[15px] font-semibold text-accent">{longToday(now, lang)}</p>
        <Greeting name={me?.name} loading={loading} />
        <p className="mt-3 text-base/relaxed text-muted max-sm:mt-2 max-sm:text-[15px]/relaxed fit:hidden">{t.home.hero.lead}</p>

        {/* 휴대폰에서는 요약을 뺀다 — 바로 아래 일정 · 점검 패널이 같은 숫자를 보여준다 */}
        <div className="mt-6 flex flex-wrap gap-2.5 max-sm:hidden fit:mt-4">
          <Pill icon={<CalendarDays className="size-[18px]" aria-hidden="true" />}>
            <Count entry={t.home.hero.schedule} value={schedule.data?.length} loading={schedule.isPending} />
          </Pill>
          <Pill icon={<Wrench className="size-[18px]" aria-hidden="true" />}>
            <Count entry={t.home.hero.maintenance} value={maintenance.data?.length} loading={maintenance.isPending} />
          </Pill>
          <Pill icon={<Star className="size-[18px]" aria-hidden="true" />}>
            <Count entry={t.home.hero.favorites} value={favoriteCount} loading={loading} />
          </Pill>
        </div>
      </div>

      {/* 한 줄 화면(xl 미만)에서는 일정 아래에 따로 둔다 (HomePage 의 NoticeBar) */}
      <NoticeTicker canWrite={canWriteNotice(me)} className="max-xl:hidden" />
    </section>
  )
}

/** 요약 문구. 숫자가 오기 전에는 숫자 폭만큼 자리를 잡아 두고, 못 불러왔으면 '–' */
function Count({ entry, value, loading }: { entry: Plural; value?: number; loading: boolean }) {
  const { rich } = useI18n()
  return rich(entry, { count: loading ? <SkeletonText className="h-4 w-5" /> : (value ?? '–') }, value)
}

/**
 * 인사 문구 — 시간대 · 요일에 맞는 문구 중 하나를 새로고침할 때마다 골라 보여준다.
 * 문구 길이가 달라도 카드 높이가 같도록 두 줄 자리를 잡아 두고, 한 화면 모드에서는 한 줄로 맞춘다.
 */
function Greeting({ name, loading }: { name?: string; loading: boolean }) {
  // 한 번 고른 자리 · 시각은 그대로 — 이름이 늦게 와도, 켜 둔 채 시간대가 바뀌어도 같은 문구를 쓴다
  const [pick] = useState(Math.random)
  const [now] = useState(() => new Date())
  const { t } = useI18n()
  const lines = name ? greetings(now, name, t.greetings) : [plainGreeting(now, t.greetings)]
  const line = lines[Math.floor(pick * lines.length)]

  if (loading) {
    return (
      <h1 className="mt-3 min-h-[2.5em] text-[clamp(26px,2.8vw,36px)]/[1.25] max-sm:mt-2 max-sm:min-h-[1.25em] max-sm:text-[25px] fit:min-h-0 fit:text-[32px]">
        <span className="block">
          <SkeletonText className="h-[0.9em] w-[min(440px,90%)] rounded-xl" />
        </span>
        <span className="sr-only">{t.home.hero.greetingLoading}</span>
      </h1>
    )
  }

  return (
    <h1 className="mt-3 min-h-[2.5em] text-[clamp(26px,2.8vw,36px)]/[1.25] font-bold tracking-[-0.03em] text-balance max-sm:mt-2 max-sm:min-h-0 max-sm:text-[25px] fit:min-h-0 fit:text-[32px]">
      <span key={line} className="block animate-greet fit:truncate">
        {line} <span aria-hidden="true">👋</span>
      </span>
    </h1>
  )
}

/** 한 줄 화면(xl 미만)의 전사 공지 — 히어로 밖, 오늘 일정 아래에 유리 카드로 */
export function NoticeBar({ me, className = '' }: { me: Me | null; className?: string }) {
  return <NoticeTicker canWrite={canWriteNotice(me)} surface="panel" className={className} />
}

/**
 * 전사 공지 한 건씩. 날짜 · 넘김 버튼은 오른쪽에 모아 세로 가운데로 맞춘다. admin 이면 맨 오른쪽에 작성 단추.
 * 좁은 화면에서는 위 줄에 '전사 공지' · 넘김, 아래 줄에 공지 글을 폭 가득 — 글이 몇 글자로 잘리지 않게.
 */
function NoticeTicker({ canWrite, surface = 'hero', className = '' }: { canWrite: boolean; surface?: 'hero' | 'panel'; className?: string }) {
  const { data, isPending: loading, error } = useQuery(noticeQueries.list())
  const { t, lang } = useI18n()
  const [index, setIndex] = useState(0)
  const composer = useLazyModal()
  const [detail, setDetail] = useState<number | null>(null)
  const notices = data ?? []
  const n = notices[index]
  // 새로 받으면(공지를 올린 뒤 포함) 맨 앞 — 가장 최근 공지부터
  const [seen, setSeen] = useState(data)
  if (seen !== data) {
    setSeen(data)
    setIndex(0)
  }
  const step = (d: number) => setIndex((i) => (i + d + notices.length) % notices.length)
  const swipe = useSwipe((d) => notices.length > 1 && step(d))
  const arrow =
    'grid size-10 cursor-pointer place-items-center rounded-xl text-muted transition-[background-color,color,scale] duration-150 hover:bg-subtle hover:text-fg active:scale-90'

  return (
    <div
      className={`relative flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-2xl py-3.5 pr-2.5 pl-4 sm:flex-nowrap ${
        surface === 'hero' ? 'hero-glass sm:max-w-[min(100%,760px)]' : 'glass'
      } ${className}`}
    >
      <span className="flex flex-none items-center gap-1.5 rounded-xl bg-accent-fill px-3 py-2 text-sm font-bold text-white max-sm:px-2.5 max-sm:py-1.5">
        <Megaphone className="size-4" aria-hidden="true" />
        {t.home.notice.label}
      </span>
      {/* 좌우로 쓸면 이전 · 다음 공지 (위아래는 화면 스크롤 그대로 — touch-pan-y) */}
      <div {...swipe} className="order-last w-full min-w-0 touch-pan-y overflow-hidden pr-1.5 sm:order-none sm:w-auto sm:flex-1 sm:pr-0" aria-live="polite">
        {loading ? (
          <div className="h-12 animate-pulse rounded-lg bg-fg/[0.07]" />
        ) : error ? (
          <LoadError error={error} className="text-[15px]" />
        ) : n ? (
          // 제목 · 요약은 한 줄로 잘리므로 누르면 전체를 펼쳐 본다 — 원문 링크는 그 안에서
          <NoticeBody key={n.id} notice={n} onOpen={() => setDetail(index)} />
        ) : (
          <p className="text-[15px] text-muted">{t.home.notice.empty}</p>
        )}
      </div>
      <div className="ml-auto flex flex-none items-center gap-1 sm:ml-0">
        {n && <span className="mr-2 hidden text-sm font-medium text-muted md:inline">{shortDate(n.date, lang)}</span>}
        {notices.length > 1 && (
          <>
            <button type="button" onClick={() => step(-1)} aria-label={t.home.notice.prev} className={arrow}>
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <span className="w-10 text-center text-sm text-muted tabular-nums">
              {index + 1}/{notices.length}
            </span>
            <button type="button" onClick={() => step(1)} aria-label={t.home.notice.next} className={arrow}>
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        )}
        {canWrite && (
          <button
            type="button"
            onClick={() => {
              composer.show()
            }}
            aria-haspopup="dialog"
            aria-label={t.compose.notice.open}
            title={t.compose.notice.open}
            className={`${arrow} ml-1 text-accent ring-1 ring-line`}
          >
            <PenLine className="size-[18px]" aria-hidden="true" />
          </button>
        )}
      </div>
      <DetailModal
        items={notices}
        index={detail}
        onIndexChange={(i) => {
          setDetail(i)
          // 펼쳐서 넘긴 공지를 닫은 뒤에도 공지 줄에 그대로
          if (i !== null) setIndex(i)
        }}
        prevLabel={t.home.notice.prev}
        nextLabel={t.home.notice.next}
        content={(x) => ({
          eyebrow: (
            <>
              {x.important && <span className="rounded-md bg-danger-fill px-2 py-0.5 text-xs font-bold text-white">{t.home.notice.important}</span>}
              {t.home.notice.label} · {formatDate(x.date, lang)}
            </>
          ),
          title: x.title,
          lead: x.summary,
          body: x.body,
          link: x.url ? { label: t.home.notice.original, url: x.url } : undefined,
        })}
      />
      {composer.mounted && (
        <Suspense>
          <NoticeComposer key={composer.key} open={composer.open} onClose={composer.close} items={notices} />
        </Suspense>
      )}
    </div>
  )
}

/**
 * 가로로 쓸어 넘기기 — 가로로 40px 넘게, 세로보다 크게 움직이면 그 방향으로 한 칸(왼쪽으로 쓸면 다음).
 * 넘긴 직후의 탭(click)은 막는다 — 쓸다가 공지 창이 열리지 않게.
 */
function useSwipe(onStep: (d: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)
  return {
    onTouchStart(e: TouchEvent<HTMLElement>) {
      start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      swiped.current = false
    },
    onTouchEnd(e: TouchEvent<HTMLElement>) {
      const s = start.current
      start.current = null
      if (!s) return
      const dx = e.changedTouches[0].clientX - s.x
      const dy = e.changedTouches[0].clientY - s.y
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return
      swiped.current = true
      onStep(dx < 0 ? 1 : -1)
    },
    onClickCapture(e: MouseEvent<HTMLElement>) {
      if (!swiped.current) return
      swiped.current = false
      e.preventDefault()
      e.stopPropagation()
    },
  }
}

function NoticeBody({ notice: n, onOpen }: { notice: Notice; onOpen: () => void }) {
  const { t } = useI18n()
  return (
    <button type="button" onClick={onOpen} aria-haspopup="dialog" title={t.home.notice.more} className="group block w-full min-w-0 animate-[notice-in_220ms_cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer rounded-lg text-left">
      <span className="flex items-center gap-2.5">
        {n.important && <span className="flex-none rounded-md bg-danger-fill px-2 py-0.5 text-xs font-bold text-white">{t.home.notice.important}</span>}
        {/* min-w-0: flex 안에서 글자 길이만큼 버티지 않고 줄어들어 말줄임이 된다 — 없으면 긴 제목이 공지 줄을 화면 밖으로 넓힌다 */}
        <span className="min-w-0 truncate text-base font-bold group-hover:text-accent group-hover:underline">{n.title}</span>
      </span>
      <span className="mt-1.5 block truncate text-sm text-muted">{n.summary}</span>
    </button>
  )
}
