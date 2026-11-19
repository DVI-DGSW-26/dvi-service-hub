import { lazy, Suspense } from 'react'
import { BOARD } from '@/features/home'
import { useMedia } from '@/shared/hooks'
import { useHub } from './useHub'

// 셸은 화면 폭에 맞는 쪽만 받는다 — 휴대폰은 칸 위젯 판(react-grid-layout) · 사이드바 코드를 받지 않는다(docs/adr/0004)
const DesktopApp = lazy(() => import('./DesktopApp'))
const MobileApp = lazy(() => import('./MobileApp'))

/** 실행점 — 공용 상태를 들고 화면 폭(64rem)으로 넓은 화면 · 좁은 화면 셸을 고른다 */
export default function App() {
  const hub = useHub()
  const wide = useMedia(BOARD)
  return <Suspense>{wide ? <DesktopApp hub={hub} /> : <MobileApp hub={hub} />}</Suspense>
}
