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

/** 패널 오른쪽 위 글자 단추 · 링크 */
export const PANEL_LINK = 'flex cursor-pointer items-center gap-0.5 rounded-lg px-2 py-1 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft'

/** 대시보드의 모든 상자가 쓰는 유리 겉틀 */
export function Panel({ title, icon: IconC, meta, description, toolbar, action, className = '', children }: PanelProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={`glass flex flex-col rounded-3xl p-5 sm:p-6 fit:p-5 ${className}`}>
      {/* 조작(toolbar)은 늘 제목 줄 오른쪽에 — 좁은 화면에서 줄이 바뀌면 제목 옆 표시가 아래로 내려간다 */}
      <div className="mb-4 flex items-start justify-between gap-3 fit:mb-3">
        <div className="min-w-0 flex-1">
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
                className={PANEL_LINK}
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

/**
 * 좁은 화면의 '작게'(두 칸 중 한 칸) 위젯 겉틀 — 폭이 150px 남짓이라 제목 줄의 표시 · 조작은 빼고 아이콘과 제목만.
 * 내용은 한두 가지 핵심만 크게(iOS 작은 위젯처럼), 나머지는 누르면 여는 창에서
 */
export function SmallPanel({ title, icon: IconC, className = '', children }: { title: string; icon: LucideIcon; className?: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={`glass flex flex-col rounded-3xl p-4 ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-7 flex-none place-items-center rounded-lg bg-accent-soft text-accent">
          <IconC className="size-4" strokeWidth={2.2} aria-hidden="true" />
        </span>
        <h2 id={headingId} className="min-w-0 text-[15px]/tight font-bold tracking-[-0.01em] break-keep">
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

/** 작은 위젯 안에서 누르면 창을 여는 넓은 버튼 — 남는 높이를 채우고 내용을 위아래로 벌린다 */
export const SMALL_BODY = 'flex min-h-0 flex-1 cursor-pointer flex-col items-start rounded-2xl text-left transition-[scale] duration-150 active:scale-[0.97]'

/** 제목 옆 출처 표시 (From 플로우) */
export function SourceTag({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">{children}</span>
}

/** 제목 옆 개수 표시 */
export function CountTag({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-subtle px-2.5 py-0.5 text-xs font-semibold text-muted ring-1 ring-line">{children}</span>
}
