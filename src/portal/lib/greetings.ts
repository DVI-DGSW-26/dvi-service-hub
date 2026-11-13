import { interpolate, type Messages } from '../i18n'

/**
 * 인사 카드 문구 고르기. 문구는 사전(i18n/<lang>/greetings.json)에 있고, 여기서는 시간대 · 요일에 맞는 것만 추린다.
 * {name} 자리에 호칭(ko 'OOO 님' · en 이름)이 들어가고, {name} 이 없는 문구는 끝에 호칭을 붙인다(withName).
 * 넓은 화면에서 한 줄에 들어가도록 이름을 빼고 짧게 쓴다 (ko 12자 · en 26자 안팎).
 */
type Pools = Messages['greetings']

/** 시간대 나누기 — 새벽(~5시) · 아침(~11시) · 점심(~13시) · 오후(~18시) · 저녁(~22시) · 밤. 새벽과 밤은 같은 문구 */
function byTime(h: number, pools: Pools): string[] {
  if (h < 5) return pools.night
  if (h < 11) return pools.morning
  if (h < 13) return pools.lunch
  if (h < 18) return pools.afternoon
  if (h < 22) return pools.evening
  return pools.night
}

/** 요일에 맞춰 섞어 넣는 문구 (일=0 … 토=6, 주말은 같은 문구) */
const DAY_KEYS = ['weekend', 'mon', 'tue', 'wed', 'thu', 'fri', 'weekend'] as const

/** 지금 시간대 · 요일에 어울리는 문구 전부 */
export function greetings(now: Date, name: string, pools: Pools): string[] {
  const lines = [...byTime(now.getHours(), pools), ...pools.byDay[DAY_KEYS[now.getDay()]]]
  const who = interpolate(pools.name, { name })
  return lines.map((line) => (line.includes('{name}') ? interpolate(line, { name: who }) : interpolate(pools.withName, { line, name: who })))
}

/** 이름을 아직 모를 때 쓰는 기본 인사 */
export function plainGreeting(now: Date, pools: Pools) {
  const h = now.getHours()
  if (h < 5) return pools.plain.night
  if (h < 12) return pools.plain.morning
  if (h < 18) return pools.plain.afternoon
  return pools.plain.evening
}
