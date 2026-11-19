import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronRight } from 'lucide-react'
import { Suspense, lazy } from 'react'
import { useNow, useClipRows, useLazyModal } from '@/shared/hooks'
import { useI18n } from '@/shared/i18n'
import { toIso } from '@/shared/lib'
import { clockTime, nowMinutes, useTitle } from '@/shared/format'
import { isMini, type StackSize } from '@dvi/core/widget'
import { scheduleQueries } from '../api/queries'
import { MiniPanel, PANEL_LINK, Panel, SMALL_BODY, SmallPanel, SourceTag, LoadError, Skeleton, SkeletonList } from '@/shared/ui'
import { statusOf } from '../lib/status'
import { NowGuide, ScheduleRow } from './ScheduleRow'

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
export function TodayPanel({ size, className = '' }: { size?: StackSize; className?: string }) {
  const modal = useLazyModal()
  const { t, f, lang } = useI18n()
  const title = useTitle()
  const date = useNow()
  const now = nowMinutes(date)
  // 오늘 + 지난 2주를 한 번에 받는다 — 마지막 날이 오늘, 앞의 날들은 전체 일정 창에서 넘겨 본다
  const { data, isPending: loading, error } = useQuery({ ...scheduleQueries.recent(toIso(date)), select: (days) => days.at(-1)?.items })
  const items = data ?? []

  // 좁은 화면 고정 칸은 들어가는 만큼(useClipRows) — 넓게 · 보통 · 크게 순으로 더 보인다
  const visible = size ? 12 : VISIBLE
  const rows = useClipRows<HTMLOListElement>(!!size)
  const firstOpen = items.findIndex((s) => statusOf(s, now) !== 'done')
  const last = Math.max(0, items.length - visible)
  const from = firstOpen < 0 ? last : Math.min(firstOpen, last)
  const shown = items.slice(from, from + visible)
  const more = items.length > visible
  const listModal = modal.mounted && (
    <Suspense>
      <TodayModal key={modal.key} items={items} now={now} date={date} open={modal.open} onClose={modal.close} />
    </Suspense>
  )

  // 진행 중 → 시간이 정해진 다음 일정 → 종일 순으로 하나(작게 · 아주 작은 칸)
  const pick = (['now', 'upcoming', 'allDay'] as const).map((k) => items.find((s) => statusOf(s, now) === k)).find(Boolean)
  const st = pick && statusOf(pick, now)

  // 아주 작은 칸 — 오늘 일정 수, 한 줄 띠면 그 일정의 시각 · 제목까지
  if (isMini(size)) {
    return (
      <MiniPanel
        size={size}
        title={t.schedule.title}
        icon={CalendarDays}
        value={loading || error ? undefined : items.length}
        detail={pick ? `${pick.allDay || !pick.start ? t.schedule.allDay : clockTime(pick.start, lang)} · ${title(pick.title)}` : loading || error ? undefined : items.length ? t.schedule.allDone : t.schedule.empty}
        onClick={() => modal.show()}
        className={className}
      >
        {listModal}
      </MiniPanel>
    )
  }

  // 넓게(4×2) — 지금부터 한 줄씩 시각 · 제목. 누르면 전체 일정 창
  if (size === 'w') {
    return (
      <SmallPanel title={t.schedule.title} icon={CalendarDays} className={className}>
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : error ? (
          <LoadError error={error} className="text-sm" />
        ) : (
          <button type="button" onClick={() => modal.show()} aria-haspopup="dialog" className={`${SMALL_BODY} w-full`}>
            {shown.length ? (
              <ol ref={rows} className="min-h-0 w-full flex-1 overflow-hidden">
                {shown.map((s) => {
                  const st = statusOf(s, now)
                  return (
                    <li key={s.id} className={`flex items-baseline gap-3 py-1 ${st === 'done' ? 'text-muted' : ''}`}>
                      <span className={`w-[4.5rem] flex-none text-[13px] font-bold tabular-nums ${st === 'now' ? 'text-live' : 'text-muted'}`}>
                        {s.allDay || !s.start ? t.schedule.allDay : clockTime(s.start, lang)}
                      </span>
                      <span className="min-w-0 truncate text-[15px] font-semibold">{title(s.title)}</span>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <span className="text-[15px] font-semibold break-keep text-muted">{t.schedule.empty}</span>
            )}
          </button>
        )}
        {listModal}
      </SmallPanel>
    )
  }

  // 작게 — 진행 중(없으면 다음) 일정 하나를 크게. 누르면 전체 일정 창
  if (size === 's') {
    return (
      <SmallPanel title={t.schedule.title} icon={CalendarDays} className={className}>
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : error ? (
          <LoadError error={error} className="text-sm" />
        ) : (
          <button type="button" onClick={() => modal.show()} aria-haspopup="dialog" className={SMALL_BODY}>
            {pick ? (
              <>
                {/* 종일은 아래 시각 자리에 '종일' 이 들어가니 상태는 뺀다 */}
                {st !== 'allDay' && <span className={`text-[13px] font-bold ${st === 'now' ? 'text-live' : 'text-muted'}`}>{t.schedule.status[st!]}</span>}
                <span className={`text-xl font-bold tabular-nums ${st === 'now' ? 'text-live' : ''}`}>{pick.allDay || !pick.start ? t.schedule.allDay : clockTime(pick.start, lang)}</span>
                <span className="mt-1 line-clamp-2 text-[15px] font-semibold break-keep">{title(pick.title)}</span>
              </>
            ) : (
              <span className="text-[15px] font-semibold break-keep text-muted">{items.length ? t.schedule.allDone : t.schedule.empty}</span>
            )}
            <span className="mt-auto pt-2 text-[13px] font-semibold text-accent">{f(t.schedule.viewAll, { count: items.length })}</span>
          </button>
        )}
        {listModal}
      </SmallPanel>
    )
  }

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
          <ol ref={rows} className={`space-y-1.5 fit:space-y-0.5 ${size ? 'min-h-0 flex-1 overflow-hidden' : ''}`} aria-label={more ? f(t.schedule.listLabel, { count: items.length, shown: shown.length }) : undefined}>
            {shown.map((s) => (
              <ScheduleRow key={s.id} item={s} now={now} className="fit:py-1.5" />
            ))}
          </ol>
        </>
      ) : (
        <p className="py-4 text-base text-muted">{t.schedule.empty}</p>
      )}
      {/* 오늘 일정이 없어도 지난 일정 · 검색은 볼 수 있게 목록 밖에 둔다 */}
      {listModal}
    </Panel>
  )
}
