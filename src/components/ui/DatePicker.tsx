import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useI18n } from '../../i18n'
import { addMonths, fromIso, inMonth, monthOf, monthTitle, monthWeeks, toIso, weekdayNames, dtf } from '../../lib/calendar'
import { controlClass } from './Field'
import { PickerPopover } from './PickerPopover'

interface DatePickerProps {
  /** YYYY-MM-DD, 비어 있으면 '' */
  value: string
  onChange: (iso: string) => void
  /** 화면낭독기용 이름 (Field 의 이름과 같게) */
  label: string
  invalid?: boolean
}

/** 날짜를 하루 · 한 주 · 한 달씩 옮기는 키 */
const STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }

/**
 * 날짜 고르기 — 브라우저 기본 달력 대신 회사 캘린더와 같은 모양의 달력.
 * 화살표로 하루 · 한 주, PageUp/PageDown 으로 한 달씩 옮기고 Enter 로 고른다.
 */
export function DatePicker({ value, onChange, label, invalid = false }: DatePickerProps) {
  const { t, locale } = useI18n()
  const anchor = useRef<HTMLButtonElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const today = toIso(new Date())
  /** 키보드로 옮겨 다니는 날 — 보이는 달은 늘 이 날의 달 */
  const [focus, setFocus] = useState(value || today)
  const view = monthOf(fromIso(focus))
  const close = useCallback(() => setOpen(false), [])

  // 펼치거나 날을 옮길 때마다 그 칸에 초점
  useEffect(() => {
    if (open) gridRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${focus}"]`)?.focus()
  }, [open, focus])

  const toggle = () => {
    if (!open) setFocus(value || today)
    setOpen((o) => !o)
  }
  const pick = (iso: string) => {
    onChange(iso)
    setOpen(false)
    anchor.current?.focus()
  }
  const shift = (days: number) => {
    const d = fromIso(focus)
    d.setDate(d.getDate() + days)
    setFocus(toIso(d))
  }
  const shiftMonth = (n: number) => {
    const m = addMonths(view, n)
    // 31일에서 다음 달로 가면 그달 마지막 날로
    const day = Math.min(fromIso(focus).getDate(), new Date(m.y, m.m + 1, 0).getDate())
    setFocus(toIso(new Date(m.y, m.m, day)))
  }
  const onGridKey = (e: KeyboardEvent) => {
    if (e.key in STEP) shift(STEP[e.key])
    else if (e.key === 'PageUp' || e.key === 'PageDown') shiftMonth(e.key === 'PageUp' ? -1 : 1)
    else return
    e.preventDefault()
  }

  const format = (iso: string) =>
    dtf(locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(fromIso(iso))
  const arrow = 'grid size-9 cursor-pointer place-items-center rounded-xl text-muted transition-[background-color,color,scale] duration-150 hover:bg-subtle hover:text-fg active:scale-90'

  return (
    <>
      <button
        ref={anchor}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={value ? `${label}, ${format(value)}` : label}
        aria-invalid={invalid || undefined}
        className={`${controlClass} flex cursor-pointer items-center justify-between gap-2 text-left`}
      >
        <span className={value ? '' : 'text-muted'}>{value ? format(value) : t.common.picker.date}</span>
        <CalendarDays className="size-[18px] flex-none text-muted" aria-hidden="true" />
      </button>

      <PickerPopover open={open} anchor={anchor} onClose={close} label={label} className="w-[300px]">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" onClick={() => shiftMonth(-1)} aria-label={t.calendar.prev} className={arrow}>
            <ChevronLeft className="size-[18px]" aria-hidden="true" />
          </button>
          <p className="text-[15px] font-bold" aria-live="polite">
            {monthTitle(view, locale)}
          </p>
          <button type="button" onClick={() => shiftMonth(1)} aria-label={t.calendar.next} className={arrow}>
            <ChevronRight className="size-[18px]" aria-hidden="true" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 text-center text-xs font-semibold text-muted" aria-hidden="true">
          {weekdayNames(locale).map((w, i) => (
            <span key={w} className={i === 0 ? 'text-danger' : ''}>
              {w}
            </span>
          ))}
        </div>
        <div ref={gridRef} onKeyDown={onGridKey} className="grid grid-cols-7 gap-0.5">
          {monthWeeks(view, true)
            .flat()
            .map((date) => {
              const iso = toIso(date)
              const selected = iso === value
              const own = inMonth(iso, view)
              return (
                <button
                  key={iso}
                  type="button"
                  data-iso={iso}
                  onClick={() => pick(iso)}
                  // 한 칸만 Tab 으로 들어가고 그 안에서는 화살표로 옮긴다
                  tabIndex={iso === focus ? 0 : -1}
                  aria-label={format(iso)}
                  aria-pressed={selected}
                  className={`grid h-9 cursor-pointer place-items-center rounded-xl text-sm font-semibold tabular-nums transition-[background-color,color,scale] duration-150 active:scale-90 ${
                    selected
                      ? 'bg-accent-fill text-white'
                      : iso === today
                        ? 'text-accent ring-1 ring-accent ring-inset hover:bg-accent-soft'
                        : `hover:bg-subtle ${own ? (date.getDay() === 0 ? 'text-danger' : '') : 'text-muted opacity-50'}`
                  }`}
                >
                  {date.getDate()}
                </button>
              )
            })}
        </div>

        <div className="mt-2 flex justify-end gap-1 border-t border-line pt-2">
          <button
            type="button"
            onClick={() => pick(today)}
            className="cursor-pointer rounded-lg px-2.5 py-1 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
          >
            {t.calendar.today}
          </button>
        </div>
      </PickerPopover>
    </>
  )
}
