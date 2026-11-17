import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronRight } from 'lucide-react'
import { Suspense, lazy } from 'react'
import { useNow } from '../../hooks/useNow'
import { useI18n } from '../../i18n'
import { toIso } from '../../lib/calendar'
import { nowMinutes } from '../../lib/format'
import { scheduleQueries } from '../../queries/dashboard'
import { PANEL_LINK, Panel, SourceTag } from '../ui/Panel'
import { LoadError, SkeletonList } from '../ui/Skeleton'
import { NowGuide, ScheduleRow, statusOf } from './ScheduleRow'
import { useLazyModal } from '../../hooks/useLazyModal'

// 눌러서 열 때 받는다 — 첫 화면 번들에서 뺀다
const TodayModal = lazy(() => import('./TodayModal').then((m) => ({ default: m.TodayModal })))

/** 패널에 보여줄 일정 수 — 나머지는 전체 일정 모달에서 */
const VISIBLE = 3

/**
 * 오늘의 일정. 연령대가 넓은 사용자를 생각해
 * 시각은 크게 '오전/오후'로, 상태는 글자로, 지금 기준 안내는 문장으로 보여준다.
 * 일정이 많으면 끝난 일정은 건너뛰고 지금부터 3건만 — 패널 높이는 늘 같다.
 * 전체 · 지난 일정 · 검색은 '전체 N건' 버튼의 모달에서.
 */
export function TodayPanel({ className = '' }: { className?: string }) {
  const modal = useLazyModal()
  const { t, f } = useI18n()
  const date = useNow()
  const now = nowMinutes(date)
  // 오늘 + 지난 2주를 한 번에 받는다 — 마지막 날이 오늘, 앞의 날들은 전체 일정 창에서 넘겨 본다
  const { data, isPending: loading, error } = useQuery({ ...scheduleQueries.recent(toIso(date)), select: (days) => days.at(-1)?.items })
  const items = data ?? []

  const firstOpen = items.findIndex((s) => statusOf(s, now) !== 'done')
  const last = Math.max(0, items.length - VISIBLE)
  const from = firstOpen < 0 ? last : Math.min(firstOpen, last)
  const shown = items.slice(from, from + VISIBLE)
  const more = items.length > VISIBLE

  return (
    <Panel
      title={t.schedule.title}
      icon={CalendarDays}
      meta={<SourceTag>{t.schedule.source}</SourceTag>}
      toolbar={
        data && (
          <button
            type="button"
            onClick={() => {
              modal.show()
            }}
            aria-haspopup="dialog"
            className={PANEL_LINK}
          >
            {f(t.schedule.viewAll, { count: items.length })}
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        )
      }
      className={className}
    >
      {loading ? (
        <SkeletonList rows={3} className="h-16" />
      ) : error ? (
        <LoadError error={error} />
      ) : items.length ? (
        <>
          <NowGuide items={items} now={now} date={date} compact className="mb-3 fit:mb-1.5 fit:py-2" />
          <ol className="space-y-1.5 fit:space-y-0.5" aria-label={more ? f(t.schedule.listLabel, { count: items.length, shown: shown.length }) : undefined}>
            {shown.map((s) => (
              <ScheduleRow key={s.id} item={s} now={now} className="fit:py-1.5" />
            ))}
          </ol>
        </>
      ) : (
        <p className="py-4 text-base text-muted">{t.schedule.empty}</p>
      )}
      {/* 오늘 일정이 없어도 지난 일정 · 검색은 볼 수 있게 목록 밖에 둔다 */}
      {modal.mounted && (
        <Suspense>
          <TodayModal key={modal.key} items={items} now={now} date={date} open={modal.open} onClose={modal.close} />
        </Suspense>
      )}
    </Panel>
  )
}
