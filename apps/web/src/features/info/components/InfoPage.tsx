import { useInfiniteQuery } from '@tanstack/react-query'
import { ChevronRight, Newspaper, Network } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NewsModal, NewsThumb, NEWS_PAGE, newsQueries } from '@/features/news'
import { OrgChartModal } from './OrgChartModal'
import { unitCount } from '../lib/orgMatch'
import { PANEL_LINK, Panel, LoadError, SkeletonList, PageTitle } from '@/shared/ui'
import { orgChart } from '../lib/orgChart'
import { hrefOf } from '@/shared/hooks'
import { useI18n } from '@/shared/i18n'
import { formatDate, useTitle } from '@/shared/format'

/**
 * 사내정보: 사내 소식 + 조직도(창). 규정 · 매뉴얼 같은 분류는 아직 자료가 없어 두지 않는다.
 * #/info/org 로 오면(홈 바로가기를 새 탭으로 연 경우) 조직도 창을 바로 연다.
 */
export function InfoPage({ categoryId }: { categoryId?: string }) {
  const { t, f, lang } = useI18n()
  const title = useTitle()
  // 소식은 한 쪽(6건)씩 받고 '더 보기'로 다음 쪽을 이어 받는다 — 홈 패널과 같은 캐시
  const news = useInfiniteQuery(newsQueries.pages())
  const [openNews, setOpenNews] = useState<number | null>(null)
  const all = news.data?.pages.flatMap((p) => p.items) ?? []
  const left = Math.max(0, (news.data?.pages[0]?.total ?? 0) - all.length)
  // #/info/org 로 들어오면 주소는 곧바로 사내정보로 바꿔 두고 조직도 창만 띄운다 — 새로고침해도 다시 뜨지 않고,
  // 뒤로 가기는 창을 닫는다(Modal 이 쌓는 기록). 창이 기록을 쌓기(자식 effect) 전에 바꿔야 해서 처음 그릴 때 한다
  const [org, setOrg] = useState(() => {
    if (categoryId !== 'org') return false
    history.replaceState(history.state, '', hrefOf('info'))
    return true
  })
  const [orgMounted, setOrgMounted] = useState(org)
  // 처음 열 때 고를 팀 (조직도 패널의 팀 칸을 누른 경우)
  const [orgTeam, setOrgTeam] = useState<string>()
  const openOrg = (team?: string) => {
    setOrgTeam(team)
    setOrgMounted(true)
    setOrg(true)
  }
  // 사내정보를 보는 중에 #/info/org 로 오면 — 주소가 아직 /org 일 때만(위에서 바꿨으면 건너뛴다)
  useEffect(() => {
    if (categoryId !== 'org' || location.hash === hrefOf('info')) return
    history.replaceState(history.state, '', hrefOf('info'))
    openOrg()
  }, [categoryId])

  return (
    <>
      <PageTitle title={t.info.title} description={t.info.description} />

      <OrgPanel onOpen={openOrg} className="mb-5" />

      <Panel title={t.info.news} icon={Newspaper}>
        {news.isPending ? (
          <SkeletonList rows={3} className="h-24" />
        ) : news.isError ? (
          <LoadError error={news.error} />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {all.map((n, i) => (
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
                  <span className="mt-3 block text-[17px] font-bold group-hover:text-accent">{title(n.title)}</span>
                  <span className="mt-1 line-clamp-2 block text-[15px]/relaxed text-muted">{n.summary}</span>
                  <span className="mt-1.5 block text-sm text-muted tabular-nums">{formatDate(n.date, lang)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {news.hasNextPage && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => news.fetchNextPage()}
              disabled={news.isFetchingNextPage}
              className="h-11 cursor-pointer rounded-xl px-5 text-[15px] font-semibold ring-1 ring-line transition-[background-color,scale,opacity] duration-150 hover:bg-subtle active:scale-95 disabled:cursor-wait disabled:opacity-60"
            >
              {news.isFetchingNextPage ? t.common.loading : f(t.info.moreNews, { count: Math.min(NEWS_PAGE, left), left })}
            </button>
          </div>
        )}
        <NewsModal news={all} index={openNews} onIndexChange={setOpenNews} />
      </Panel>
      {orgMounted && (
        <OrgChartModal
          open={org}
          team={orgTeam}
          onClose={() => setOrg(false)}
        />
      )}
    </>
  )
}

/**
 * 조직도 미리보기 — 팀 이름을 칩으로 늘어놓고, 누르면 조직도 창에서 그 팀을 보여준다.
 * 큰 그림은 창에서만 그린다 (페이지에 그대로 두면 소식이 한참 아래로 밀린다).
 */
function OrgPanel({ onOpen, className = '' }: { onOpen: (team?: string) => void; className?: string }) {
  const { t, f } = useI18n()
  const teams = orgChart.teams
  const units = teams.reduce((n, team) => n + unitCount(team), 0)

  return (
    <Panel
      title={t.info.org.title}
      icon={Network}
      description={f(t.info.org.summary, { teams: teams.length, units })}
      toolbar={
        <button
          type="button"
          onClick={() => onOpen()}
          aria-haspopup="dialog"
          className={PANEL_LINK}
        >
          {t.info.org.open}
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      }
      className={className}
    >
      <ul className="flex flex-wrap gap-2">
        {teams.map((team) => (
          <li key={team.id}>
            <button
              type="button"
              onClick={() => onOpen(team.id)}
              aria-haspopup="dialog"
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-subtle px-3.5 py-2.5 ring-1 ring-line transition-[background-color,scale] duration-150 hover:bg-raised active:scale-[0.97]"
            >
              <span className="text-[15px] font-bold">{team.name}</span>
              <span className="text-[13px] text-muted">{f(t.info.org.units, { count: unitCount(team) })}</span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
