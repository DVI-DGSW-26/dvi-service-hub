import { Cake, PartyPopper } from 'lucide-react'
import { useI18n } from '../../i18n'
import { eventsOn, inMonth, monthWeeks, toIso, weekdayNames, type Month } from '../../lib/calendar'
import { longToday } from '../../lib/format'
import type { CalendarEvent } from '../../types/portal'

/** 모달 칸에 이름으로 보여줄 개수 — 나머지는 '+n' */
const CHIPS = 3

/** 행사는 강조색, 생일은 호박색 — 칸 · 점 · 목록이 같은 색을 쓴다 */
export const DOT = { event: 'bg-accent-fill', birthday: 'bg-amber' } as const

export function KindIcon({ kind, className = '' }: { kind: CalendarEvent['kind']; className?: string }) {
  const C = kind === 'birthday' ? Cake : PartyPopper
  return <C className={`${kind === 'birthday' ? 'text-warn' : 'text-accent'} ${className}`} aria-hidden="true" />
}

/** 칸 · 목록에 보여줄 이름 — 생일은 '○○ 님 생일' */
export function useEventLabel() {
  const { t, f } = useI18n()
  return (e: CalendarEvent) => (e.kind === 'birthday' ? f(t.calendar.birthday, { name: e.title }) : e.title)
}

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
  const label = useEventLabel()
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
              <span key={e.id} className={`size-1.5 rounded-full ${DOT[e.kind]}`} />
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
              title={items.map(label).join('\n') || undefined}
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
                  className={`flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[13px] font-semibold ${e.kind === 'birthday' ? 'bg-amber/20' : 'bg-accent-soft text-accent'}`}
                >
                  <KindIcon kind={e.kind} className="size-3.5 flex-none" />
                  <span className="truncate">{label(e)}</span>
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
