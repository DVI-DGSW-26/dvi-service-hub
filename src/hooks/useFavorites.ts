import { useState } from 'react'
import { KEYS, readPref, writePref } from '../lib/theme'

function load(): string[] {
  try {
    const parsed: unknown = JSON.parse(readPref(KEYS.favorites) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** 즐겨찾기한 서비스 id. 이 브라우저에만 저장된다 (저장이 막혀 있으면 이번 화면에서만 유지). */
export function useFavorites() {
  const [ids, setIds] = useState<string[]>(load)

  const toggle = (id: string) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      writePref(KEYS.favorites, JSON.stringify(next))
      return next
    })
  }

  return { favorites: ids, toggleFavorite: toggle }
}
