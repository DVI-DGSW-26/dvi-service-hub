import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { meApi, type HubMe } from '../api/hub'
import { preferenceKey, preferenceQueries, readLocalFavorites, writeLocalFavorites } from '../api/queries'

/**
 * 즐겨찾기한 서비스 id — 허브 서버에 사람별로 저장해 다른 기기에서도 같다.
 * 브라우저에도 사본을 남겨, 서버가 응답하지 않으면 그 사본으로 그리고 이 브라우저에서만 바꾼다.
 */
export function useFavorites() {
  const qc = useQueryClient()
  const server = useQuery(preferenceQueries.me()).data
  const [local, setLocal] = useState(readLocalFavorites)
  const favorites = server?.favorites ?? local

  const toggle = (id: string) => {
    const on = !favorites.includes(id)
    const next = on ? [...favorites, id] : favorites.filter((x) => x !== id)
    setLocal(next)
    writeLocalFavorites(next)
    if (!server) return
    qc.setQueryData<HubMe>(preferenceKey, { ...server, favorites: next })
    // 실패하면 서버 값으로 되돌린다
    ;(on ? meApi.addFavorite(id) : meApi.removeFavorite(id)).catch(() => qc.invalidateQueries({ queryKey: preferenceKey }))
  }

  return { favorites, toggleFavorite: toggle }
}
