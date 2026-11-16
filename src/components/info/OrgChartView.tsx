import { orgChart } from '../../data/orgChart'
import { useI18n } from '../../i18n'
import type { OrgChart, OrgTeam, OrgUnit } from '../../types/portal'

/** 가지를 잇는 점선 */
const LINE = 'border-dashed border-fg/20'

/** 팀의 담당 이름 전부 — 담당 아래 담당까지 */
const unitNames = (team: OrgTeam) => team.units.flatMap((u) => [u.name, ...(u.units ?? [])])

/** 팀의 담당 수 — 담당 아래 담당까지 센다 */
export const unitCount = (team: OrgTeam) => unitNames(team).length

/** 찾는 글자에 맞는 팀 · 파트. 팀 이름이 맞으면 그 팀의 파트 전부 */
export function orgMatch(team: OrgTeam, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return { team: false, units: [] as string[], any: true }
  const byName = team.name.toLowerCase().includes(q)
  const units = byName ? unitNames(team) : unitNames(team).filter((u) => u.toLowerCase().includes(q))
  return { team: byName, units, any: byName || units.length > 0 }
}

interface Focus {
  /** 찾는 글자 — 맞는 칸은 강조, 나머지 팀은 흐리게 */
  query: string
  /** 왼쪽 목록에서 고른 팀 id */
  active?: string
}

/**
 * 조직도. 대표 → 총괄 → (옆 가지) 자문 → 팀 → 담당 순으로 내려간다.
 * 넓은 칸(md 이상)은 나무 모양으로 그리고, 칸이 좁으면 가로로 넘겨 본다. 휴대폰은 팀 카드 목록으로 바꾼다.
 * 팀 칸에는 data-team 을 달아 두어 바깥에서 그 팀으로 스크롤할 수 있다.
 */
export function OrgChartView({ query = '', active }: Partial<Focus>) {
  const { t } = useI18n()

  return (
    <div className="mt-2">
      <div className="text-center">
        <p className="text-sm font-semibold text-accent">{t.info.org.eyebrow}</p>
      </div>
      <Tree chart={orgChart} focus={{ query, active }} />
      <Stacked chart={orgChart} focus={{ query, active }} />
    </div>
  )
}

function Head({ name, className = '' }: { name: string; className?: string }) {
  return (
    <div className={`grid place-items-center rounded-full bg-accent-soft p-3 ${className}`}>
      <div className="grid size-full place-items-center rounded-full border-[10px] border-accent-fill bg-raised shadow-[0_8px_24px_-12px_oklch(0_0_0/0.35)]">
        <span className="text-xl font-extrabold tracking-[-0.02em] text-accent">{name}</span>
      </div>
    </div>
  )
}

const advisorBox = 'rounded-2xl bg-accent-fill px-4 py-4 text-center text-base font-bold text-white shadow-[0_10px_24px_-12px_oklch(0_0_0/0.45)]'
const teamBox = 'glass w-full rounded-2xl px-2 py-5 text-center text-base font-bold break-keep'
const chiefBox = 'rounded-2xl bg-raised px-4 py-4 text-center text-base font-bold ring-2 ring-accent/50 shadow-[0_10px_24px_-14px_oklch(0_0_0/0.4)]'
const unitBox = 'w-full rounded-xl bg-subtle px-2 py-3 text-center text-sm text-muted ring-1 ring-line break-keep'
const subUnitBox = 'w-full rounded-lg border border-dashed border-fg/20 px-2 py-2 text-center text-[13px] text-muted break-keep'
const HIT = 'ring-2! ring-accent! text-accent!'

/** 팀 칸 · 파트 칸에 덧붙일 강조 · 흐림 */
function marks(team: OrgTeam, { query, active }: Focus) {
  const m = orgMatch(team, query)
  return {
    column: `transition-opacity duration-200 ${m.any ? '' : 'opacity-30'}`,
    team: m.team || team.id === active ? HIT : '',
    unit: (u: string) => (m.units.includes(u) && !m.team ? HIT : ''),
  }
}

/** 나무 모양 — 팀 칸은 같은 폭(6등분)이라 가로줄을 첫 팀 · 끝 팀 가운데(1/12)부터 그을 수 있다 */
function Tree({ chart, focus }: { chart: OrgChart; focus: Focus }) {
  const n = chart.teams.length
  const edge = `calc(100% / ${n * 2})`
  return (
    <div className="hidden overflow-x-auto pb-2 md:block">
      <div className="mx-auto max-w-[1100px] min-w-[860px] pt-6">
        <div className="flex justify-center">
          <Head name={chart.head} className="size-44" />
        </div>

        {chart.chief && (
          <div className="flex flex-col items-center">
            <span className={`h-8 border-l ${LINE}`} aria-hidden="true" />
            <div className={chiefBox} style={{ width: `calc(100% / ${n})` }}>
              {chart.chief}
            </div>
          </div>
        )}

        {/* 위에서 내려오는 줄 + 오른쪽 자문 가지 */}
        <div className="relative h-28">
          <span className={`absolute top-0 left-1/2 h-full border-l ${LINE}`} />
          {chart.advisors.map((a) => (
            <div key={a}>
              <span className={`absolute top-1/2 left-1/2 border-t ${LINE}`} style={{ right: edge }} />
              <div className="absolute top-1/2 right-0 -translate-y-1/2 px-2" style={{ width: `calc(100% / ${n})` }}>
                <div className={advisorBox}>{a}</div>
              </div>
            </div>
          ))}
        </div>

        <ul className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          <span className={`absolute top-0 border-t ${LINE}`} style={{ left: edge, right: edge }} aria-hidden="true" />
          {chart.teams.map((team) => {
            const mk = marks(team, focus)
            return (
              <li key={team.id} data-team={team.id} className={`flex scroll-m-6 flex-col items-center px-2 ${mk.column}`}>
                <span className={`h-8 border-l ${LINE}`} aria-hidden="true" />
                <div className={`${teamBox} ${mk.team}`}>{team.name}</div>
                <ul className="flex w-full flex-col items-center" aria-label={team.name}>
                  {team.units.map((u) => (
                    <li key={u.name} className="flex w-full flex-col items-center">
                      <span className={`h-7 border-l ${LINE}`} aria-hidden="true" />
                      <div className={`${unitBox} ${mk.unit(u.name)}`}>{u.name}</div>
                      <SubUnits unit={u} mark={mk.unit} />
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/** 휴대폰 — 대표 · 자문을 위에 두고 팀마다 카드 한 장 */
function Stacked({ chart, focus }: { chart: OrgChart; focus: Focus }) {
  return (
    <div className="mt-5 md:hidden">
      <div className="flex flex-col items-center gap-3">
        <Head name={chart.head} className="size-36" />
        {chart.chief && <div className={`${chiefBox} w-40`}>{chart.chief}</div>}
        {chart.advisors.map((a) => (
          <div key={a} className={`${advisorBox} w-40`}>
            {a}
          </div>
        ))}
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-2.5">
        {chart.teams.map((team) => {
          const mk = marks(team, focus)
          return (
            <li key={team.id} data-team={team.id} className={`glass scroll-m-4 rounded-2xl p-3 ${mk.column} ${mk.team}`}>
              <p className="text-center text-[15px] font-bold break-keep">{team.name}</p>
              <ul className="mt-2.5 space-y-1.5" aria-label={team.name}>
                {team.units.map((u) => (
                  <li key={u.name}>
                    <div className={`${unitBox} ${mk.unit(u.name)}`}>{u.name}</div>
                    <SubUnits unit={u} mark={mk.unit} />
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** 담당 아래 담당 — 한 칸 들여 작게 (생산관리 → AL압출 · 정밀가공) */
function SubUnits({ unit, mark }: { unit: OrgUnit; mark: (name: string) => string }) {
  if (!unit.units?.length) return null
  return (
    <ul className="flex w-full flex-col items-center pl-5" aria-label={unit.name}>
      {unit.units.map((s) => (
        <li key={s} className="flex w-full flex-col items-center">
          <span className={`h-4 border-l ${LINE}`} aria-hidden="true" />
          <div className={`${subUnitBox} ${mark(s)}`}>{s}</div>
        </li>
      ))}
    </ul>
  )
}
