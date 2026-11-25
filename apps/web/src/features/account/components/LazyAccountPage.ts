import { lazy } from 'react'

const load = () => import('./AccountPage').then((m) => ({ default: m.AccountPage }))

/** 처음 갈 때 받는 계정 화면. preload 는 App 이 한가할 때 미리 받는다 */
export const LazyAccountPage = Object.assign(lazy(load), { preload: load })
