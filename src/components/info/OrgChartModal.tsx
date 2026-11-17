import { useEffect, useId, useRef, useState } from 'react'
import { orgChart } from '../../data/orgChart'
import { useI18n } from '../../i18n'
import { SearchBox } from '../layout/SearchBox'
import { Modal } from '../ui/Modal'
import { OrgChartView, orgMatch, unitCount } from './OrgChartView'

/**
 * 조직도 창 — 오늘의 일정 창과 같은 틀(위 머리말 · 검색, 왼쪽 목록, 오른쪽 본문).
 * 왼쪽 팀을 누르면 그 팀으로 옮겨 강조하고, 검색하면 맞는 팀 · 파트만 또렷하게 남긴다.
 */
export function OrgChartModal({ open, onClose, team }: { open: boolean; onClose: () => void; /** 열 때 고를 팀 id */ team?: string }) {
  const titleId = useId()
  const { t, f } = useI18n()
  const teams = orgChart.teams
  const bodyRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<string>()
  const units = teams.reduce((n, team) => n + unitCount(team), 0)
  const listed = teams.filter((team) => orgMatch(team, query).any)

  const focusTeam = (id: string) => {
    setActive(id)
    // 나무 · 카드 둘 다 그려 두고 화면 폭에 따라 하나만 보이므로, 보이는 쪽으로 옮긴다
    const target = [...(bodyRef.current?.querySelectorAll<HTMLElement>(`[data-team="${id}"]`) ?? [])].find((el) => el.offsetParent !== null)
    target?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }

  // 열 때마다 빈 검색 — 팀을 정해 열었으면 조직도가 그려진 뒤 그 팀으로
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(team)
    if (!team) return
    const id = requestAnimationFrame(() => focusTeam(team))
    return () => cancelAnimationFrame(id)
    // focusTeam 은 여는 순간의 것만 쓴다 — deps 에 넣지 않는다
  }, [open, team])

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} wide className="lg:h-[min(820px,calc(100dvh-32px))]">
      <div className="flex flex-none flex-wrap items-end justify-between gap-4 border-b border-line p-6 pr-16 sm:p-8 sm:pr-20">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-accent">{t.info.title}</p>
          <h2 id={titleId} className="mt-2 text-[clamp(22px,2.4vw,28px)]/[1.3] font-bold tracking-[-0.025em]">
            {t.info.org.title}
          </h2>
          <p className="mt-1.5 text-base text-muted">{f(t.info.org.summary, { teams: teams.length, units })}</p>
        </div>
        <SearchBox
          value={query}
          onChange={(q) => {
            setQuery(q)
            setActive(undefined)
          }}
          label={t.info.org.search}
          placeholder={t.info.org.searchPlaceholder}
          className="w-full sm:w-80"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* 팀 목록 — 좁은 화면에서는 가로로 넘긴다 */}
        <nav aria-label={t.info.org.teams} className="flex-none border-b border-line lg:w-60 lg:border-r lg:border-b-0">
          <ul className="flex gap-1.5 overflow-x-auto p-3 [scrollbar-width:none] lg:h-full lg:[scrollbar-width:auto] lg:flex-col lg:overflow-y-auto lg:overscroll-contain">
            {listed.map((team) => {
              const on = team.id === active
              return (
                <li key={team.id} className="flex-none">
                  <button
                    type="button"
                    onClick={() => focusTeam(team.id)}
                    aria-current={on ? 'true' : undefined}
                    className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition-[background-color,color,scale] duration-150 active:scale-[0.98] ${
                      on ? 'bg-accent-fill text-white' : 'hover:bg-subtle'
                    }`}
                  >
                    <span className="text-[15px] font-bold whitespace-nowrap">{team.name}</span>
                    <span className={`text-sm font-semibold whitespace-nowrap tabular-nums ${on ? 'text-white/90' : 'text-muted'}`}>
                      {f(t.info.org.units, { count: unitCount(team) })}
                    </span>
                  </button>
                </li>
              )
            })}
            {!listed.length &&<li className="px-2 py-2 text-sm text-muted">{f(t.info.org.noResults, { query: query.trim() })}</li>}
          </ul>
        </nav>

        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 sm:px-6">
          <OrgChartView query={query} active={active} />
        </div>
      </div>
    </Modal>
  )
}
