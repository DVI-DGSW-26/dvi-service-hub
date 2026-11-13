import { ChevronRight, Wrench } from 'lucide-react'
import { portalApi } from '../../api/portal'
import { useAsync } from '../../hooks/useAsync'
import { useI18n } from '../../i18n'
import type { MaintenanceKind } from '../../types/portal'
import { Badge, type BadgeTone } from '../ui/Badge'
import { Panel } from '../ui/Panel'
import { LoadError, SkeletonList } from '../ui/Skeleton'

const TONE: Record<MaintenanceKind, BadgeTone> = { 안내: 'accent', 점검: 'warn', 장애: 'danger' }

export function MaintenancePanel({ className = '' }: { className?: string }) {
  const { data, loading, error } = useAsync(portalApi.maintenance)
  const { t } = useI18n()

  return (
    <Panel title={t.home.maintenance.title} icon={Wrench} className={className}>
      {loading ? (
        <SkeletonList rows={2} className="h-16" />
      ) : error ? (
        <LoadError />
      ) : data?.length ? (
        // 낮은 한 화면(fit)에서만 줄 간격을 좁히고, 높은 화면(tall)에서는 다시 넉넉하게
        <ul className="space-y-2 fit:space-y-1.5 tall:space-y-2.5">
          {data.map((m) => (
            <li key={m.id}>
              <a
                href={m.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 rounded-2xl bg-subtle px-3.5 py-3 ring-1 ring-line transition-[background-color,scale] duration-200 hover:bg-raised active:scale-[0.98] fit:py-2 tall:px-4 tall:py-3.5"
              >
                <Badge tone={TONE[m.kind]}>{t.home.maintenance.kind[m.kind]}</Badge>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold group-hover:text-accent">{m.title}</span>
                  <span className="mt-1 block text-sm text-muted">{m.when}</span>
                </span>
                <ChevronRight className="size-4 flex-none text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-4 text-sm text-muted">{t.home.maintenance.empty}</p>
      )}
    </Panel>
  )
}
