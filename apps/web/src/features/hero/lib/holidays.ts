/**
 * 공휴일 — 인사 문구가 명절 · 휴일 인사를 고르는 데만 쓴다.
 * 양력 공휴일은 해마다 같고, 음력(설 · 추석 · 부처님오신날)은 해마다 날짜를 적는다.
 * shortcut: 대체공휴일 · 선거일 · 임시공휴일은 없다, 정확히 맞춰야 하면 공휴일 API(공공데이터포털)로 바꾼다
 */
const FIXED = ['01-01', '03-01', '05-05', '06-06', '08-15', '10-03', '10-09', '12-25']

/** 음력 공휴일 — 설 · 추석은 가운데 날(당일). 앞뒤 하루도 연휴다. 2031 년부터는 여기 적어야 한다 */
const LUNAR: Partial<Record<number, { seollal: string; chuseok: string; buddha: string }>> = {
  2026: { seollal: '02-17', chuseok: '09-25', buddha: '05-24' },
  2027: { seollal: '02-07', chuseok: '09-15', buddha: '05-13' },
  2028: { seollal: '01-26', chuseok: '10-03', buddha: '05-02' },
  2029: { seollal: '02-13', chuseok: '09-22', buddha: '05-20' },
  2030: { seollal: '02-03', chuseok: '09-12', buddha: '05-09' },
}

const md = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const shift = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days)

/** 설 · 추석 연휴(당일과 앞뒤 하루)인지 */
export function lunarHoliday(d: Date): 'seollal' | 'chuseok' | null {
  for (const key of ['seollal', 'chuseok'] as const) {
    if ([-1, 0, 1].some((n) => LUNAR[shift(d, n).getFullYear()]?.[key] === md(shift(d, n)))) return key
  }
  return null
}

/** 공휴일인지 (설 · 추석 연휴 포함) */
export function isHoliday(d: Date): boolean {
  return FIXED.includes(md(d)) || LUNAR[d.getFullYear()]?.buddha === md(d) || lunarHoliday(d) !== null
}

export { md as monthDay }
