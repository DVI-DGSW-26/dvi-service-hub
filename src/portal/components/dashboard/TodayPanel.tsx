import { CalendarDays, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { portalApi } from '../../api/portal'
import { useAsync } from '../../hooks/useAsync'
import { useNow } from '../../hooks/useNow'
import { nowMinutes } from '../../lib/format'
import { Panel, SourceTag } from '../ui/Panel'
import { LoadError, SkeletonList } from '../ui/Skeleton'
import { NowGuide, ScheduleRow, statusOf } from './ScheduleRow'
import { TodayModal } from './TodayModal'

/** 패널에 보여줄 일정 수 — 나머지는 전체 일정 모달에서 */
const VISIBLE = 3

const preloadHistory = () => void portalApi.scheduleHistory()

/**
 * 오늘의 일정. 연령대가 넓은 사용자를 생각해
 * 시각은 크게 '오전/오후'로, 상태는 글자로, 지금 기준 안내는 문장으로 보여준다.
 * 일정이 많으면 끝난 일정은 건너뛰고 지금부터 3건만 — 패널 높이는 늘 같다.
 * 전체 · 지난 일정 · 검색은 '전체 N건' 버튼의 모달에서.
 */
export function TodayPanel({ className = '' }: { className?: string }) {
  const { data, loading, error } = useAsync(portalApi.schedule)
  const [open, setOpen] = useState(false)
  // 모달은 처음 열 때 붙이고(지난 일정도 그때 받는다), 닫는 애니메이션을 위해 그 뒤로는 붙여 둔다
  const [mounted, setMounted] = useState(false)
  const date = useNow()
  const now = nowMinutes(date)
  const items = data ?? []

  const firstOpen = items.findIndex((s) => statusOf(s, now) !== 'done')
  const last = Math.max(0, items.length - VISIBLE)
  const from = firstOpen < 0 ? last : Math.min(firstOpen, last)
  const shown = items.slice(from, from + VISIBLE)
  const more = items.length > VISIBLE

  return (
    <Panel
      title="오늘의 일정"
      icon={CalendarDays}
      meta={<SourceTag>From 플로우</SourceTag>}
      toolbar={
        data && (
          <button
            type="button"
            onClick={() => {
              setMounted(true)
              setOpen(true)
            }}
            // 누르기 직전에 지난 일정을 미리 받아 둔다 (같은 요청은 한 번만 간다)
            onPointerEnter={preloadHistory}
            onFocus={preloadHistory}
            aria-haspopup="dialog"
            className="flex cursor-pointer items-center gap-0.5 rounded-lg px-2 py-1 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
          >
            전체 {items.length}건
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        )
      }
      className={className}
    >
      {loading ? (
        <SkeletonList rows={3} className="h-16" />
      ) : error ? (
        <LoadError />
      ) : items.length ? (
        <>
          <NowGuide items={items} now={now} date={date} compact className="mb-3 fit:mb-1.5 fit:py-2" />
          <ol className="space-y-1.5 fit:space-y-0.5" aria-label={more ? `오늘 일정 ${items.length}건 중 ${shown.length}건` : undefined}>
            {shown.map((s) => (
              <ScheduleRow key={s.id} item={s} now={now} className="fit:py-1.5" />
            ))}
          </ol>
        </>
      ) : (
        <p className="py-4 text-base text-muted">오늘 예정된 일정이 없습니다.</p>
      )}
      {/* 오늘 일정이 없어도 지난 일정 · 검색은 볼 수 있게 목록 밖에 둔다 */}
      {mounted && <TodayModal items={items} now={now} date={date} open={open} onClose={() => setOpen(false)} />}
    </Panel>
  )
}
