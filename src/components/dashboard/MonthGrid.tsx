import { useI18n } from '../../i18n'
import { eventsOn, inMonth, monthWeeks, toIso, weekdayNames, type Month } from '../../lib/calendar'
import { longToday, useTitle } from '../../lib/format'
import type { CalendarEvent } from '../../types/portal'

/** 모달 칸에 이름으로 보여줄 개수 — 나머지는 '+n' */
const CHIPS = 3

/**
 * 일정 색 점 — 플로우 일정 색(color), 없으면 강조색. 칸 · 점 · 목록이 같은 색을 쓴다.
 * 플로우는 분류 이름을 주지 않아 색으로만 구분한다 (명세 4.1).
 */
export function EventDot({ event, className = 'size-2' }: { event: CalendarEvent; className?: string }) {
  return (
    <span
      className={`flex-none rounded-full ${event.color ? '' : 'bg-accent-fill'} ${className}`}
      style={event.color ? { backgroundColor: event.color } : undefined}
      aria-hidden="true"
    />
  )
}

/** 칸 안 이름표 바탕 — 일정 색을 옅게 */
const chipStyle = (e: CalendarEvent) => (e.color ? { backgroundColor: `color-mix(in oklab, ${e.color} 18%, transparent)` } : undefined)

/** 요일 머리줄. 모달에서는 넘겨지는 달 밖에 따로 둔다 */
export function WeekdayRow({ className = '' }: { className?: string }) {
  const { locale } = useI18n()
  return (
    <div className={`grid grid-cols-7 text-center text-[13px] font-semibold text-muted ${className}`} aria-hidden="true">
      {weekdayNames(locale).map((w, i) => (
        <span key={w} className={i === 0 ? 'text-danger' : ''}>
          {w}
        </span>
      ))}
    </div>
  )
}

interface MonthGridProps {
  month: Month
  events: CalendarEvent[]
  /** 오늘 (YYYY-MM-DD) */
  today: string
  /** compact: 홈 카드 — 숫자와 점만 · full: 크게 보기 — 칸마다 이름 */
  variant: 'compact' | 'full'
  selected?: string
  onSelect: (iso: string) => void
  className?: string
}

/**
 * 한 달 달력. 칸을 누르면 그날을 고른다(홈 카드에서는 크게 보기를 그날로 연다).
 * 화면낭독기는 칸마다 '날짜, n건'으로 읽는다.
 */
export function MonthGrid({ month, events, today, variant, selected, onSelect, className = '' }: MonthGridProps) {
  const { t, f, lang } = useI18n()
  const title = useTitle()
  const full = variant === 'full'
  const weeks = monthWeeks(month, full)

  return (
    <div
      className={`grid grid-cols-7 ${full ? '' : 'gap-y-0.5'} ${className}`}
      style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}
    >
      {weeks.flat().map((date) => {
        const iso = toIso(date)
        const own = inMonth(iso, month)
        const items = own ? eventsOn(events, iso) : []
        const isToday = iso === today
        const isSelected = iso === selected
        const sunday = date.getDay() === 0
        const name = [longToday(date, lang), items.length ? f(t.calendar.dayCount, { count: items.length }) : ''].filter(Boolean).join(', ')

        const number = (
          <span
            className={`grid place-items-center rounded-full font-semibold tabular-nums ${full ? 'size-7 text-sm' : 'size-7 text-[13px] fit:size-6'} ${
              isToday ? 'bg-accent-fill text-white' : sunday && own ? 'text-danger' : ''
            }`}
          >
            {date.getDate()}
          </span>
        )
        const dots = items.length > 0 && (
          <span className={`flex justify-center gap-0.5 ${full ? 'sm:hidden' : ''}`} aria-hidden="true">
            {items.slice(0, 3).map((e) => (
              <EventDot key={e.id} event={e} className="size-1.5" />
            ))}
          </span>
        )

        if (!full) {
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              aria-label={name}
              title={items.map((e) => title(e.title)).join('\n') || undefined}
              className={`flex min-h-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl py-0.5 transition-colors hover:bg-subtle ${own ? '' : 'opacity-35'}`}
            >
              {number}
              {dots || <span className="h-1.5" aria-hidden="true" />}
            </button>
          )
        }

        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelect(iso)}
            aria-label={name}
            aria-pressed={isSelected}
            className={`flex min-h-0 cursor-pointer flex-col gap-1 overflow-hidden border-t border-line p-1 text-left transition-colors sm:p-1.5 ${
              isSelected ? 'bg-accent-soft' : 'hover:bg-subtle'
            } ${own ? '' : 'opacity-35'}`}
          >
            <span className="flex justify-center">{number}</span>
            {dots}
            <span className="hidden min-h-0 flex-col gap-1 sm:flex">
              {items.slice(0, CHIPS).map((e) => (
                <span
                  key={e.id}
                  className={`flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[13px] font-semibold ${e.color ? '' : 'bg-accent-soft text-accent'}`}
                  style={chipStyle(e)}
                >
                  <EventDot event={e} />
                  <span className="truncate">{title(e.title)}</span>
                </span>
              ))}
              {items.length > CHIPS && (
                <span className="px-1.5 text-xs font-semibold text-muted">{f(t.calendar.more, { count: items.length - CHIPS })}</span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
