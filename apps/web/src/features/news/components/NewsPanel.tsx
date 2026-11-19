import { useInfiniteQuery } from '@tanstack/react-query'
import { Newspaper } from 'lucide-react'
import { useState } from 'react'
import { hrefOf, useClipRows } from '@/shared/hooks'
import { useI18n } from '@/shared/i18n'
import { isMini, type StackSize } from '@dvi/core/widget'
import { formatDate, useTitle } from '@/shared/format'
import { newsQueries } from '../api/queries'
import { MiniPanel, Panel, SMALL_BODY, SmallPanel, LoadError, Skeleton } from '@/shared/ui'
import { NewsModal } from './NewsModal'
import { NewsThumb } from './NewsThumb'

/** 홈에 보여줄 최신 소식 수 — 대표 1건(그림) + 제목 2건. 첫 쪽(6건)에서 여기서 자른다. 크게(좁은 화면)는 두 배 = 첫 쪽 전부 */
const SHOWN = 3

/**
 * 가장 최근 소식은 그림과 함께, 그다음 2건은 제목으로. 누르면 모달로 펼친다.
 * 한 화면 모드(fit)에서는 그림이 남는 높이만큼만 차지한다.
 */
export function NewsPanel({ size, className = '' }: { size?: StackSize; className?: string }) {
  // 사내정보의 소식 목록과 같은 캐시 — 홈은 첫 쪽만 쓴다
  const { data, isPending: loading, error } = useInfiniteQuery(newsQueries.pages())
  const { t, f, lang } = useI18n()
  const title = useTitle()
  const [open, setOpen] = useState<number | null>(null)
  const news = data?.pages[0]?.items ?? []
  const total = data?.pages[0]?.total ?? 0
  // 소식이 늘어도 패널 높이는 같고, 나머지는 '전체 n건'(사내정보)에서 — 펼쳐 보기 창도 이 3건만 넘긴다
  // 좁은 화면 고정 칸은 첫 쪽 전부 — 들어가는 줄만 보인다(useClipRows)
  const shown = news.slice(0, size ? undefined : SHOWN)
  const rows = useClipRows<HTMLUListElement>(!!size)
  // 좁은 화면 보통(4×3) · 넓게(4×2)는 대표 소식을 그림 옆에 글로 — 위에 그림을 깔 높이가 없다
  const beside = size === 'm' || size === 'w'
  const [top, ...listed] = shown
  const modal = <NewsModal news={shown} index={open} onIndexChange={setOpen} viewAll={{ href: hrefOf('info'), count: total }} />

  // 아주 작은 칸 — 아이콘, 한 줄 띠면 가장 최근 소식 제목. 누르면 펼쳐 보기
  if (isMini(size)) {
    return (
      <MiniPanel size={size} title={t.home.news.title} icon={Newspaper} detail={top ? title(top.title) : loading || error ? undefined : t.home.news.empty} onClick={() => top && setOpen(0)} className={className}>
        {modal}
      </MiniPanel>
    )
  }

  // 넓게(4×2) — 대표 소식 하나를 왼쪽 그림 · 오른쪽 제목 · 날짜로
  if (size === 'w') {
    return (
      <SmallPanel title={t.home.news.title} icon={Newspaper} className={className}>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : error ? (
          <LoadError error={error} className="text-sm" />
        ) : top ? (
          <button type="button" onClick={() => setOpen(0)} aria-haspopup="dialog" className={`${SMALL_BODY} w-full flex-row gap-3`}>
            <NewsThumb item={top} className="aspect-[16/10] h-full max-h-24 flex-none rounded-xl" />
            <span className="flex min-w-0 flex-1 flex-col self-stretch">
              <span className="line-clamp-2 text-[15px] font-semibold break-keep">{title(top.title)}</span>
              <span className="mt-auto pt-1 text-[13px] text-muted tabular-nums">{formatDate(top.date, lang)}</span>
            </span>
          </button>
        ) : (
          <p className="text-[13px] text-muted">{t.home.news.empty}</p>
        )}
        {modal}
      </SmallPanel>
    )
  }

  // 작게 — 가장 최근 한 건을 그림과 제목으로. 누르면 펼쳐 보기
  if (size === 's') {
    return (
      <SmallPanel title={t.home.news.title} icon={Newspaper} className={className}>
        {loading ? (
          <Skeleton className="h-28 w-full" />
        ) : error ? (
          <LoadError error={error} className="text-sm" />
        ) : top ? (
          <button type="button" onClick={() => setOpen(0)} aria-haspopup="dialog" className={SMALL_BODY}>
            {/* 2×2 칸에 그림 · 제목 두 줄까지 — 날짜는 넓게 이상에서 */}
            <NewsThumb item={top} className="h-12 w-full flex-none rounded-xl" />
            <span className="mt-2 line-clamp-2 text-sm font-semibold break-keep">{title(top.title)}</span>
          </button>
        ) : (
          <p className="text-[13px] text-muted">{t.home.news.empty}</p>
        )}
        {modal}
      </SmallPanel>
    )
  }

  return (
    <Panel
      title={t.home.news.title}
      icon={Newspaper}
      // 전체 소식은 사내정보 페이지에서 — 소식이 많아도 그림과 함께 훑어보고 더 불러온다
      action={news.length > 0 ? { label: f(t.home.news.viewAll, { count: total }), href: hrefOf('info') } : undefined}
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
        <div className={`fit:flex fit:min-h-0 fit:flex-1 fit:flex-col fit:[container-type:size] ${size ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
          <button
            type="button"
            onClick={() => setOpen(0)}
            aria-haspopup="dialog"
            className={`group block w-full cursor-pointer text-left transition-[scale] duration-150 active:scale-[0.99] fit:flex fit:min-h-0 fit:flex-1 fit:items-center fit:gap-4 ${beside ? 'flex flex-none items-center gap-3' : ''}`}
          >
            <span className={`block overflow-hidden rounded-2xl ring-1 ring-line fit:aspect-[16/10] fit:h-full fit:max-h-[30cqw] fit:flex-none [@container(max-height:220px)]:h-auto [@container(max-height:220px)]:w-28 [@container(max-height:220px)]:rounded-xl ${beside ? 'w-32 flex-none rounded-xl' : ''}`}>
              <NewsThumb item={top} className={`w-full fit:aspect-auto fit:h-full transition-transform duration-300 group-hover:scale-[1.03] ${beside ? 'aspect-[16/10]' : size === 'l' ? 'aspect-[16/7]' : 'aspect-[2/1]'}`} />
            </span>
            <span className={`block min-w-0 fit:mt-0 ${beside ? '' : 'mt-3'}`}>
              <span className={`block font-bold group-hover:text-accent ${size ? 'line-clamp-2' : ''}`}>{title(top.title)}</span>
              <span className={`mt-1 line-clamp-2 block text-sm/relaxed text-muted tall:line-clamp-3 [@container(max-height:220px)]:line-clamp-1 ${size ? 'max-sm:hidden' : ''}`}>
                {top.summary}
              </span>
              <span className="mt-1.5 block text-[13px] text-muted tabular-nums">{formatDate(top.date, lang)}</span>
            </span>
          </button>

          {listed.length > 0 && (
            <ul ref={rows} className={`mt-3 divide-y divide-line border-t border-line fit:mt-2 tall:mt-4 ${size ? 'min-h-0 flex-1 overflow-hidden' : 'flex-none'}`}>
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

      {modal}
    </Panel>
  )
}
