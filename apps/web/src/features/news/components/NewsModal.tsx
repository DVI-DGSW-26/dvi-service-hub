import { ChevronRight } from 'lucide-react'
import { useId } from 'react'
import { useI18n } from '@/shared/i18n'
import { formatDate, useTitle } from '@/shared/format'
import type { NewsItem } from '@dvi/core/types'
import { useLastIndex } from '@/shared/hooks'
import { Modal, OpenLink, Pager } from '@/shared/ui'
import { NewsThumb } from './NewsThumb'

interface NewsModalProps {
  news: NewsItem[]
  /** 보고 있는 소식. null 이면 닫힘 */
  index: number | null
  onIndexChange: (i: number | null) => void
  /** 홈에서 열었을 때 — 창에는 최신 몇 건만 있으니 '전체 n건'(사내정보)으로 가는 링크를 둔다 */
  viewAll?: { href: string; count: number }
}

/**
 * 사내 소식 펼쳐 보기. 이전 · 다음으로 넘기고, 아래 목록에서 다른 소식을 고른다.
 * 넓은 화면에서는 왼쪽에 그림을 크게, 오른쪽에 글을 두고 글만 스크롤한다.
 */
export function NewsModal({ news, index, onIndexChange, viewAll }: NewsModalProps) {
  const titleId = useId()
  const { t, f, lang } = useI18n()
  const title = useTitle()
  const shown = useLastIndex(index, news.length)
  const item = news[shown]

  return (
    <Modal open={index !== null} onClose={() => onIndexChange(null)} labelledBy={titleId} wide className="lg:h-[min(720px,calc(100dvh-32px))]">
      {item && (
        <>
          {/* 다른 소식으로 넘기면 맨 위부터(key) */}
          <div key={shown} className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:overflow-hidden">
            <NewsThumb item={item} large className="aspect-[16/8] w-full lg:aspect-auto lg:h-full" />

            <div className="p-6 sm:p-8 lg:overflow-y-auto lg:overscroll-contain lg:p-10 lg:pt-14">
              <p className="text-[15px] font-semibold text-accent tabular-nums">{formatDate(item.date, lang)}</p>
              <h2 id={titleId} className="mt-2 text-[clamp(22px,2.4vw,28px)]/[1.3] font-bold tracking-[-0.025em] text-balance">
                {title(item.title)}
              </h2>
              {/* 본문은 행사 메모를 줄바꿈(\n)으로 이은 일반 글자 */}
              <p className="mt-4 text-[17px]/[1.75] whitespace-pre-line text-fg/90 select-text">{item.body || item.summary}</p>

              {news.length > 1 && (
                <section aria-label={t.home.news.others} className="mt-8 border-t border-line pt-6">
                  <h3 className="mb-3 text-base font-bold">{t.home.news.others}</h3>
                  <ul className="space-y-2">
                    {news.map((n, i) =>
                      i === shown ? null : (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => onIndexChange(i)}
                            className="flex w-full cursor-pointer items-center gap-4 rounded-2xl p-2 text-left transition-[background-color,scale] duration-150 hover:bg-subtle active:scale-[0.99]"
                          >
                            <NewsThumb item={n} className="aspect-[16/10] w-24 flex-none rounded-xl" />
                            <span className="min-w-0">
                              <span className="block truncate text-base font-semibold">{title(n.title)}</span>
                              <span className="mt-1 block text-sm text-muted tabular-nums">{formatDate(n.date, lang)}</span>
                            </span>
                          </button>
                        </li>
                      ),
                    )}
                  </ul>
                </section>
              )}

              {viewAll && (
                <a
                  href={viewAll.href}
                  className="mt-6 flex min-h-11 items-center justify-center gap-1 rounded-xl text-[15px] font-semibold text-accent ring-1 ring-line transition-[background-color,scale] duration-150 hover:bg-accent-soft active:scale-[0.98]"
                >
                  {f(t.home.news.viewAll, { count: viewAll.count })}
                  <ChevronRight className="size-4" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>

          {/* 원문 · 이전 · 다음은 창 아래에 고정 — 본문 길이에 따라 오르내리지 않게 */}
          <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4 sm:px-8">
            <OpenLink href={item.url} label={t.home.news.original} />
            {news.length > 1 && <Pager index={shown} count={news.length} onChange={onIndexChange} prevLabel={t.home.news.prev} nextLabel={t.home.news.next} />}
          </div>
        </>
      )}
    </Modal>
  )
}
