import { ChevronRight, Newspaper, Presentation } from 'lucide-react'
import { useState } from 'react'
import { portalApi } from '../../api/portal'
import { useAsync } from '../../hooks/useAsync'
import { useI18n } from '../../i18n'
import { formatDate } from '../../lib/format'
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
  const { t, lang } = useI18n()
  const [open, setOpen] = useState<number | null>(null)
  const news = data ?? []
  const [top, ...rest] = news

  return (
    <Panel
      title={t.home.news.title}
      icon={Newspaper}
      toolbar={
        news.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(0)}
            aria-haspopup="dialog"
            className="flex cursor-pointer items-center gap-0.5 rounded-lg px-2 py-1 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
          >
            {t.common.more}
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
        // 한 화면 모드: 칸이 넓고 낮아 위에 그림을 깔면 띠처럼 잘린다. 그림을 왼쪽에 제 비율(16:10)로 두고
        // (높이 = 남는 높이와 칸 폭 48% 에 맞는 높이(30cqw) 중 작은 쪽), 아주 낮으면 작은 그림으로 줄인다
        <div className="fit:flex fit:min-h-0 fit:flex-1 fit:flex-col fit:[container-type:size]">
          <button
            type="button"
            onClick={() => setOpen(0)}
            aria-haspopup="dialog"
            className="group block w-full cursor-pointer text-left transition-[scale] duration-150 active:scale-[0.99] fit:flex fit:min-h-0 fit:flex-1 fit:items-center fit:gap-4"
          >
            <span className="block overflow-hidden rounded-2xl ring-1 ring-line fit:aspect-[16/10] fit:h-full fit:max-h-[30cqw] fit:flex-none [@container(max-height:220px)]:h-auto [@container(max-height:220px)]:w-28 [@container(max-height:220px)]:rounded-xl">
              <NewsThumb item={top} className="aspect-[2/1] w-full fit:aspect-auto fit:h-full transition-transform duration-300 group-hover:scale-[1.03]" />
            </span>
            <span className="mt-3 block min-w-0 fit:mt-0">
              <span className="block font-bold group-hover:text-accent">{top.title}</span>
              <span className="mt-1 line-clamp-2 block text-sm/relaxed text-muted tall:line-clamp-3 [@container(max-height:220px)]:line-clamp-1">
                {top.summary}
              </span>
              <span className="mt-1.5 block text-[13px] text-muted tabular-nums">{formatDate(top.date, lang)}</span>
            </span>
          </button>

          {rest.length > 0 && (
            <ul className="mt-3 flex-none divide-y divide-line border-t border-line fit:mt-2 tall:mt-4">
              {rest.map((n, i) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(i + 1)}
                    aria-haspopup="dialog"
                    className="group flex w-full cursor-pointer items-baseline gap-3 py-3 text-left fit:py-2.5 tall:py-3.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold group-hover:text-accent">{n.title}</span>
                    <span className="flex-none text-[13px] text-muted tabular-nums">{formatDate(n.date, lang)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="py-4 text-base text-muted">{t.home.news.empty}</p>
      )}

      <NewsModal news={news} index={open} onIndexChange={setOpen} />
    </Panel>
  )
}
