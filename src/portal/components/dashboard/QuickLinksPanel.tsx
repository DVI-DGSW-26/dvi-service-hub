import { Zap } from 'lucide-react'
import { portalApi } from '../../api/portal'
import { useAsync } from '../../hooks/useAsync'
import { useI18n } from '../../i18n'
import { Icon } from '../ui/Icon'
import { Panel } from '../ui/Panel'
import { LoadError, Skeleton } from '../ui/Skeleton'

const isExternal = (url: string) => /^https?:/.test(url)

export function QuickLinksPanel({ className = '' }: { className?: string }) {
  const { data, loading, error } = useAsync(portalApi.quickLinks)
  const { t } = useI18n()

  return (
    <Panel title={t.home.quickLinks.title} icon={Zap} className={className}>
      {error ? (
        <LoadError />
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 fit:flex-1 fit:auto-rows-fr">
          {loading
            ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[68px] rounded-2xl fit:h-auto" />)
            : data?.map((q) => (
                <li key={q.id}>
                  <a
                    href={q.url}
                    {...(isExternal(q.url) ? { target: '_blank', rel: 'noreferrer' } : {})}
                    className="group flex h-full items-center gap-3 rounded-2xl bg-subtle p-3 tall:flex-col tall:items-start tall:justify-between tall:p-4 ring-1 ring-line transition-[background-color,box-shadow,scale] duration-200 hover:bg-raised hover:ring-fg/15 active:scale-[0.97]"
                  >
                    <span className="grid size-10 flex-none place-items-center rounded-xl tall:size-12 bg-accent-soft text-accent transition-colors group-hover:bg-accent-fill group-hover:text-white">
                      <Icon name={q.icon} className="size-5" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 max-w-full">
                      <span className="block truncate text-[15px] font-bold tall:text-base">{q.title}</span>
                      <span className="mt-1 block truncate text-[13px] text-muted">{q.description}</span>
                    </span>
                  </a>
                </li>
              ))}
        </ul>
      )}
    </Panel>
  )
}
