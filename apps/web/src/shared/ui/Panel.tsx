import { ChevronRight, type LucideIcon } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import type { MiniSize } from '@/shared/widget'

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
      <div className={`flex items-start justify-between gap-3 ${description ? '' : 'mb-4 fit:mb-3'}`}>
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
        </div>
        {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- ReactNode 라 false · '' 도 없는 것 */}
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
      {/* 설명은 제목 줄 아래 폭 가득 — 오른쪽 조작 옆에 끼우면 좁은 화면에서 한두 낱말씩 줄이 바뀐다 */}
      {description && <p className="mt-2 mb-4 text-[15px] text-muted fit:mb-3">{description}</p>}
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

/**
 * 좁은 화면의 아주 작은 칸 위젯 — 통째로 누르는 버튼 하나(그 위젯의 창을 연다).
 * 1×1 은 아이콘과 숫자, 1×2 는 아이콘 · 숫자 · 제목을 세로로, 4×1 은 아이콘 · 제목 · 한 줄 요약 · 숫자를 가로로
 */
export function MiniPanel({ size, title, icon: IconC, value, detail, onClick, className = '', children }: {
  size: MiniSize
  title: string
  icon: LucideIcon
  value?: string | number
  /** 한 줄 요약 — 4×1 에서만 보이고, 1×1 · 1×2 는 화면낭독 · 마우스 올리기로 */
  detail?: string
  onClick: () => void
  className?: string
  /** 여는 창 */
  children?: ReactNode
}) {
  const strip = size === '4x1'
  const label = [title, value, detail].filter((x) => x !== undefined && x !== '').join(', ')
  const icon = (
    <span className="grid size-8 flex-none place-items-center rounded-xl bg-accent-soft text-accent">
      <IconC className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
    </span>
  )
  return (
    <section className={`glass flex rounded-3xl ${className}`}>
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        aria-label={strip ? undefined : label}
        title={strip ? undefined : label}
        className={`flex min-w-0 flex-1 cursor-pointer items-center rounded-[inherit] transition-[scale] duration-150 active:scale-[0.97] ${
          strip ? 'gap-3 px-4' : size === '1x2' ? 'flex-col justify-between px-1.5 py-4' : 'flex-col justify-center gap-1'
        }`}
      >
        {icon}
        {strip ? (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-xs font-semibold text-muted">{title}</span>
              <span className="block truncate text-[15px] font-semibold">{detail}</span>
            </span>
            {value !== undefined && <span className="flex-none text-lg font-bold tabular-nums">{value}</span>}
          </>
        ) : (
          <>
            {value !== undefined && <span className={`font-bold tabular-nums ${size === '1x2' ? 'text-2xl/none' : 'text-[15px]/none'}`}>{value}</span>}
            {size === '1x2' && <span className="line-clamp-2 text-center text-[11px]/tight font-semibold break-keep text-muted">{title}</span>}
          </>
        )}
      </button>
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
