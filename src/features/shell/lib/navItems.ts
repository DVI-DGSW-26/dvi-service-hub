import { Building2, House, LayoutGrid, Settings, type LucideIcon } from 'lucide-react'
import type { Page } from '@/shared/hooks'

/**
 * 사이드바(넓은 화면)와 하단 탭바(좁은 화면)가 같이 쓰는 주 메뉴. 이름은 사전(t.layout.pages)에 있다.
 */
export const NAV_ITEMS: { page: Page; icon: LucideIcon }[] = [
  { page: 'home', icon: House },
  { page: 'systems', icon: LayoutGrid },
  { page: 'info', icon: Building2 },
  { page: 'account', icon: Settings },
]
