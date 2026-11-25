import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, Megaphone, PenLine, Star, Wrench } from 'lucide-react'
import { Suspense, lazy, useRef, useState, type MouseEvent, type ReactNode, type TouchEvent } from 'react'
import { useNow, useLazyModal } from '@/shared/hooks'
import { useI18n, type Plural } from '@/shared/i18n'
import { canWriteNotice, toIso } from '@/shared/lib'
import { formatDate, longToday, shortDate } from '@/shared/format'
import { placeStyle, type DecorPos } from '@/features/decor'
import type { StackSize } from '@/shared/widget'
import { greetings, plainGreeting } from '../lib/greetings'
import { maintenanceQueries } from '@/features/maintenance'
import { scheduleQueries } from '@/features/schedule'
import { noticeQueries } from '../api/queries'
import type { Me, Notice } from '@/shared/types'
import { LoadError, SkeletonText, DetailModal } from '@/shared/ui'
import { HeroIllustration } from './HeroIllustration'

// 눌러서 열 때 받는다 — 첫 화면 번들에서 뺀다
const NoticeComposer = lazy(() => import('./NoticeComposer').then((m) => ({ default: m.NoticeComposer })))

interface HeroCardProps {
  me: Me | null
  /** 로그인 정보를 받는 중 — 인사 · 즐겨찾기 수는 자리만 잡아 둔다 */
  loading?: boolean
  favoriteCount: number
  /** 카드 배경 그림과 자리 — 사용자가 고른 그림(data URL), 없으면 오른쪽에 건물 그림 */
  image?: { src: string; pos: DecorPos } | null
  /** 좁은 화면 크기 — 작게는 날짜 · 인사만, 크게는 휴대폰에서도 오늘 요약까지 */
  size?: StackSize
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
 * 인사 + 오늘 요약 + 전사 공지. 옅은 하늘색 배경, 오른쪽에 건물 그림 — 위젯 편집의 꾸미기에서 그림을 고르면 카드 전체에 깐다.
 * 카드가 옆 패널 높이에 맞춰 늘어나도 내용은 세로 가운데에 둔다.
 */
export function HeroCard({ me, loading = false, favoriteCount, image, size, className = '' }: HeroCardProps) {
  // 자정을 넘겨 켜 두어도 날짜가 바뀌게
  const now = useNow()
  // 오늘 일정 수 — 오늘 패널과 같은 요청(오늘 + 지난 2주)의 마지막 날
  const schedule = useQuery({ ...scheduleQueries.recent(toIso(now)), select: (days) => days.at(-1)?.items ?? [] })
  const maintenance = useQuery(maintenanceQueries.list())
  const { t, lang } = useI18n()
  // 고른 그림은 카드 전체를 덮고, 글자가 있는 왼쪽부터 바탕색으로 옅게 덮는다(styles/home.css 의 .hero-scrim)
  const picture = image && (
    <>
      <img data-decor="hero" src={image.src} alt="" style={placeStyle(image.pos)} className="pointer-events-none absolute inset-0 size-full object-cover" />
      <div aria-hidden="true" className="hero-scrim pointer-events-none absolute inset-0" />
    </>
  )

  // 한 줄(4×1) — 날짜와 인사 한 줄. 공지는 넓게 이상에서
  if (size === '4x1') {
    return (
      <section className={`hero relative flex flex-col justify-center overflow-hidden rounded-3xl px-5 ${className}`}>
        {picture}
        <p className="relative text-xs font-semibold text-accent">{longToday(now, lang)}</p>
        <div className="relative [&_h1]:mt-0.5 [&_h1]:line-clamp-1 [&_h1]:text-base">
          <Greeting name={me?.name} loading={loading} small />
        </div>
      </section>
    )
  }

  // 넓게(4×2) — 날짜 · 인사(두 줄까지)와 전사 공지 한 줄
  if (size === 'w') {
    return (
      <section className={`hero relative flex flex-col justify-center gap-3 overflow-hidden rounded-3xl p-5 ${className}`}>
        {picture}
        <div className="relative [&_h1]:line-clamp-2">
          <p className="text-[13px] font-semibold text-accent">{longToday(now, lang)}</p>
          <Greeting name={me?.name} loading={loading} small />
        </div>
        <NoticeTicker canWrite={canWriteNotice(me)} compact />
      </section>
    )
  }

  // 작게(반 칸) — 날짜와 인사만. 공지는 넓게 이상에서
  if (size === 's') {
    return (
      <section className={`hero relative flex flex-col overflow-hidden rounded-3xl p-4 ${className}`}>
        {picture}
        <p className="relative text-[13px] font-semibold text-accent">{longToday(now, lang)}</p>
        <Greeting name={me?.name} loading={loading} small />
      </section>
    )
  }

  return (
    <section className={`hero @container relative flex flex-col justify-center overflow-hidden rounded-3xl fit:gap-4 fit:px-8 fit:py-6 ${size ? 'gap-4 p-5' : 'gap-6 p-6 sm:p-8'} ${className}`}>
      {/* 카드 높이에 맞춰 잘리지 않게 그리고, 왼쪽으로 갈수록 배경에 녹인다 */}
      {picture ?? (
        <HeroIllustration className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-auto max-w-[62%] mask-[linear-gradient(to_right,transparent,black_45%)] sm:block dark:opacity-35 dark:saturate-50" />
      )}

      <div className="relative sm:max-w-[60%]">
        <p className="text-[15px] font-semibold text-accent">{longToday(now, lang)}</p>
        <Greeting name={me?.name} loading={loading} />
        {/* 한 칸 높이에서는 안내 문구를 뺀다 — 큰 칸(L)에서만 */}
        <p className="mt-3 text-base/relaxed text-muted max-sm:mt-2 max-sm:text-[15px]/relaxed fit:hidden tall:block">{t.home.hero.lead}</p>

        {/* 휴대폰 · 좁은 칸에서는 요약을 뺀다 — 일정 · 점검 위젯이 같은 숫자를 보여준다. 크게면 휴대폰에서도 */}
        <div className={`mt-6 flex flex-wrap gap-2.5 fit:mt-4 fit:@max-[720px]:hidden ${size === 'l' ? 'max-sm:mt-4 max-sm:gap-2' : 'max-sm:hidden'}`}>
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

      <NoticeTicker canWrite={canWriteNotice(me)} compact={!!size} />
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
 * 문구 길이가 달라도 카드 높이가 같도록 두 줄 자리를 잡아 두고, 한 화면 모드에서는 한 줄로 맞춘다. small 은 작은 인사 카드(반 칸)의 작은 글씨.
 */
function Greeting({ name, loading, small = false }: { name?: string; loading: boolean; small?: boolean }) {
  // 한 번 고른 자리 · 시각은 그대로 — 이름이 늦게 와도, 켜 둔 채 시간대가 바뀌어도 같은 문구를 쓴다
  const [pick] = useState(Math.random)
  const [now] = useState(() => new Date())
  const { t } = useI18n()
  const lines = name ? greetings(now, name, t.greetings) : [plainGreeting(now, t.greetings)]
  const line = lines[Math.floor(pick * lines.length)]

  if (small) {
    return (
      <h1 className="relative mt-1.5 line-clamp-4 text-lg/snug font-bold tracking-[-0.02em] break-keep">
        {loading ? <SkeletonText className="h-[0.9em] w-full rounded-lg" /> : line}
      </h1>
    )
  }

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
      <span key={line} className="block animate-greet fit:line-clamp-2">
        {line} <span aria-hidden="true">👋</span>
      </span>
    </h1>
  )
}

/**
 * 전사 공지 한 건씩. 날짜 · 넘김 버튼은 오른쪽에 모아 세로 가운데로 맞춘다. admin 이면 맨 오른쪽에 작성 단추.
 * 카드가 좁으면(인사 카드 폭 720px 아래) 위 줄에 '전사 공지' · 넘김, 아래 줄에 공지 글을 폭 가득 — 글이 몇 글자로 잘리지 않게.
 */
/** compact — 좁은 화면 고정 칸: 한 줄에 표시 · 제목 · 쓰기만(넘기기는 좌우로 쓸기 · 펼쳐 보기에서) */
function NoticeTicker({ canWrite, compact = false, className = '' }: { canWrite: boolean; compact?: boolean; className?: string }) {
  const { data, isPending: loading, error } = useQuery(noticeQueries.list())
  const { t, lang } = useI18n()
  const [index, setIndex] = useState(0)
  const composer = useLazyModal()
  const [detail, setDetail] = useState<number | null>(null)
  const notices = data ?? []
  const n = notices[index] as Notice | undefined
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
      className={`hero-glass relative flex items-center rounded-2xl sm:max-w-[min(100%,760px)] ${compact ? 'gap-2.5 py-2 pr-3 pl-2' : 'flex-wrap gap-x-4 gap-y-2.5 py-3.5 pr-2.5 pl-4 @min-[720px]:flex-nowrap'} ${className}`}
    >
      {/* 한 줄(compact)은 아이콘만 — 좁은 칸(3×2)에서도 제목이 보이게 */}
      <span className={`flex flex-none items-center gap-1.5 rounded-xl bg-accent-fill text-sm font-bold text-white ${compact ? 'p-1.5' : 'px-3 py-2 max-sm:px-2.5 max-sm:py-1.5'}`}>
        <Megaphone className="size-4" aria-hidden="true" />
        <span className={compact ? 'sr-only' : ''}>{t.home.notice.label}</span>
      </span>
      {/* 좌우로 쓸면 이전 · 다음 공지 (위아래는 화면 스크롤 그대로 — touch-pan-y) */}
      <div {...swipe} className={`min-w-0 touch-pan-y overflow-hidden ${compact ? 'flex-1' : 'order-last w-full pr-1.5 @min-[720px]:order-none @min-[720px]:w-auto @min-[720px]:flex-1 @min-[720px]:pr-0'}`} aria-live="polite">
        {loading ? (
          <div className="h-12 animate-pulse rounded-lg bg-fg/[0.07]" />
        ) : error ? (
          <LoadError error={error} className="text-[15px]" />
        ) : n ? (
          // 제목 · 요약은 한 줄로 잘리므로 누르면 전체를 펼쳐 본다 — 원문 링크는 그 안에서
          <NoticeBody key={n.id} notice={n} onOpen={() => setDetail(index)} brief={compact} />
        ) : (
          <p className="text-[15px] text-muted">{t.home.notice.empty}</p>
        )}
      </div>
      <div className="ml-auto flex flex-none items-center gap-1 @min-[720px]:ml-0">
        {n && <span className="mr-2 hidden text-sm font-medium text-muted md:inline">{shortDate(n.date, lang)}</span>}
        {notices.length > 1 && !compact && (
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

function NoticeBody({ notice: n, onOpen, brief = false }: { notice: Notice; onOpen: () => void; brief?: boolean }) {
  const { t } = useI18n()
  return (
    <button type="button" onClick={onOpen} aria-haspopup="dialog" title={t.home.notice.more} className="group block w-full min-w-0 animate-[notice-in_220ms_cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer rounded-lg text-left">
      <span className="flex items-center gap-2.5">
        {n.important && <span className="flex-none rounded-md bg-danger-fill px-2 py-0.5 text-xs font-bold text-white">{t.home.notice.important}</span>}
        {/* min-w-0: flex 안에서 글자 길이만큼 버티지 않고 줄어들어 말줄임이 된다 — 없으면 긴 제목이 공지 줄을 화면 밖으로 넓힌다 */}
        <span className="min-w-0 truncate text-base font-bold group-hover:text-accent group-hover:underline">{n.title}</span>
      </span>
      {!brief && <span className="mt-1.5 block truncate text-sm text-muted">{n.summary}</span>}
    </button>
  )
}
