import { ChevronRight, Newspaper } from 'lucide-react'
import { useState } from 'react'
import { portalApi } from '../api/portal'
import { NewsModal } from '../components/dashboard/NewsModal'
import { NewsThumb } from '../components/dashboard/NewsPanel'
import { Icon } from '../components/ui/Icon'
import { Panel } from '../components/ui/Panel'
import { LoadError, SkeletonList } from '../components/ui/Skeleton'
import { useAsync } from '../hooks/useAsync'
import { hrefOf } from '../hooks/useHashRoute'
import { useI18n } from '../i18n'
import { formatDate } from '../lib/format'
import { PageTitle } from '../components/ui/PageTitle'

/** 사내정보: 왼쪽 분류 목록 + 오른쪽 문서 목록, 아래 사내 소식. #/info/<분류 id> 로 바로 연다. */
export function InfoPage({ categoryId }: { categoryId?: string }) {
  const { t, lang } = useI18n()
  const categories = useAsync(portalApi.infoCategories)
  const news = useAsync(portalApi.news)
  const [openNews, setOpenNews] = useState<number | null>(null)
  const list = categories.data ?? []
  const current = list.find((c) => c.id === categoryId) ?? list[0]

  return (
    <>
      <PageTitle title={t.info.title} description={t.info.description} />

      <div className="grid gap-5 md:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
        <nav aria-label={t.info.categoryNav} className="glass h-fit rounded-3xl p-2 md:sticky md:top-24">
          {categories.loading ? (
            <SkeletonList rows={5} className="h-11" />
          ) : (
            <ul className="space-y-0.5">
              {list.map((c) => {
                const active = c.id === current?.id
                return (
                  <li key={c.id}>
                    <a
                      href={hrefOf('info', c.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold ${
                        active ? 'bg-accent-fill text-white shadow-[0_4px_12px_-4px_oklch(0_0_0/0.25)]' : 'text-muted hover:bg-subtle hover:text-fg'
                      }`}
                    >
                      <Icon name={c.icon} className="size-5 flex-none" strokeWidth={1.8} />
                      {c.title}
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </nav>

        <section aria-live="polite" className="glass min-w-0 rounded-3xl p-5 sm:p-6">
          {categories.loading ? (
            <SkeletonList rows={3} />
          ) : categories.error || !current ? (
            <LoadError />
          ) : (
            <>
              <h2 className="text-lg font-bold">{current.title}</h2>
              <p className="mt-1 text-sm text-muted">{current.description}</p>
              <ul className="mt-4 divide-y divide-line">
                {current.documents.map((d) => (
                  <li key={d.id}>
                    <a href={d.url} className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-3.5 transition-colors hover:bg-subtle">
                      <Icon name="file" className="size-[18px] flex-none text-muted" />
                      <span className="min-w-0 flex-1 truncate font-medium group-hover:text-accent group-hover:underline">
                        {d.title}
                      </span>
                      <span className="flex-none text-sm text-muted tabular-nums">{formatDate(d.updated, lang)}</span>
                      <ChevronRight className="size-4 flex-none text-muted" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <Panel title={t.info.news} icon={Newspaper} className="mt-5">
        {news.loading ? (
          <SkeletonList rows={3} className="h-24" />
        ) : news.error ? (
          <LoadError />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {news.data?.map((n, i) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setOpenNews(i)}
                  aria-haspopup="dialog"
                  className="group block w-full cursor-pointer text-left transition-[scale] duration-150 active:scale-[0.99]"
                >
                  <span className="block overflow-hidden rounded-2xl ring-1 ring-line">
                    <NewsThumb item={n} className="aspect-[16/9] w-full transition-transform duration-300 group-hover:scale-[1.03]" />
                  </span>
                  <span className="mt-3 block text-[17px] font-bold group-hover:text-accent">{n.title}</span>
                  <span className="mt-1 line-clamp-2 block text-[15px]/relaxed text-muted">{n.summary}</span>
                  <span className="mt-1.5 block text-sm text-muted tabular-nums">{formatDate(n.date, lang)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <NewsModal news={news.data ?? []} index={openNews} onIndexChange={setOpenNews} />
      </Panel>
    </>
  )
}
