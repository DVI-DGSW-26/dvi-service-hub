import { lazy } from 'react'

const load = () => import('./SystemsPage').then((m) => ({ default: m.SystemsPage }))

/** 처음 갈 때 받는 시스템 화면 — App 이 lazy 로 부른다. preload 는 App 이 한가할 때 미리 받는다 */
export const LazySystemsPage = Object.assign(lazy(load), { preload: load })
