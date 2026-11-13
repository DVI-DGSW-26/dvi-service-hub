import { House, Info, LayoutGrid, type LucideIcon } from 'lucide-react'
import type { Page } from '../../hooks/useHashRoute'

/**
 * 사이드바(넓은 화면)와 하단 탭바(좁은 화면)가 같이 쓰는 주 메뉴.
 * 사내정보는 메뉴에 두지 않는다 — 홈의 사내정보센터 · 빠른 바로가기에서 들어간다.
 */
export const NAV_ITEMS: { page: Page; label: string; icon: LucideIcon }[] = [
  { page: 'home', label: '포털 홈', icon: House },
  { page: 'systems', label: '업무시스템', icon: LayoutGrid },
  { page: 'guide', label: '이용안내', icon: Info },
]

const PAGE_LABEL: Record<Page, string> = { home: '포털 홈', systems: '업무시스템', info: '사내정보', guide: '이용안내', account: '계정 설정' }

export const pageLabel = (page: Page) => PAGE_LABEL[page]
