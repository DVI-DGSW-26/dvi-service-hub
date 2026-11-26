import { lazy } from 'react'
import { BOARD } from '@/shared/constants'

const load = () => import('./WideBoard').then((m) => ({ default: m.WideBoard }))

/** 넓은 화면 판(react-grid-layout) — 휴대폰은 받지 않는다. 넓은 화면은 판을 그리기 전에 바로 받기 시작한다 */
export const LazyWideBoard = lazy(load)
if (matchMedia(BOARD).matches) void load().catch(() => undefined)
