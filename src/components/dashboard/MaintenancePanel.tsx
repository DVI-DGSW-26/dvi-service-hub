import { ChevronRight, PenLine, Wrench } from 'lucide-react'
import { useState } from 'react'
import { portalApi } from '../../api/portal'
import { useAsync } from '../../hooks/useAsync'
import { useI18n } from '../../i18n'
import { canWriteMaintenance } from '../../lib/access'
import type { MaintenanceKind, Me } from '../../types/portal'
import { Badge, type BadgeTone } from '../ui/Badge'
import { Panel } from '../ui/Panel'
import { LoadError, SkeletonList } from '../ui/Skeleton'
import { DetailModal } from './DetailModal'
import { MaintenanceComposer } from './MaintenanceComposer'

export const MAINTENANCE_TONE: Record<MaintenanceKind, BadgeTone> = { 안내: 'accent', 점검: 'warn', 장애: 'danger' }

/** 홈 패널에 보여줄 안내 수 — 옆 패널과 높이를 맞추려 고정하고, 나머지는 '외 n건' 에서 */
const LISTED = 3

/** 패널 오른쪽 위 글쓰기 단추 — 전사 공지 줄에서도 같은 모양을 쓴다 */
export const composeButton =
  'flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft'

/** 시스템 점검 · 안내. admin · 연구개발 · IT개발이면 오른쪽 위에 작성 단추가 붙는다 */
export function MaintenancePanel({ me, className = '' }: { me: Me | null; className?: string }) {
  const { data, loading, error } = useAsync(portalApi.maintenance, 'maintenance')
  const { t, f } = useI18n()
  const [open, setOpen] = useState(false)
  // 모달은 처음 열 때 붙이고, 닫는 애니메이션을 위해 그 뒤로는 붙여 둔다
  const [mounted, setMounted] = useState(false)
  const [detail, setDetail] = useState<number | null>(null)
  const items = data ?? []
  const hidden = items.length - LISTED

  return (
    <Panel
      title={t.home.maintenance.title}
      icon={Wrench}
      toolbar={
        canWriteMaintenance(me) && (
          <button
            type="button"
            onClick={() => {
              setMounted(true)
              setOpen(true)
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
        <LoadError />
      ) : data?.length ? (
        // 낮은 한 화면(fit)에서만 줄 간격을 좁히고, 높은 화면(tall)에서는 다시 넉넉하게
        <ul className="space-y-2 fit:space-y-1.5 tall:space-y-2.5">
          {data.slice(0, LISTED).map((m, i) => (
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
                  <span className="mt-1 block text-sm text-muted">{m.when}</span>
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
                onClick={() => setDetail(LISTED)}
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
                <span className="mt-0.5 block text-[13px] text-muted">{m.when}</span>
              </span>
            </span>
          ),
        }}
        content={(m) => ({
          eyebrow: <Badge tone={MAINTENANCE_TONE[m.kind]}>{t.home.maintenance.kind[m.kind]}</Badge>,
          title: m.title,
          lead: m.when,
          body: m.body,
          link: m.url ? { label: t.home.maintenance.open, url: m.url } : undefined,
        })}
      />
      {mounted && <MaintenanceComposer open={open} onClose={() => setOpen(false)} items={items} />}
    </Panel>
  )
}
