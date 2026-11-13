import { Clock } from 'lucide-react'
import { useI18n } from '../../i18n'
import { clockTime, duration, toMinutes } from '../../lib/format'
import type { ScheduleColor, ScheduleItem } from '../../types/portal'
import { Badge, type BadgeTone } from '../ui/Badge'

const BAR: Record<ScheduleColor, string> = {
  violet: 'bg-violet',
  amber: 'bg-amber',
  teal: 'bg-teal',
  accent: 'bg-accent-fill',
}

export type ScheduleStatus = 'done' | 'now' | 'upcoming'

/** 색만으로 구분하지 않고 글자로 상태를 적는다 (글자는 사전 schedule.status) */
const TONE: Record<ScheduleStatus, BadgeTone> = { done: 'neutral', now: 'ok', upcoming: 'accent' }

export function statusOf(s: ScheduleItem, now: number): ScheduleStatus {
  if (now >= toMinutes(s.end)) return 'done'
  if (now >= toMinutes(s.start)) return 'now'
  return 'upcoming'
}

interface NowGuideProps {
  items: ScheduleItem[]
  now: number
  date: Date
  /** 패널처럼 좁은 곳 — 진행 중 일정 이름은 빼고 남은 시간만 (그 줄은 초록으로 이미 보인다) */
  compact?: boolean
  className?: string
}

/** 지금 기준 안내 한 줄 — '지금 오후 2:13 · 다음 일정까지 47분' */
export function NowGuide({ items, now, date, compact = false, className = '' }: NowGuideProps) {
  const { t, f, lang } = useI18n()
  const hhmm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  const current = items.find((s) => statusOf(s, now) === 'now')
  const next = items.find((s) => statusOf(s, now) === 'upcoming')
  const until = (at: string) => duration(toMinutes(at) - now, t.common.duration)
  const guide = current
    ? compact
      ? f(t.schedule.currentLeft, { left: until(current.end) })
      : f(t.schedule.currentTitleLeft, { title: current.title, left: until(current.end) })
    : next
      ? f(t.schedule.untilNext, { wait: until(next.start) })
      : t.schedule.allDone

  return (
    <p className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-2xl bg-accent-soft px-4 py-3 ${className}`} aria-live="polite">
      <Clock className="size-5 flex-none text-accent" aria-hidden="true" />
      <span className="text-base font-bold text-accent">{f(t.schedule.now, { time: clockTime(hhmm, lang) })}</span>
      <span className="text-[15px] font-medium">{guide}</span>
    </p>
  )
}

/**
 * 일정 한 줄. 연령대가 넓은 사용자를 생각해 시각은 크게 '오전/오후'로, 상태는 글자로.
 * 모달에서는 장소까지 보여준다(withPlace).
 */
export function ScheduleRow({ item: s, now, withPlace = false, className = '' }: { item: ScheduleItem; now: number; withPlace?: boolean; className?: string }) {
  const { t, lang } = useI18n()
  const st = statusOf(s, now)
  const done = st === 'done'
  return (
    <li
      data-status={st}
      className={`flex items-center gap-3.5 rounded-2xl px-3 py-3 ${st === 'now' ? 'bg-ok-soft ring-1 ring-ok/30' : ''} ${className}`}
    >
      <span className={`w-[92px] flex-none ${done ? 'text-muted' : ''}`}>
        <span className="block text-[17px] font-bold tabular-nums">{clockTime(s.start, lang)}</span>
        <span className="mt-0.5 block text-sm text-muted tabular-nums">~ {clockTime(s.end, lang)}</span>
      </span>
      <span className={`h-10 w-1 flex-none rounded-full ${BAR[s.color]} ${done ? 'opacity-40' : ''}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className={`block text-base font-semibold break-keep ${done ? 'text-muted' : ''}`}>{s.title}</span>
        {withPlace && s.place && <span className="mt-0.5 block text-sm text-muted">{s.place}</span>}
      </span>
      <Badge tone={TONE[st]}>{t.schedule.status[st]}</Badge>
    </li>
  )
}
