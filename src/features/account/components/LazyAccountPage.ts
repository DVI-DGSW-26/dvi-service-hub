import { lazy } from 'react'

/** 처음 갈 때 받는 계정 화면 */
export const LazyAccountPage = lazy(() => import('./AccountPage').then((m) => ({ default: m.AccountPage })))
