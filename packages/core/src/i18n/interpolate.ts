const PLACEHOLDER = /\{(\w+)\}/g

export type Vars = Record<string, string | number>

/** 수에 따라 모양이 바뀌는 문구 */
export interface Plural {
  one: string
  other: string
}

/** '{name} 님' + { name: '지현' } → '지현 님'. 값이 없는 자리는 그대로 둔다 — 빠진 걸 화면에서 알아볼 수 있게 */
export function interpolate(template: string, vars?: Vars) {
  if (!vars) return template
  return template.replace(PLACEHOLDER, (whole, key: string) => (key in vars ? String(vars[key]) : whole))
}

const rules = new Map<string, Intl.PluralRules>()

/** 복수형 고르기 — Plural 이면 로캘 규칙으로 one/other. 규칙 객체는 로캘마다 한 번만 만든다 */
export function pickPlural(entry: string | Plural, locale: string, count = 0) {
  if (typeof entry === 'string') return entry
  let r = rules.get(locale)
  if (!r) rules.set(locale, (r = new Intl.PluralRules(locale)))
  return entry[r.select(count) === 'one' ? 'one' : 'other']
}
