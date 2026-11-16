import { useInfiniteQuery } from '@tanstack/react-query'
import { ChevronRight, Newspaper, Presentation } from 'lucide-react'
import { useState } from 'react'
import { hrefOf } from '../../hooks/useHashRoute'
import { useI18n } from '../../i18n'
import { formatDate, useTitle } from '../../lib/format'
import { newsQueries } from '../../queries/dashboard'
import type { NewsItem } from '../../types/portal'
import { Panel } from '../ui/Panel'
import { LoadError, Skeleton } from '../ui/Skeleton'
import { NewsModal } from './NewsModal'

/**
 * 소식 그림. 목록은 작은 그림(400px), 펼쳐 보기는 큰 그림(1920px · large).
 * 한쪽만 올 수 있어(명세 6.2) 없는 쪽은 다른 쪽으로 채운다. 둘 다 없으면 자리표시
 */
export function NewsThumb({ item, large = false, className = '' }: { item: NewsItem; large?: boolean; className?: string }) {
  const src = large ? (item.imageLarge ?? item.image) : (item.image ?? item.imageLarge)
  return src ? (
    <img src={src} alt="" loading="lazy" className={`bg-subtle object-cover ${className}`} />
  ) : (
    <div className={`grid place-items-center bg-accent-soft text-accent ring-1 ring-line ${className}`} aria-hidden="true">
      <Presentation className="size-9" strokeWidth={1.6} />
    </div>
  )
}

/** 홈에 보여줄 최신 소식 수 — 대표 1건(그림) + 제목 2건. 첫 쪽(6건)에서 여기서 자른다 */
const SHOWN = 3

/**
 * 가장 최근 소식은 그림과 함께, 그다음 2건은 제목으로. 누르면 모달로 펼친다.
 * 한 화면 모드(fit)에서는 그림이 남는 높이만큼만 차지한다.
 */
export function NewsPanel({ className = '' }: { className?: string }) {
  // 사내정보의 소식 목록과 같은 캐시 — 홈은 첫 쪽만 쓴다
  const { data, isPending: loading, error } = useInfiniteQuery(newsQueries.pages())
  const { t, f, lang } = useI18n()
  const title = useTitle()
  const [open, setOpen] = useState<number | null>(null)
  const news = data?.pages[0]?.items ?? []
  const total = data?.pages[0]?.total ?? 0
  // 소식이 늘어도 패널 높이는 같고, 나머지는 '전체 n건'(사내정보)에서 — 펼쳐 보기 창도 이 3건만 넘긴다
  const shown = news.slice(0, SHOWN)
  const [top, ...listed] = shown

  return (
    <Panel
      title={t.home.news.title}
      icon={Newspaper}
      toolbar={
        // 전체 소식은 사내정보 페이지에서 — 소식이 많아도 그림과 함께 훑어보고 더 불러온다
        news.length > 0 && (
          <a
            href={hrefOf('info')}
            className="flex items-center gap-0.5 rounded-lg px-2 py-1 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
          >
            {f(t.home.news.viewAll, { count: total })}
            <ChevronRight className="size-4" aria-hidden="true" />
          </a>
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
        <LoadError error={error} />
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
              <span className="block font-bold group-hover:text-accent">{title(top.title)}</span>
              <span className="mt-1 line-clamp-2 block text-sm/relaxed text-muted tall:line-clamp-3 [@container(max-height:220px)]:line-clamp-1">
                {top.summary}
              </span>
              <span className="mt-1.5 block text-[13px] text-muted tabular-nums">{formatDate(top.date, lang)}</span>
            </span>
          </button>

          {listed.length > 0 && (
            <ul className="mt-3 flex-none divide-y divide-line border-t border-line fit:mt-2 tall:mt-4">
              {listed.map((n, i) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(i + 1)}
                    aria-haspopup="dialog"
                    className="group flex w-full cursor-pointer items-baseline gap-3 py-3 text-left fit:py-2.5 tall:py-3.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold group-hover:text-accent">{title(n.title)}</span>
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

      <NewsModal news={shown} index={open} onIndexChange={setOpen} viewAll={{ href: hrefOf('info'), count: total }} />
    </Panel>
  )
}
