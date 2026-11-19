import { lazy } from 'react'

/** 처음 갈 때 받는 정보 화면 */
export const LazyInfoPage = lazy(() => import('./InfoPage').then((m) => ({ default: m.InfoPage })))
