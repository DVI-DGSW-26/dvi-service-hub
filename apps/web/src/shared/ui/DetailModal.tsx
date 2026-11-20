import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { useEffect, useId, useRef,  type ReactNode } from 'react'
import { useI18n } from '@/shared/i18n'
import { Modal } from './Modal'
import { useLastIndex } from '@/shared/hooks'
interface DetailContent {
  /** 제목 위 — 날짜 · 종류 · 중요 표시 등 */
  eyebrow: ReactNode
  title: string
  /** 제목 아래 한 줄 (요약 · 일정) */
  lead?: string
  /** 본문. 줄바꿈은 적은 그대로 */
  body?: string
  link?: { label: string; url: string }
}

interface DetailModalProps<T> {
  items: T[]
  /** 보고 있는 글. null 이면 닫힘 */
  index: number | null
  onIndexChange: (i: number | null) => void
  content: (item: T) => DetailContent
  /** 이전 · 다음 단추 이름 */
  prevLabel: string
  nextLabel: string
  /**
   * 있으면 넓은 창 왼쪽에 전체 목록 — 홈 패널에 다 못 담은 글도 여기서 고른다.
   * row 는 목록 한 줄의 내용(종류 · 제목 · 날짜)
   */
  list?: { label: string; row: (item: T) => ReactNode }
}

/** 원문 · 바로가기 — 새 탭으로 */
export function OpenLink({ href, label }: { href: string; label: string }) {
  const { t } = useI18n()
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent-fill px-5 text-[15px] font-semibold text-white transition-[filter,scale] duration-150 hover:brightness-110 active:scale-[0.97]">
      {label}
      <ExternalLink className="size-4" aria-hidden="true" />
      <span className="sr-only">{t.common.newTab}</span>
    </a>
  )
}

const NAV = 'grid size-11 cursor-pointer place-items-center rounded-full bg-subtle text-fg ring-1 ring-line transition-[background-color,scale] duration-150 hover:bg-raised active:scale-90'

/** 이전 · n / m · 다음 — 끝에서 넘기면 처음으로 돈다 */
export function Pager({ index, count, onChange, prevLabel, nextLabel }: { index: number; count: number; onChange: (i: number) => void; prevLabel: string; nextLabel: string }) {
  const step = (d: number) => onChange((index + d + count) % count)
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => step(-1)} aria-label={prevLabel} className={NAV}>
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>
      <span className="w-12 text-center text-[15px] font-medium text-muted tabular-nums">
        {index + 1} / {count}
      </span>
      <button type="button" onClick={() => step(1)} aria-label={nextLabel} className={NAV}>
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>
    </div>
  )
}

/**
 * 공지 · 점검 안내 펼쳐 보기. 홈에서는 한 줄로 잘리므로, 누르면 제목 · 본문 전체와 원문 링크를 보여준다.
 * 이전 · 다음으로 같은 목록의 다른 글로 넘긴다. list 를 주면 오늘의 일정 창처럼 왼쪽 목록 + 오른쪽 본문.
 */
export function DetailModal<T>({ items, index, onIndexChange, content, prevLabel, nextLabel, list }: DetailModalProps<T>) {
  const titleId = useId()
  const listRef = useRef<HTMLUListElement>(null)
  const shown = useLastIndex(index, items.length)
  const item = items[shown]
  const c = item === undefined ? null : content(item)

  // 넘기거나 아래쪽 글로 열면 목록에서도 그 줄이 보이게
  useEffect(() => {
    if (index === null) return
    listRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [index])

  const detail = c && (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 pr-16 sm:p-8 sm:pr-20">
        <div className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-accent tabular-nums">{c.eyebrow}</div>
        <h2 id={titleId} className="mt-2 text-[clamp(22px,2.4vw,28px)]/[1.35] font-bold tracking-[-0.025em] break-keep">
          {c.title}
        </h2>
        {c.lead && <p className="mt-2 text-base text-muted break-keep">{c.lead}</p>}
        {c.body && <p className="mt-6 border-t border-line pt-6 text-[17px]/[1.75] whitespace-pre-line text-fg/90 break-keep select-text">{c.body}</p>}
      </div>

      {(c.link ?? items.length > 1) && (
        <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4 sm:px-8">
          {c.link ? <OpenLink href={c.link.url} label={c.link.label} /> : <span />}
          {items.length > 1 && <Pager index={shown} count={items.length} onChange={onIndexChange} prevLabel={prevLabel} nextLabel={nextLabel} />}
        </div>
      )}
    </>
  )

  return (
    <Modal
      open={index !== null && !!c}
      onClose={() => onIndexChange(null)}
      labelledBy={titleId}
      wide={!!list}
      className={list ? 'lg:h-[min(720px,calc(100dvh-32px))]' : ''}
    >
      {list ? (
        // 좁은 화면은 본문이 먼저, 목록은 아래
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain lg:flex-row lg:overflow-hidden">
          <nav aria-label={list.label} className="order-last flex-none border-t border-line p-3 lg:order-first lg:w-80 lg:overflow-y-auto lg:overscroll-contain lg:border-t-0 lg:border-r">
            <h3 className="px-2 pt-1 pb-2 text-sm font-bold text-muted">
              {list.label} · {items.length}
            </h3>
            <ul ref={listRef} className="space-y-1">
              {items.map((x, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => onIndexChange(i)}
                    aria-current={i === shown ? 'true' : undefined}
                    className={`w-full cursor-pointer rounded-xl px-2.5 py-2 text-left transition-[background-color,scale] duration-150 active:scale-[0.99] ${
                      i === shown ? 'bg-accent-soft ring-1 ring-accent/40' : 'hover:bg-subtle'
                    }`}
                  >
                    {list.row(x)}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex min-w-0 flex-col lg:min-h-0 lg:flex-1">{detail}</div>
        </div>
      ) : (
        detail
      )}
    </Modal>
  )
}
