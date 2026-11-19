import type { MaintenanceKind } from '@/shared/types'
import type { BadgeTone } from '@/shared/ui'

/** 안내 종류마다 배지 색 */
export const MAINTENANCE_TONE: Record<MaintenanceKind, BadgeTone> = { NOTICE: 'accent', MAINTENANCE: 'warn', INCIDENT: 'danger' }
