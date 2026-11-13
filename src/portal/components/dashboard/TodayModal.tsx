import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { portalApi } from '../../api/portal'
import { useAsync } from '../../hooks/useAsync'
import { useI18n } from '../../i18n'
import { longToday, shortDate, toMinutes } from '../../lib/format'
import type { ScheduleItem } from '../../types/portal'
import { SearchBox } from '../layout/SearchBox'
import { Modal } from '../ui/Modal'
import { SourceTag } from '../ui/Panel'
import { Skeleton } from '../ui/Skeleton'
import { NowGuide, ScheduleRow, statusOf } from './ScheduleRow'

interface TodayModalProps {
  /** 오늘 일정 — 지난 일정을 불러오는 동안에도 바로 보여준다 */
  items: ScheduleItem[]
  now: number
  date: Date
  open: boolean
  onClose: () => void
}

const END_OF_DAY = 24 * 60
const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const matches = (s: ScheduleItem, q: string) => `${s.title} ${s.place ?? ''}`.toLowerCase().includes(q)
const halves = (items: ScheduleItem[], labels: { morning: string; afternoon: string }) =>
  [
    { label: labels.morning, items: items.filter((s) => toMinutes(s.start) < 12 * 60) },
    { label: labels.afternoon, items: items.filter((s) => toMinutes(s.start) >= 12 * 60) },
  ].filter((g) => g.items.length)

/**
 * 전체 일정. 왼쪽에서 오늘 · 지난 2주 중 날짜를 고르고, 위 검색칸으로 2주 전체에서 찾는다.
 * 오늘을 열면 지금 하는 일(없으면 다음 일)로 스크롤한다. 지난 날짜는 모두 '끝남'으로 보인다.
 */
export function TodayModal({ items, now, date, open, onClose }: TodayModalProps) {
  const titleId = useId()
  const { t, f, rich, lang } = useI18n()
  const listRef = useRef<HTMLDivElement>(null)
  const history = useAsync(portalApi.scheduleHistory)
  const [day, setDay] = useState(0)
  const [query, setQuery] = useState('')

  const days = history.data ?? [{ date: '', items }]
  const selected = days[day] ?? days[0]
  const isToday = day === 0
  const q = query.trim().toLowerCase()
  const results = q ? days.map((d) => ({ ...d, items: d.items.filter((s) => matches(s, q)) })).filter((d) => d.items.length) : []
  const found = results.reduce((n, d) => n + d.items.length, 0)
  const dayNow = (i: number) => (i === 0 ? now : END_OF_DAY)
  const dayLabel = (i: number, iso: string) => (i === 0 ? t.schedule.today : i === 1 ? t.schedule.yesterday : shortDate(iso, lang))
  const count = (n: number) => f(t.schedule.count, { count: n })
  const left = items.filter((s) => statusOf(s, now) !== 'done').length

  // 열 때마다 오늘 · 빈 검색으로
  useEffect(() => {
    if (!open) return
    setDay(0)
    setQuery('')
  }, [open])

  // 오늘이면 지금 하는 일로, 다른 날이면 맨 위로
  useEffect(() => {
    if (!open || q) return
    const list = listRef.current
    const target = isToday && (list?.querySelector('[data-status="now"]') ?? list?.querySelector('[data-status="upcoming"]'))
    // 맺히는 애니메이션과 겹치지 않게 다음 프레임에 옮긴다
    const id = requestAnimationFrame(() => (target ? target.scrollIntoView({ block: 'center' }) : list?.scrollTo({ top: 0 })))
    return () => cancelAnimationFrame(id)
  }, [open, day, q, isToday])

  const heading = q
    ? t.schedule.searchTitle
    : isToday
      ? t.schedule.title
      : day === 1
        ? t.schedule.yesterdayTitle
        : f(t.schedule.dateTitle, { date: shortDate(selected.date, lang) })
  const bold = (text: string) => <strong className="font-bold text-fg">{text}</strong>

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} wide className="lg:h-[min(800px,calc(100dvh-32px))]">
      <div className="flex flex-none flex-wrap items-end justify-between gap-4 border-b border-line p-6 pr-16 sm:p-8 sm:pr-20">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-accent">{longToday(isToday || q ? date : parse(selected.date), lang)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <h2 id={titleId} className="text-[clamp(22px,2.4vw,28px)]/[1.3] font-bold tracking-[-0.025em]">
              {heading}
            </h2>
            <SourceTag>{t.schedule.source}</SourceTag>
          </div>
          <p className="mt-1.5 text-base text-muted" aria-live="polite">
            {q
              ? rich(t.schedule.found, { found: bold(count(found)) })
              : isToday
                ? rich(t.schedule.todaySummary, { count: items.length, left: bold(f(t.schedule.left, { count: left })) }, items.length)
                : f(t.schedule.total, { count: selected.items.length })}
          </p>
        </div>
        <SearchBox
          value={query}
          onChange={setQuery}
          label={t.schedule.searchTitle}
          placeholder={t.schedule.searchPlaceholder}
          className="w-full sm:w-80"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* 날짜 고르기 — 좁은 화면에서는 가로로 넘긴다 */}
        <nav aria-label={t.schedule.dates} className="flex-none border-b border-line lg:w-60 lg:border-r lg:border-b-0">
          <ul className="flex gap-1.5 overflow-x-auto p-3 lg:h-full lg:flex-col lg:overflow-y-auto lg:overscroll-contain">
            {days.map((d, i) => {
              const active = !q && i === day
              return (
                <li key={d.date || i} className="flex-none">
                  <button
                    type="button"
                    onClick={() => {
                      setDay(i)
                      setQuery('')
                    }}
                    aria-current={active ? 'date' : undefined}
                    className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition-[background-color,color,scale] duration-150 active:scale-[0.98] ${
                      active ? 'bg-accent-fill text-white' : 'hover:bg-subtle'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-[15px] font-bold whitespace-nowrap">{dayLabel(i, d.date)}</span>
                      {i < 2 && d.date && (
                        <span className={`block text-[13px] whitespace-nowrap ${active ? 'text-white/80' : 'text-muted'}`}>{shortDate(d.date, lang)}</span>
                      )}
                    </span>
                    <span className={`text-sm font-semibold whitespace-nowrap tabular-nums ${active ? 'text-white/90' : 'text-muted'}`}>
                      {d.items.length ? count(d.items.length) : t.schedule.none}
                    </span>
                  </button>
                </li>
              )
            })}
            {/* 지난 일정을 받는 동안 날짜 자리 */}
            {history.loading &&
              Array.from({ length: 6 }, (_, i) => (
                <li key={`sk-${i}`} className="flex-none" aria-hidden="true">
                  <Skeleton className="h-11 w-28 lg:w-full" />
                </li>
              ))}
          </ul>
        </nav>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6">
          {/* 위아래 여백은 안쪽에 — 스크롤 상자에 주면 고정된 소제목 위로 목록이 비친다 */}
          <div className="py-5">
            {q ? (
              results.length ? (
                results.map((d) => {
                  const i = days.findIndex((x) => x.date === d.date)
                  return (
                    <DaySection key={d.date} label={[dayLabel(i, d.date), ...(i < 2 ? [shortDate(d.date, lang)] : []), count(d.items.length)].join(' · ')}>
                      {d.items.map((s) => (
                        <ScheduleRow key={s.id} item={s} now={dayNow(i)} withPlace />
                      ))}
                    </DaySection>
                  )
                })
              ) : (
                <div className="py-16 text-center">
                  <p className="text-base font-semibold">{f(t.schedule.noResults, { query: query.trim() })}</p>
                  <p className="mt-1 text-[15px] text-muted">{t.schedule.noResultsHint}</p>
                </div>
              )
            ) : (
              <>
                {isToday && <NowGuide items={items} now={now} date={date} className="mb-4" />}
                {selected.items.length ? (
                  halves(selected.items, t.schedule).map((g) => (
                    <DaySection key={g.label} label={`${g.label} · ${count(g.items.length)}`}>
                      {g.items.map((s) => (
                        <ScheduleRow key={s.id} item={s} now={dayNow(day)} withPlace />
                      ))}
                    </DaySection>
                  ))
                ) : (
                  <p className="py-16 text-center text-base text-muted">{t.schedule.emptyDay}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

/** 오전 · 오후 또는 날짜별 묶음. 소제목은 목록을 내려도 위에 붙어 있다 */
function DaySection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="mb-5 last:mb-0">
      <h3 className="sticky top-0 z-10 mb-2 rounded-lg bg-[var(--glass-solid)] px-3 py-1.5 text-sm font-bold text-muted">{label}</h3>
      <ol className="space-y-1.5">{children}</ol>
    </section>
  )
}
