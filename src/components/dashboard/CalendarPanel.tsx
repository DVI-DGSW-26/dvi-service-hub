import { useQuery } from '@tanstack/react-query'
import { CalendarHeart, Maximize2 } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useNow } from '../../hooks/useNow'
import { useI18n } from '../../i18n'
import { monthKey, monthOf, monthTitle, toIso } from '../../lib/calendar'
import { shortDate, useTitle } from '../../lib/format'
import { calendarQueries } from '../../queries/dashboard'
import { CountTag, Panel, SourceTag } from '../ui/Panel'
import { LoadError, Skeleton } from '../ui/Skeleton'
import { EventDot, MonthGrid, WeekdayRow } from './MonthGrid'
import { useLazyModal } from '../../hooks/useLazyModal'

// 눌러서 열 때 받는다 — 첫 화면 번들에서 뺀다
const CalendarModal = lazy(() => import('./CalendarModal').then((m) => ({ default: m.CalendarModal })))

/**
 * 회사 캘린더 — 플로우 "대외업무 공유방"의 이번 달 일정을 점으로 보여준다(조회만, 등록 · 수정은 플로우에서).
 * 날짜를 누르거나 오른쪽 위 버튼을 누르면 크게 보기(달마다 좌우로 넘기는 모달)가 열린다.
 * 아래 줄은 오늘부터 가장 가까운 일정 하나와 남은 개수. 한 화면 모드(fit)에서는 남는 높이에 맞춰 칸이 줄어든다.
 */
export function CalendarPanel({ className = '' }: { className?: string }) {
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
            <Skeleton className="h-56 fit:h-auto fit:flex-1" />
          ) : (
            <MonthGrid month={month} events={events} today={today} variant="compact" onSelect={openAt} className="fit:min-h-0 fit:flex-1" />
          )}
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
          <p className="sr-only">{f(t.calendar.eventCount, { count: events.length })}</p>
        </div>
      )}
      {modal.mounted && (
        <Suspense>
          <CalendarModal key={modal.key} open={modal.open} start={start} today={today} onClose={modal.close} />
        </Suspense>
      )}
    </Panel>
  )
}
