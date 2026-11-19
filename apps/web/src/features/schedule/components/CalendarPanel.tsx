import { useQuery } from '@tanstack/react-query'
import { CalendarHeart, Maximize2 } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useNow, useClipRows, useLazyModal } from '@/shared/hooks'
import { useI18n } from '@/shared/i18n'
import { dtf, eventsOn, monthKey, monthOf, monthTitle, toIso } from '@/shared/lib'
import { longToday, shortDate, useTitle } from '@/shared/format'
import { isMini, type StackSize } from '@dvi/core/widget'
import { calendarQueries } from '../api/queries'
import type { CalendarEvent } from '@dvi/core/types'
import { CountTag, MiniPanel, Panel, SMALL_BODY, SmallPanel, SourceTag, LoadError, Skeleton } from '@/shared/ui'
import { EventDot, MonthGrid, WeekdayRow } from './MonthGrid'

// 눌러서 열 때 받는다 — 첫 화면 번들에서 뺀다
const CalendarModal = lazy(() => import('./CalendarModal').then((m) => ({ default: m.CalendarModal })))


/**
 * 회사 캘린더 — 플로우 "대외업무 공유방"의 이번 달 일정을 점으로 보여준다(조회만, 등록 · 수정은 플로우에서).
 * 날짜를 누르거나 오른쪽 위 버튼을 누르면 크게 보기(달마다 좌우로 넘기는 모달)가 열린다.
 * 아래 줄은 오늘부터 가장 가까운 일정 하나와 남은 개수. 한 화면 모드(fit) · 좁은 화면 크게(4×4)에서는 남는 높이에 맞춰 칸이 줄어든다.
 * 좁은 화면 넓게(4×2)는 오늘 날짜와 다가오는 일정, 보통(4×3)은 이번 주와 다가오는 일정 — 달력 한 달은 그 높이에 들어가지 않는다.
 */
export function CalendarPanel({ size, className = '' }: { size?: StackSize; className?: string }) {
  const { t, f, lang, locale } = useI18n()
  const title = useTitle()
  const now = useNow()
  const month = monthOf(now)
  const today = toIso(now)
  const { data, isPending: loading, error } = useQuery(calendarQueries.month(monthKey(month)))
  const modal = useLazyModal()
  const [start, setStart] = useState(today)
  const events = data ?? []
  // 오늘부터 이달 끝까지. 아래 줄은 높이가 늘 같도록 가장 가까운 하나만 쓰고 나머지는 '외 n건' 으로 — 전체는 크게 보기에서
  const [next, ...later] = events.filter((e) => (e.end ?? e.date) >= today)

  const openAt = (iso: string) => {
    setStart(iso)
    modal.show()
  }
  // 다가오는 일정 줄 — 넓게 · 보통에서 들어가는 만큼(useClipRows)
  const rows = useClipRows<HTMLUListElement>(size === 'w' || size === 'm')
  const upcoming = next ? (
    <ul ref={rows} className="min-h-0 flex-1 overflow-hidden">
      {[next, ...later].map((e) => (
        <li key={e.id}>
          <button
            type="button"
            onClick={() => openAt(e.date < today ? today : e.date)}
            className="-mx-1.5 flex w-[calc(100%+0.75rem)] min-w-0 cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-subtle"
          >
            <EventDot event={e} className="size-2.5 flex-none" />
            <span className="min-w-0 truncate text-[15px] font-semibold">{title(e.title)}</span>
            <span className="ml-auto flex-none text-[13px] text-muted">{e.date <= today ? t.calendar.today : shortDate(e.date, lang)}</span>
          </button>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-muted break-keep">{events.length ? t.calendar.noneLeft : t.calendar.monthEmpty}</p>
  )
  const bigView = modal.mounted && (
    <Suspense>
      <CalendarModal key={modal.key} open={modal.open} start={start} today={today} onClose={modal.close} />
    </Suspense>
  )

  // 아주 작은 칸 — 오늘 날짜, 한 줄 띠면 다가오는 일정까지. 누르면 크게 보기
  if (isMini(size)) {
    return (
      <MiniPanel
        size={size}
        title={t.calendar.title}
        icon={CalendarHeart}
        value={now.getDate()}
        detail={next ? `${next.date <= today ? t.calendar.today : shortDate(next.date, lang)} · ${title(next.title)}` : loading || error ? undefined : events.length ? t.calendar.noneLeft : t.calendar.monthEmpty}
        onClick={() => openAt(next && next.date > today ? next.date : today)}
        className={className}
      >
        {bigView}
      </MiniPanel>
    )
  }

  // 넓게(4×2) — 왼쪽에 오늘 요일 · 날짜를 크게, 오른쪽에 다가오는 일정
  if (size === 'w') {
    return (
      <SmallPanel title={t.calendar.title} icon={CalendarHeart} className={className}>
        <div className="flex min-h-0 flex-1 gap-4">
          <button type="button" onClick={() => openAt(today)} aria-haspopup="dialog" aria-label={t.calendar.expand} className={`${SMALL_BODY} flex-none`}>
            <span className="text-[13px] font-bold text-accent">{dtf(locale, { weekday: 'long' }).format(now)}</span>
            <span className="text-[34px]/none font-bold tracking-[-0.03em] tabular-nums">{now.getDate()}</span>
          </button>
          <div className="flex min-w-0 flex-1 flex-col border-l border-line pl-4">
            {loading ? <Skeleton className="h-16 w-full" /> : error ? <LoadError error={error} className="text-sm" /> : upcoming}
          </div>
        </div>
        {bigView}
      </SmallPanel>
    )
  }

  // 작게 — iOS 캘린더 작은 위젯처럼 오늘 요일 · 날짜를 크게, 아래에 다가오는 일정 하나. 누르면 크게 보기
  if (size === 's') {
    return (
      <SmallPanel title={t.calendar.title} icon={CalendarHeart} className={className}>
        <button type="button" onClick={() => openAt(next && next.date > today ? next.date : today)} aria-haspopup="dialog" aria-label={t.calendar.expand} className={SMALL_BODY}>
          <span className="text-[13px] font-bold text-accent">{dtf(locale, { weekday: 'long' }).format(now)}</span>
          <span className="text-[34px]/none font-bold tracking-[-0.03em] tabular-nums">{now.getDate()}</span>
          <span className="mt-auto w-full pt-3">
            {loading ? (
              <Skeleton className="h-9 w-full" />
            ) : error ? (
              <LoadError error={error} className="text-sm" />
            ) : next ? (
              <>
                <span className="flex items-center gap-1.5">
                  <EventDot event={next} className="size-2 flex-none" />
                  <span className="truncate text-sm font-semibold">{title(next.title)}</span>
                </span>
                <span className="block text-[13px] text-muted">
                  {next.date <= today ? t.calendar.today : shortDate(next.date, lang)}
                  {later.length > 0 && ` · ${f(t.calendar.later, { count: later.length })}`}
                </span>
              </>
            ) : (
              <span className="block text-[13px] text-muted break-keep">{events.length ? t.calendar.noneLeft : t.calendar.monthEmpty}</span>
            )}
          </span>
        </button>
        {bigView}
      </SmallPanel>
    )
  }

  const iconButton =
    'grid size-9 cursor-pointer place-items-center rounded-xl text-muted transition-[background-color,color,scale] duration-150 hover:bg-subtle hover:text-fg active:scale-90'

  return (
    <Panel
      title={t.calendar.title}
      icon={CalendarHeart}
      meta={
        <>
          <CountTag>{monthTitle(month, locale)}</CountTag>
          {/* 오늘 — 달력 칸의 파란 테두리와 같은 날 */}
          <SourceTag>
            {t.calendar.today} {shortDate(today, lang)}
          </SourceTag>
        </>
      }
      toolbar={
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => openAt(today)} aria-haspopup="dialog" aria-label={t.calendar.expand} title={t.calendar.expand} className={iconButton}>
            <Maximize2 className="size-[18px]" aria-hidden="true" />
          </button>
        </div>
      }
      className={`fit:overflow-hidden ${className}`}
    >
      {error ? (
        <LoadError error={error} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <WeekdayRow className="mb-1" />
          {loading ? (
            <Skeleton className={`h-56 fit:h-auto fit:flex-1 ${size ? 'h-auto flex-1' : ''}`} />
          ) : size === 'm' ? (
            <WeekStrip events={events} now={now} today={today} onSelect={openAt} />
          ) : (
            <MonthGrid month={month} events={events} today={today} variant="compact" onSelect={openAt} className={`fit:min-h-0 fit:flex-1 ${size ? 'min-h-0 flex-1' : ''}`} />
          )}
          {size === 'm' ? (
            <div className="mt-2 flex min-h-0 flex-1 flex-col border-t border-line pt-2">{loading ? <Skeleton className="h-5 w-2/3" /> : upcoming}</div>
          ) : (
            <div className="mt-3 flex min-w-0 items-center gap-2.5 border-t border-line pt-3 fit:mt-2 fit:pt-2">
              {loading ? (
                <Skeleton className="h-5 w-2/3" />
              ) : next ? (
                <button
                  type="button"
                  onClick={() => openAt(next.date < today ? today : next.date)}
                  className="-mx-1.5 flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-1.5 py-0.5 text-left transition-colors hover:bg-subtle"
                >
                  <span className="flex-none text-[13px] font-semibold text-muted">{t.calendar.upNext}</span>
                  <EventDot event={next} className="size-2.5" />
                  <span className="min-w-0 truncate text-[15px] font-semibold">{title(next.title)}</span>
                  <span className="ml-auto flex-none text-[13px] text-muted">{next.date <= today ? t.calendar.today : shortDate(next.date, lang)}</span>
                  {later.length > 0 && (
                    <span className="flex-none rounded-full bg-subtle px-2 py-0.5 text-xs font-semibold text-muted ring-1 ring-line">
                      {f(t.calendar.later, { count: later.length })}
                    </span>
                  )}
                </button>
              ) : (
                <p className="flex-1 text-sm text-muted">{events.length ? t.calendar.noneLeft : t.calendar.monthEmpty}</p>
              )}
            </div>
          )}
          <p className="sr-only">{f(t.calendar.eventCount, { count: events.length })}</p>
        </div>
      )}
      {bigView}
    </Panel>
  )
}

/** 이번 주 한 줄 — 날짜와 일정 점. 누르면 크게 보기를 그날로 연다(좁은 화면 보통 4×3) */
function WeekStrip({ events, now, today, onSelect }: { events: CalendarEvent[]; now: Date; today: string; onSelect: (iso: string) => void }) {
  const { t, f, lang } = useI18n()
  const days = Array.from({ length: 7 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + i))
  return (
    <div className="grid grid-cols-7">
      {days.map((d) => {
        const iso = toIso(d)
        const items = eventsOn(events, iso)
        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelect(iso)}
            aria-label={[longToday(d, lang), items.length ? f(t.calendar.dayCount, { count: items.length }) : ''].filter(Boolean).join(', ')}
            className="flex cursor-pointer flex-col items-center gap-0.5 rounded-xl py-1 transition-colors hover:bg-subtle"
          >
            <span className={`grid size-8 place-items-center rounded-full text-sm font-semibold tabular-nums ${iso === today ? 'bg-accent-fill text-white' : d.getDay() === 0 ? 'text-danger' : ''}`}>
              {d.getDate()}
            </span>
            <span className="flex h-1.5 gap-0.5" aria-hidden="true">
              {items.slice(0, 3).map((e) => (
                <EventDot key={e.id} event={e} className="size-1.5" />
              ))}
            </span>
          </button>
        )
      })}
    </div>
  )
}
