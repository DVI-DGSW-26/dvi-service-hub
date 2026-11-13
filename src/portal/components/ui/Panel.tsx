import { ChevronRight, type LucideIcon } from 'lucide-react'
import { useId, type ReactNode } from 'react'

interface PanelProps {
  title: string
  icon?: LucideIcon
  /** 제목 옆 작은 표시 (From 플로우, 총 9개 …) */
  meta?: ReactNode
  description?: string
  /** 오른쪽 위 조작 (전체/즐겨찾기 전환 …) */
  toolbar?: ReactNode
  /** 오른쪽 위 링크 (더보기 · 전체보기) */
  action?: { label: string; href: string }
  className?: string
  children: ReactNode
}

/** 대시보드의 모든 상자가 쓰는 유리 겉틀 */
export function Panel({ title, icon: IconC, meta, description, toolbar, action, className = '', children }: PanelProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={`glass flex flex-col rounded-3xl p-5 sm:p-6 fit:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap fit:mb-3 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {IconC && (
              <span className="grid size-8 flex-none place-items-center rounded-xl bg-accent-soft text-accent">
                <IconC className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
              </span>
            )}
            <h2 id={headingId} className="text-lg font-bold tracking-[-0.015em]">
              {title}
            </h2>
            {meta}
          </div>
          {description && <p className="mt-2 text-[15px] text-muted">{description}</p>}
        </div>
        {(toolbar || action) && (
          <div className="flex flex-none items-center gap-2">
            {toolbar}
            {action && (
              <a
                href={action.href}
                className="flex items-center gap-0.5 rounded-lg px-2 py-1 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
              >
                {action.label}
                <ChevronRight className="size-4" aria-hidden="true" />
              </a>
            )}
          </div>
        )}
      </div>
      {children}
    </section>
  )
}

/** 제목 옆 출처 표시 (From 플로우) */
export function SourceTag({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">{children}</span>
}

/** 제목 옆 개수 표시 */
export function CountTag({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-subtle px-2.5 py-0.5 text-xs font-semibold text-muted ring-1 ring-line">{children}</span>
}
