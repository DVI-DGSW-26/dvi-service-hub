import { lazy } from 'react'

/** 처음 갈 때 받는 시스템 화면 — App 이 lazy 로 부른다 */
export const LazySystemsPage = lazy(() => import('./SystemsPage').then((m) => ({ default: m.SystemsPage })))
