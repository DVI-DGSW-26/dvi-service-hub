import { Clock } from 'lucide-react'
import { duration, koreanTime, toMinutes } from '../../lib/format'
import type { ScheduleColor, ScheduleItem } from '../../types/portal'
import { Badge, type BadgeTone } from '../ui/Badge'

const BAR: Record<ScheduleColor, string> = {
  violet: 'bg-violet',
  amber: 'bg-amber',
  teal: 'bg-teal',
  accent: 'bg-accent-fill',
}

export type ScheduleStatus = 'done' | 'now' | 'upcoming'

/** 색만으로 구분하지 않고 글자로 상태를 적는다 */
const STATUS: Record<ScheduleStatus, { label: string; tone: BadgeTone }> = {
  done: { label: '끝남', tone: 'neutral' },
  now: { label: '진행 중', tone: 'ok' },
  upcoming: { label: '예정', tone: 'accent' },
}

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
  const hhmm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  const current = items.find((s) => statusOf(s, now) === 'now')
  const next = items.find((s) => statusOf(s, now) === 'upcoming')
  const guide = current
    ? `${compact ? '진행 중 일정' : `‘${current.title}’ 진행 중 ·`} ${duration(toMinutes(current.end) - now)} 남음`
    : next
      ? `다음 일정까지 ${duration(toMinutes(next.start) - now)}`
      : '오늘 일정을 모두 마쳤어요'

  return (
    <p className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-2xl bg-accent-soft px-4 py-3 ${className}`} aria-live="polite">
      <Clock className="size-5 flex-none text-accent" aria-hidden="true" />
      <span className="text-base font-bold text-accent">지금 {koreanTime(hhmm)}</span>
      <span className="text-[15px] font-medium">{guide}</span>
    </p>
  )
}

/**
 * 일정 한 줄. 연령대가 넓은 사용자를 생각해 시각은 크게 '오전/오후'로, 상태는 글자로.
 * 모달에서는 장소까지 보여준다(withPlace).
 */
export function ScheduleRow({ item: s, now, withPlace = false, className = '' }: { item: ScheduleItem; now: number; withPlace?: boolean; className?: string }) {
  const st = statusOf(s, now)
  const done = st === 'done'
  return (
    <li
      data-status={st}
      className={`flex items-center gap-3.5 rounded-2xl px-3 py-3 ${st === 'now' ? 'bg-ok-soft ring-1 ring-ok/30' : ''} ${className}`}
    >
      <span className={`w-[92px] flex-none ${done ? 'text-muted' : ''}`}>
        <span className="block text-[17px] font-bold tabular-nums">{koreanTime(s.start)}</span>
        <span className="mt-0.5 block text-sm text-muted tabular-nums">~ {koreanTime(s.end)}</span>
      </span>
      <span className={`h-10 w-1 flex-none rounded-full ${BAR[s.color]} ${done ? 'opacity-40' : ''}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className={`block text-base font-semibold break-keep ${done ? 'text-muted' : ''}`}>{s.title}</span>
        {withPlace && s.place && <span className="mt-0.5 block text-sm text-muted">{s.place}</span>}
      </span>
      <Badge tone={STATUS[st].tone}>{STATUS[st].label}</Badge>
    </li>
  )
}
