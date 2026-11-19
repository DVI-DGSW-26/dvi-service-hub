import type { Lang } from '@/shared/i18n'
import { dateTimeRange } from '@/shared/format'
import type { Maintenance } from '@dvi/core/types'

/** 일정 문구 — '11.22 (일) 02:00 ~ 06:00' */
export const maintenanceWhen = (m: Maintenance, lang: Lang) => dateTimeRange(m.date, m.start, m.end, lang)
