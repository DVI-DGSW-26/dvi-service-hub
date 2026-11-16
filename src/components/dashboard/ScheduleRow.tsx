import { Check, Clock } from 'lucide-react'
import { useI18n } from '../../i18n'
import { clockTime, duration, toMinutes } from '../../lib/format'
import type { ScheduleColor, ScheduleItem } from '../../types/portal'

const BAR: Record<ScheduleColor, string> = {
  violet: 'bg-violet',
  amber: 'bg-amber',
  teal: 'bg-teal',
  accent: 'bg-accent-fill',
}

export type ScheduleStatus = 'done' | 'now' | 'upcoming'

export function statusOf(s: ScheduleItem, now: number): ScheduleStatus {
  if (now >= toMinutes(s.end)) return 'done'
  if (now >= toMinutes(s.start)) return 'now'
  return 'upcoming'
}

/**
 * 상태 표시 — 색만으로 구분하지 않고 글자로 적되(사전 schedule.status), 무게를 셋으로 나눈다.
 * 목록에서 색이 있는 건 진행 중 하나뿐이다 — 꽉 찬 초록(강조색이 초록이면 파랑, styles.css --color-live) + 퍼지는 점. 예정은 색 없는 회색 테두리, 끝남은 바탕 없이 물러난다.
 * 상태 색은 강조색을 따르지 않는다: 버튼 · 링크와 같은 색이면 묻히고, 테마마다 바뀌면 '초록 = 지금' 을 익힐 수 없다.
 */
function StatusBadge({ status }: { status: ScheduleStatus }) {
  const { t } = useI18n()
  const base = 'inline-flex flex-none items-center gap-1.5 rounded-md px-2 py-0.5 text-[13px] whitespace-nowrap'
  if (status === 'now') {
    return (
      <span className={`${base} gap-1 bg-live-fill font-bold text-white shadow-[0_2px_8px_-2px_var(--color-live-fill)]`}>
        <span className="relative grid size-1.5 place-items-center" aria-hidden="true">
          <span className="absolute inset-0 animate-live rounded-full bg-white opacity-0 motion-reduce:hidden" />
          <span className="size-1.5 rounded-full bg-white" />
        </span>
        {t.schedule.status.now}
      </span>
    )
  }
  if (status === 'upcoming') {
    return <span className={`${base} font-semibold text-fg/80 ring-1 ring-fg/20 ring-inset`}>{t.schedule.status.upcoming}</span>
  }
  return (
    <span className={`${base} font-medium text-muted`}>
      <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
      {t.schedule.status.done}
    </span>
  )
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

/** 줄 바탕 — 진행 중만 옅은 면(--color-live-soft), 나머지는 바탕 없이 */
const ROW: Record<ScheduleStatus, string> = {
  now: 'bg-live-soft ring-1 ring-live/35',
  upcoming: '',
  done: '',
}

/**
 * 일정 한 줄. 연령대가 넓은 사용자를 생각해 시각은 크게 '오전/오후'로, 상태는 글자로.
 * 눈이 가는 순서는 진행 중 → 예정 → 끝남. 끝난 줄은 글자 · 색 막대를 흐려 뒤로 물린다.
 * 모달에서는 장소까지 보여준다(withPlace).
 */
export function ScheduleRow({ item: s, now, withPlace = false, className = '' }: { item: ScheduleItem; now: number; withPlace?: boolean; className?: string }) {
  const { lang } = useI18n()
  const st = statusOf(s, now)
  const done = st === 'done'
  return (
    <li data-status={st} className={`flex items-center gap-3 rounded-2xl px-3 py-3 sm:gap-3.5 ${ROW[st]} ${className}`}>
      <span className={`w-[84px] flex-none sm:w-[92px] ${done ? 'text-muted' : st === 'now' ? 'text-live' : ''}`}>
        <span className="block text-[17px] font-bold tabular-nums">{clockTime(s.start, lang)}</span>
        <span className="mt-0.5 block text-sm text-muted tabular-nums">~ {clockTime(s.end, lang)}</span>
      </span>
      <span className={`h-10 w-1 flex-none rounded-full ${BAR[s.color]} ${done ? 'opacity-30' : ''}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className={`block text-base break-keep ${done ? 'font-medium text-muted' : st === 'now' ? 'font-bold' : 'font-semibold'}`}>{s.title}</span>
        {withPlace && s.place && <span className={`mt-0.5 block text-sm text-muted ${done ? 'opacity-70' : ''}`}>{s.place}</span>}
      </span>
      <StatusBadge status={st} />
    </li>
  )
}
