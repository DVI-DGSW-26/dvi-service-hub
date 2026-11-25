import { lazy } from 'react'

const load = () => import('./InfoPage').then((m) => ({ default: m.InfoPage }))

/** 처음 갈 때 받는 정보 화면. preload 는 App 이 한가할 때 미리 받는다 */
export const LazyInfoPage = Object.assign(lazy(load), { preload: load })
