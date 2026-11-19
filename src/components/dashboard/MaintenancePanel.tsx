import { useQuery } from '@tanstack/react-query'
import { ChevronRight, PenLine, Wrench } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useI18n, type Lang } from '../../i18n'
import { canWriteMaintenance } from '../../lib/access'
import { dateTimeRange, shortDate } from '../../lib/format'
import type { StackSize } from '../../lib/widgetLayout'
import { maintenanceQueries } from '../../queries/dashboard'
import type { Maintenance, MaintenanceKind, Me } from '../../types/portal'
import { Badge, type BadgeTone } from '../ui/Badge'
import { Panel, SMALL_BODY, SmallPanel } from '../ui/Panel'
import { LoadError, Skeleton, SkeletonList } from '../ui/Skeleton'
import { DetailModal } from './DetailModal'
import { useLazyModal } from '../../hooks/useLazyModal'

// 눌러서 열 때 받는다 — 첫 화면 번들에서 뺀다
const MaintenanceComposer = lazy(() => import('./MaintenanceComposer').then((m) => ({ default: m.MaintenanceComposer })))

export const MAINTENANCE_TONE: Record<MaintenanceKind, BadgeTone> = { NOTICE: 'accent', MAINTENANCE: 'warn', INCIDENT: 'danger' }

/** 일정 문구 — '11.22 (일) 02:00 ~ 06:00' */
export const maintenanceWhen = (m: Maintenance, lang: Lang) => dateTimeRange(m.date, m.start, m.end, lang)

/** 홈 패널에 보여줄 안내 수 — 옆 패널과 높이를 맞추려 고정하고, 나머지는 '외 n건' 에서 */
const LISTED = 3

/** 패널 오른쪽 위 글쓰기 단추 */
const composeButton =
  'flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft'

/** 시스템 점검 · 안내. maintenance:write · admin 이면 오른쪽 위에 작성 단추가 붙는다 */
export function MaintenancePanel({ me, size, className = '' }: { me: Me | null; size?: StackSize; className?: string }) {
  const { data, isPending: loading, error } = useQuery(maintenanceQueries.list())
  const { t, f, lang } = useI18n()
  const composer = useLazyModal()
  const [detail, setDetail] = useState<number | null>(null)
  const items = data ?? []
  // 크게(좁은 화면)는 두 배까지
  const listed = size === 'l' ? LISTED * 2 : LISTED
  const hidden = items.length - listed
  const detailModal = (
    <DetailModal
      items={items}
      index={detail}
      onIndexChange={setDetail}
      prevLabel={t.home.maintenance.prev}
      nextLabel={t.home.maintenance.next}
      list={{
        label: t.home.maintenance.title,
        row: (m) => (
          <span className="flex items-start gap-2.5">
            <Badge tone={MAINTENANCE_TONE[m.kind]}>{t.home.maintenance.kind[m.kind]}</Badge>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold break-keep">{m.title}</span>
              <span className="mt-0.5 block text-[13px] text-muted">{maintenanceWhen(m, lang)}</span>
            </span>
          </span>
        ),
      }}
      content={(m) => ({
        eyebrow: <Badge tone={MAINTENANCE_TONE[m.kind]}>{t.home.maintenance.kind[m.kind]}</Badge>,
        title: m.title,
        lead: maintenanceWhen(m, lang),
        body: m.body,
        link: m.url ? { label: t.home.maintenance.open, url: m.url } : undefined,
      })}
    />
  )

  // 작게 — 가장 가까운 안내 하나와 남은 수. 누르면 펼쳐 보기(그 안에서 목록 · 다음 안내로). 작성은 보통 크기에서
  if (size === 's') {
    const [first] = items
    return (
      <SmallPanel title={t.home.maintenance.title} icon={Wrench} className={className}>
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : error ? (
          <LoadError error={error} className="text-sm" />
        ) : first ? (
          <button type="button" onClick={() => setDetail(0)} aria-haspopup="dialog" className={SMALL_BODY}>
            <Badge tone={MAINTENANCE_TONE[first.kind]}>{t.home.maintenance.kind[first.kind]}</Badge>
            <span className="mt-2 line-clamp-2 text-[15px] font-semibold break-keep">{first.title}</span>
            <span className="mt-1 text-[13px] text-muted tabular-nums">{shortDate(first.date, lang)}</span>
            {items.length > 1 && <span className="mt-auto pt-2 text-[13px] font-semibold text-accent">{f(t.home.maintenance.more, { count: items.length - 1 })}</span>}
          </button>
        ) : (
          <p className="text-sm text-muted break-keep">{t.home.maintenance.empty}</p>
        )}
        {detailModal}
      </SmallPanel>
    )
  }

  return (
    <Panel
      title={t.home.maintenance.title}
      icon={Wrench}
      toolbar={
        canWriteMaintenance(me) && (
          <button
            type="button"
            onClick={() => {
              composer.show()
            }}
            aria-haspopup="dialog"
            title={t.compose.maintenance.open}
            className={composeButton}
          >
            <PenLine className="size-4" aria-hidden="true" />
            {/* 휴대폰은 아이콘만 — 제목 줄이 두 줄로 밀리지 않게 */}
            <span className="max-sm:sr-only">{t.compose.maintenance.open}</span>
          </button>
        )
      }
      className={className}
    >
      {loading ? (
        <SkeletonList rows={2} className="h-16" />
      ) : error ? (
        <LoadError error={error} />
      ) : data?.length ? (
        // 낮은 한 화면(fit)에서만 줄 간격을 좁히고, 높은 화면(tall)에서는 다시 넉넉하게
        <ul className="space-y-2 fit:space-y-1.5 tall:space-y-2.5">
          {data.slice(0, listed).map((m, i) => (
            <li key={m.id}>
              {/* 제목이 잘리고 본문 · 링크는 안 보이므로, 누르면 펼쳐 보기 — 시스템 열기는 그 안에서 */}
              <button
                type="button"
                onClick={() => setDetail(i)}
                aria-haspopup="dialog"
                className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-subtle px-3.5 py-3 text-left ring-1 ring-line transition-[background-color,scale] duration-200 hover:bg-raised active:scale-[0.98] fit:py-2 tall:px-4 tall:py-3.5"
              >
                <Badge tone={MAINTENANCE_TONE[m.kind]}>{t.home.maintenance.kind[m.kind]}</Badge>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold group-hover:text-accent">{m.title}</span>
                  <span className="mt-1 block text-sm text-muted">{maintenanceWhen(m, lang)}</span>
                </span>
                <ChevronRight className="size-4 flex-none text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </button>
            </li>
          ))}
          {/* 넘친 안내 — 누르면 목록 창에서 다음 안내부터 */}
          {hidden > 0 && (
            <li>
              <button
                type="button"
                onClick={() => setDetail(listed)}
                aria-haspopup="dialog"
                className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-2xl px-3 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft fit:py-1.5"
              >
                {f(t.home.maintenance.more, { count: hidden })}
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </li>
          )}
        </ul>
      ) : (
        <p className="py-4 text-sm text-muted">{t.home.maintenance.empty}</p>
      )}
      {detailModal}
      {composer.mounted && (
        <Suspense>
          <MaintenanceComposer key={composer.key} open={composer.open} onClose={composer.close} items={items} />
        </Suspense>
      )}
    </Panel>
  )
}
