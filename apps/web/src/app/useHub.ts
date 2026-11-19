import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { accountQueries } from '@/features/account'
import { useDecor } from '@/features/decor'
import { useWidgetLayout, visibleWidgets } from '@/features/home'
import { canSee, services, sortByFavorite, useFavorites } from '@/features/systems'
import { usePortalTheme } from '@/features/theme'
import { hrefOf, useHashRoute } from '@/shared/hooks'

/**
 * 넓은 화면(DesktopApp) · 좁은 화면(MobileApp)이 같이 쓰는 상태 — App 이 들고 있어 화면 폭이 바뀌어 셸이 갈려도
 * 검색어 · 편집 중 · 위젯 배치가 이어진다
 */
export function useHub() {
  const route = useHashRoute()
  const theme = usePortalTheme()
  // 받는 중이면 스켈레톤 · 받은 뒤 null 이면 로그인 정보 없음
  const meQuery = useQuery(accountQueries.me())
  const me = meQuery.data ?? null
  const meLoading = meQuery.isPending
  const [query, setQuery] = useState('')
  const { favorites, toggleFavorite } = useFavorites()
  const decor = useDecor()

  // 권한으로 거르고 즐겨찾기를 앞으로 — 홈과 업무시스템 화면이 같은 목록을 쓴다
  const mine = sortByFavorite(services.filter((s) => canSee(s, me)), favorites)
  // 권한과 상관없이 전부 — 홈 업무시스템의 '전체' 보기
  const all = sortByFavorite(services, favorites)

  // 상단 검색칸은 어느 화면에서든 업무시스템 화면으로 데려가 결과를 보여준다
  const onQueryChange = (q: string) => {
    setQuery(q)
    if (route.page !== 'systems') location.hash = hrefOf('systems')
  }

  const home = route.page === 'home'
  const visible = visibleWidgets(me)
  const widgets = useWidgetLayout(visible)
  // 홈을 떠나면 편집도 끝난다
  const [editingHome, setEditing] = useState(false)
  const editing = editingHome && home
  const startEditing = () => setEditing(true)
  const stopEditing = () => setEditing(false)
  // 테마 메뉴 · 설정 화면의 '홈 배경 · 그림 바꾸기' — 어느 화면에서든 홈으로 가서 편집을 연다
  const customize = () => {
    location.hash = hrefOf('home')
    setEditing(true)
  }

  // Esc 로도 편집을 마친다(열린 창이 있으면 창부터, 배경 위치 조정 중이면 조정부터 끝난다)
  const adjusting = decor.adjusting
  useEffect(() => {
    if (!editing || adjusting) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('dialog[open]') && setEditing(false)
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [editing, adjusting])
  // 편집이 끝나면(완료 · 다른 화면으로) 위치 조정도 지금 자리로 마친다
  useEffect(() => {
    if (!editing && adjusting) decor.endAdjust(true)
  })

  /** 위젯이 그릴 때 받는 것 */
  const ctx = { me, meLoading, services: mine, allServices: all, favorites, onToggleFavorite: toggleFavorite, hero: decor.hero ? { src: decor.hero, pos: decor.pos.hero } : null }

  return { route, theme, me, meLoading, query, setQuery, onQueryChange, favorites, toggleFavorite, decor, adjusting, mine, home, visible, widgets, editing, startEditing, stopEditing, customize, ctx }
}

export type Hub = ReturnType<typeof useHub>
