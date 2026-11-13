import { useCallback, useState } from 'react'

const KEY = 'favorites'

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** 즐겨찾기한 서비스 id. 이 브라우저에만 저장된다 (저장이 막혀 있으면 이번 화면에서만 유지). */
export function useFavorites() {
  const [ids, setIds] = useState<string[]>(load)

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  return { favorites: ids, toggleFavorite: toggle }
}
