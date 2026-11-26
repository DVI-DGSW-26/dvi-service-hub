import { interpolate, type Messages } from '@/shared/i18n'
import type { GreetingContext } from './greetingContext'
import { isHoliday, lunarHoliday, monthDay } from './holidays'

/**
 * 인사 카드 문구 고르기. 문구는 사전(shared/i18n/messages/<lang>/greetings/)에 있고, 여기서는 지금에 맞는 것만 추린다.
 * {name} 자리에 호칭(ko 'OOO 님' · en 이름)이 들어가고, {name} 이 없는 문구는 끝에 호칭을 붙인다(withName).
 * 넓은 화면에서 한 줄에 들어가도록 이름을 빼고 짧게 쓴다 (ko 12자 · en 26자 안팎).
 *
 * 세 층으로 고른다
 *   그날만의 것   첫 방문 · 새해 · 설 · 추석 · 크리스마스 · 이스터에그(11:11 · 만우절 · 안전점검의 날 …) — 있으면 이것만
 *   지금의 것     날씨 · 휴일 · 월초 · 월말 · 연말 · 오랜만 · 오래 켜 둠 — 있으면 절반쯤 이것
 *   늘 있는 것    시간대 · 요일 · 계절 · 응원 · 안전, 그리고 드문 이스터에그 한 줄
 */
type Pools = Messages['greetings']
type Slot = keyof Pools['time']

/** 시간대 — 밤(~4시) · 새벽(~7시) · 아침(~10시) · 늦은 오전(~12시) · 점심(~13시) · 오후(~16시) · 늦은 오후(~18시) · 저녁(~22시) · 밤 */
function slot(h: number): Slot {
  if (h < 4) return 'night'
  if (h < 7) return 'dawn'
  if (h < 10) return 'morning'
  if (h < 12) return 'lateMorning'
  if (h < 13) return 'lunch'
  if (h < 16) return 'afternoon'
  if (h < 18) return 'lateAfternoon'
  if (h < 22) return 'evening'
  return 'night'
}

/** 일=0 … 토=6 */
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
const SEASONS = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'] as const

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const lastDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()

/** 그날만의 문구 — 있으면 이것만 쓴다 */
function only(now: Date, p: Pools, ctx: GreetingContext): string[] {
  if (ctx.visit === 'firstVisit') return p.activity.firstVisit
  const byTime: Partial<Record<string, string[]>> = p.easter.time
  const byDate: Partial<Record<string, string[]>> = p.easter.date
  const easter = byTime[hhmm(now)] ?? byDate[monthDay(now)]
  if (easter) return easter
  const lunar = lunarHoliday(now)
  if (lunar) return p.date[lunar]
  if (monthDay(now) === '01-01') return p.date.newYear
  if (monthDay(now) === '12-24' || monthDay(now) === '12-25') return p.date.christmas
  if (now.getDate() === 13 && now.getDay() === 5) return p.easter.friday13
  if (now.getDate() === 4) return p.easter.safetyDay
  return []
}

/** 지금의 문구 — 늘 있는 문구와 반반쯤 섞는다 */
function timely(now: Date, p: Pools, ctx: GreetingContext): string[] {
  const d = now.getDate()
  const lines = ctx.weather.flatMap((w) => p.weather[w])
  if (isHoliday(now)) lines.push(...p.date.holiday)
  if (d <= 2) lines.push(...p.date.monthStart)
  if (now.getMonth() === 11 && d >= 26) lines.push(...p.date.yearEnd)
  else if (d >= lastDayOfMonth(now) - 1) lines.push(...p.date.monthEnd)
  if (ctx.visit === 'longAbsence' || ctx.visit === 'longSession') lines.push(...p.activity[ctx.visit])
  return lines
}

/** 늘 있는 문구 */
function usual(now: Date, p: Pools, ctx: GreetingContext): string[] {
  const day = DAYS[now.getDay()]
  return [
    ...p.time[slot(now.getHours())],
    ...p.day[day],
    ...(day === 'sat' || day === 'sun' ? p.day.weekend : []),
    ...p.season[SEASONS[now.getMonth()]],
    ...p.general.encouragement,
    ...p.general.safety,
    ...(ctx.visit === 'firstLoginToday' || ctx.visit === 'returnVisit' ? p.activity[ctx.visit] : []),
    // 드문 이스터에그 — 날마다 한 줄만 넣어 고를 확률을 낮춘다
    p.easter.rare[now.getDate() % p.easter.rare.length],
  ]
}

/** 지금 어울리는 문구 전부 — 이 중 하나를 고른다 */
export function greetings(now: Date, name: string, pools: Pools, ctx: GreetingContext = { weather: [] }): string[] {
  let lines = only(now, pools, ctx)
  if (!lines.length) {
    const base = usual(now, pools, ctx)
    const extra = timely(now, pools, ctx)
    // 지금의 문구가 절반쯤 되도록 늘 있는 문구 수만큼 되풀이한다
    lines = extra.length ? [...base, ...Array.from({ length: base.length }, (_, i) => extra[i % extra.length])] : base
  }
  const who = interpolate(pools.name, { name })
  return lines.map((line) => (line.includes('{name}') ? interpolate(line, { name: who }) : interpolate(pools.withName, { line, name: who })))
}

/** 이름을 아직 모를 때 쓰는 기본 인사 */
export function plainGreeting(now: Date, pools: Pools) {
  return pools.plain[slot(now.getHours())]
}
