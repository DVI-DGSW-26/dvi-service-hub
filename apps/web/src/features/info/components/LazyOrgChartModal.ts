import { lazy } from 'react'

/** 눌러서 열 때 받는 조직도 창 — 바로가기 패널이 쓴다 */
export const LazyOrgChartModal = lazy(() => import('./OrgChartModal').then((m) => ({ default: m.OrgChartModal })))
