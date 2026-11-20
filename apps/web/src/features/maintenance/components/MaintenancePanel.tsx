import { useQuery } from '@tanstack/react-query'
import { ChevronRight, PenLine, Wrench } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useI18n } from '@/shared/i18n'
import { canWriteMaintenance } from '@/shared/lib'
import { shortDate } from '@/shared/format'
import { isMini, type StackSize } from '@/shared/widget'
import { maintenanceQueries } from '../api/queries'
import type { Me } from '@/shared/types'
import { Badge, MiniPanel, Panel, SMALL_BODY, SmallPanel, LoadError, Skeleton, SkeletonList, DetailModal } from '@/shared/ui'
import { useClipRows, useLazyModal } from '@/shared/hooks'
import { MAINTENANCE_TONE } from '../lib/constants'
import { maintenanceWhen } from '../lib/maintenanceWhen'

// 눌러서 열 때 받는다 — 첫 화면 번들에서 뺀다
const MaintenanceComposer = lazy(() => import('./MaintenanceComposer').then((m) => ({ default: m.MaintenanceComposer })))

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
  // 좁은 화면 고정 칸은 들어가는 만큼(useClipRows) — 나머지는 펼쳐 보기 창의 목록 · 다음으로
  const listed = size ? items.length : LISTED
  const hidden = items.length - listed
  const rows = useClipRows<HTMLUListElement>(!!size)
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

  // 아주 작은 칸 — 안내 수, 한 줄 띠면 가장 가까운 안내 제목까지. 누르면 펼쳐 보기(없으면 아무것도 열지 않는다)
  if (isMini(size)) {
    const first = items.at(0)
    return (
      <MiniPanel
        size={size}
        title={t.home.maintenance.title}
        icon={Wrench}
        value={loading || error ? undefined : items.length}
        detail={first ? `${t.home.maintenance.kind[first.kind]} · ${first.title}` : loading || error ? undefined : t.home.maintenance.empty}
        onClick={() => first && setDetail(0)}
        className={className}
      >
        {detailModal}
      </MiniPanel>
    )
  }

  // 넓게(4×2) — 한 줄에 하나씩 종류 · 제목 · 날짜. 누르면 펼쳐 보기
  if (size === 'w') {
    return (
      <SmallPanel title={t.home.maintenance.title} icon={Wrench} className={className}>
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : error ? (
          <LoadError error={error} className="text-sm" />
        ) : items.length ? (
          <ul ref={rows} className="min-h-0 flex-1 overflow-hidden">
            {items.map((m, i) => (
              <li key={m.id}>
                <button type="button" onClick={() => setDetail(i)} aria-haspopup="dialog" className="flex w-full cursor-pointer items-center gap-2.5 py-1.5 text-left">
                  <Badge tone={MAINTENANCE_TONE[m.kind]}>{t.home.maintenance.kind[m.kind]}</Badge>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{m.title}</span>
                  <span className="flex-none text-[13px] text-muted tabular-nums">{shortDate(m.date, lang)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted break-keep">{t.home.maintenance.empty}</p>
        )}
        {detailModal}
      </SmallPanel>
    )
  }

  // 작게 — 가장 가까운 안내 하나와 남은 수. 누르면 펼쳐 보기(그 안에서 목록 · 다음 안내로). 작성은 보통 크기에서
  if (size === 's') {
    const first = items.at(0)
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
      ) : data.length ? (
        // 낮은 한 화면(fit)에서만 줄 간격을 좁히고, 높은 화면(tall)에서는 다시 넉넉하게
        <ul ref={rows} className={`space-y-2 fit:space-y-1.5 tall:space-y-2.5 ${size ? 'min-h-0 flex-1 overflow-hidden' : ''}`}>
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
