import { ChevronRight, Newspaper, Presentation } from 'lucide-react'
import { useState } from 'react'
import { portalApi } from '../../api/portal'
import { useAsync } from '../../hooks/useAsync'
import { dotDate } from '../../lib/format'
import type { NewsItem } from '../../types/portal'
import { Panel } from '../ui/Panel'
import { LoadError, Skeleton } from '../ui/Skeleton'
import { NewsModal } from './NewsModal'

/** 소식 그림. 그림이 없으면 자리표시 */
export function NewsThumb({ item, className = '' }: { item: NewsItem; className?: string }) {
  return item.image ? (
    <img src={item.image} alt="" loading="lazy" className={`bg-subtle object-cover ${className}`} />
  ) : (
    <div className={`grid place-items-center bg-accent-soft text-accent ring-1 ring-line ${className}`} aria-hidden="true">
      <Presentation className="size-9" strokeWidth={1.6} />
    </div>
  )
}

/**
 * 가장 최근 소식은 그림과 함께, 나머지는 제목 목록. 누르면 모달로 펼친다.
 * 한 화면 모드(fit)에서는 그림이 남는 높이만큼만 차지한다.
 */
export function NewsPanel({ className = '' }: { className?: string }) {
  const { data, loading, error } = useAsync(portalApi.news)
  const [open, setOpen] = useState<number | null>(null)
  const news = data ?? []
  const [top, ...rest] = news

  return (
    <Panel
      title="사내 주요 소식"
      icon={Newspaper}
      toolbar={
        news.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(0)}
            aria-haspopup="dialog"
            className="flex cursor-pointer items-center gap-0.5 rounded-lg px-2 py-1 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
          >
            더보기
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        )
      }
      className={`fit:overflow-hidden ${className}`}
    >
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="aspect-[2/1]" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4" />
        </div>
      ) : error ? (
        <LoadError />
      ) : top ? (
        // 한 화면 모드에서는 남는 높이를 재서(container size) 낮으면 큰 그림 대신 작은 그림을 옆에 둔다
        <div className="fit:flex fit:min-h-0 fit:flex-1 fit:flex-col fit:[container-type:size]">
          <button
            type="button"
            onClick={() => setOpen(0)}
            aria-haspopup="dialog"
            className="group block w-full cursor-pointer text-left transition-[scale] duration-150 active:scale-[0.99] fit:flex fit:min-h-0 fit:flex-1 fit:flex-col"
          >
            <span className="block overflow-hidden rounded-2xl ring-1 ring-line fit:min-h-0 fit:flex-1 [@container(max-height:300px)]:hidden">
              <NewsThumb item={top} className="aspect-[2/1] w-full fit:aspect-auto fit:h-full transition-transform duration-300 group-hover:scale-[1.03]" />
            </span>
            <span className="mt-3 flex items-center gap-3.5 [@container(max-height:300px)]:mt-0">
              <span className="hidden w-28 flex-none overflow-hidden rounded-xl ring-1 ring-line [@container(max-height:300px)]:block">
                <NewsThumb item={top} className="aspect-[16/10] w-full" />
              </span>
              <span className="min-w-0">
                <span className="block font-bold group-hover:text-accent">{top.title}</span>
                <span className="mt-1 line-clamp-2 block text-sm/relaxed text-muted [@container(max-height:300px)]:line-clamp-1">{top.summary}</span>
                <span className="mt-1.5 block text-[13px] text-muted tabular-nums">{dotDate(top.date)}</span>
              </span>
            </span>
          </button>

          {rest.length > 0 && (
            <ul className="mt-3 flex-none divide-y divide-line border-t border-line fit:mt-2">
              {rest.map((n, i) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(i + 1)}
                    aria-haspopup="dialog"
                    className="group flex w-full cursor-pointer items-baseline gap-3 py-3 text-left fit:py-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold group-hover:text-accent">{n.title}</span>
                    <span className="flex-none text-[13px] text-muted tabular-nums">{dotDate(n.date)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="py-4 text-base text-muted">새 소식이 없습니다.</p>
      )}

      <NewsModal news={news} index={open} onIndexChange={setOpen} />
    </Panel>
  )
}
