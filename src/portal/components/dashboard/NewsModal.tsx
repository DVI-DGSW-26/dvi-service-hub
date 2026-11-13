import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { useId, useRef } from 'react'
import { useI18n } from '../../i18n'
import { formatDate } from '../../lib/format'
import type { NewsItem } from '../../types/portal'
import { Modal } from '../ui/Modal'
import { NewsThumb } from './NewsPanel'

interface NewsModalProps {
  news: NewsItem[]
  /** 보고 있는 소식. null 이면 닫힘 */
  index: number | null
  onIndexChange: (i: number | null) => void
}

/**
 * 사내 소식 펼쳐 보기. 이전 · 다음으로 넘기고, 아래 목록에서 다른 소식을 고른다.
 * 넓은 화면에서는 왼쪽에 그림을 크게, 오른쪽에 글을 두고 글만 스크롤한다.
 */
export function NewsModal({ news, index, onIndexChange }: NewsModalProps) {
  const titleId = useId()
  const { t, lang } = useI18n()
  // 닫히는 애니메이션 동안에도 내용이 남아 있도록 마지막으로 본 소식을 기억해 그린다
  const last = useRef(0)
  if (index !== null) last.current = index
  const shown = index ?? last.current
  const item = news[shown]
  const step = (d: number) => onIndexChange((shown + d + news.length) % news.length)
  const nav =
    'grid size-11 cursor-pointer place-items-center rounded-full bg-subtle text-fg ring-1 ring-line transition-[background-color,scale] duration-150 hover:bg-raised active:scale-90 disabled:opacity-40'

  return (
    <Modal open={index !== null} onClose={() => onIndexChange(null)} labelledBy={titleId} wide className="lg:h-[min(720px,calc(100dvh-32px))]">
      {item && (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:overflow-hidden">
          <NewsThumb item={item} className="aspect-[16/8] w-full lg:aspect-auto lg:h-full" />

          <div className="p-6 sm:p-8 lg:overflow-y-auto lg:overscroll-contain lg:p-10 lg:pt-14">
            <p className="text-[15px] font-semibold text-accent tabular-nums">{formatDate(item.date, lang)}</p>
            <h2 id={titleId} className="mt-2 text-[clamp(22px,2.4vw,28px)]/[1.3] font-bold tracking-[-0.025em] text-balance">
              {item.title}
            </h2>
            <p className="mt-4 text-[17px]/[1.75] text-fg/90">{item.body}</p>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent-fill px-5 text-[15px] font-semibold text-white transition-[filter,scale] duration-150 hover:brightness-110 active:scale-[0.97]"
              >
                {t.home.news.original}
                <ExternalLink className="size-4" aria-hidden="true" />
                <span className="sr-only">{t.common.newTab}</span>
              </a>
              {news.length > 1 && (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => step(-1)} aria-label={t.home.news.prev} className={nav}>
                    <ChevronLeft className="size-5" aria-hidden="true" />
                  </button>
                  <span className="w-12 text-center text-[15px] font-medium text-muted tabular-nums">
                    {shown + 1} / {news.length}
                  </span>
                  <button type="button" onClick={() => step(1)} aria-label={t.home.news.next} className={nav}>
                    <ChevronRight className="size-5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

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
                            <span className="block truncate text-base font-semibold">{n.title}</span>
                            <span className="mt-1 block text-sm text-muted tabular-nums">{formatDate(n.date, lang)}</span>
                          </span>
                        </button>
                      </li>
                    ),
                  )}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
