import { House, Info, LayoutGrid, Settings, type LucideIcon } from 'lucide-react'
import type { Page } from '../../hooks/useHashRoute'

/**
 * 사이드바(넓은 화면)와 하단 탭바(좁은 화면)가 같이 쓰는 주 메뉴. 이름은 사전(t.layout.pages)에 있다.
 * 사내정보는 메뉴에 두지 않는다 — 홈의 사내정보센터 · 빠른 바로가기에서 들어간다.
 */
export const NAV_ITEMS: { page: Page; icon: LucideIcon }[] = [
  { page: 'home', icon: House },
  { page: 'systems', icon: LayoutGrid },
  { page: 'guide', icon: Info },
  { page: 'account', icon: Settings },
]
