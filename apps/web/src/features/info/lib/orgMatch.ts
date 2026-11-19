import type {  OrgTeam } from '@dvi/core/types'

/** 팀의 담당 이름 전부 — 담당 아래 담당까지 */
export const unitNames = (team: OrgTeam) => team.units.flatMap((u) => [u.name, ...(u.units ?? [])])

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
