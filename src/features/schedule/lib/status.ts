import { toMinutes } from '@/shared/format'
import type { ScheduleItem } from '@/shared/types'

/** 종일 · 여러 날 일정은 시각이 없어 진행 상태 대신 '종일' 로 둔다 */
export type ScheduleStatus = 'done' | 'now' | 'upcoming' | 'allDay'

// 시간 일정에는 start · end 가 늘 있다 (명세 4.2). 빠져 오면 하루 끝으로 본다
export const startOf = (s: ScheduleItem) => toMinutes(s.start ?? '00:00')
const DAY = 24 * 60
/**
 * 자정에 끝나는 일정(22:00 ~ 00:00)은 end 가 start 보다 작게 온다 (명세 4.1) — 그날 끝(24:00)으로 본다.
 * 그대로 두면 00:00 = 0분이라 시작하기도 전에 '끝남' 이 된다.
 */
export const endOf = (s: ScheduleItem) => {
  const end = toMinutes(s.end ?? '23:59')
  return end < startOf(s) ? end + DAY : end
}

export function statusOf(s: ScheduleItem, now: number): ScheduleStatus {
  if (s.allDay) return 'allDay'
  if (now >= endOf(s)) return 'done'
  if (now >= startOf(s)) return 'now'
  return 'upcoming'
}
