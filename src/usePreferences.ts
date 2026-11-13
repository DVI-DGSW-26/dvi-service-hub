/**
 * 즐겨찾기 · 최근 사용 — 서버에 사람별로 저장한다. 다른 기기에서도 같은 목록이 보인다.
 *
 * 브라우저(localStorage)에도 같은 내용을 남겨 둔다. 서버가 응답하지 않을 때는 그 사본으로
 * 화면을 그리고 그대로 쓸 수 있게 한다 — 입구 화면이 서버 장애로 멈추면 안 된다.
 * 공용 PC 에서 계정끼리 섞이지 않도록 키에 이메일을 붙인다.
 */
import { useEffect, useState } from 'react'
import { addFavorite, fetchHubMe, importFavorites, markRecent, removeFavorite } from './api'

const RECENT_MAX = 4

function readIds(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function writeIds(key: string, ids: string[]) {
  try { localStorage.setItem(key, JSON.stringify(ids)) } catch { /* 저장을 막은 브라우저 — 서버에는 남는다 */ }
}

/** 실패해도 화면을 막지 않는다. 다음에 열 때 서버 값으로 다시 맞춰진다 */
function quietly(request: Promise<unknown>) {
  request.catch((e) => console.warn('[hub] 저장하지 못했습니다', e))
}

export function usePreferences(userKey: string | null) {
  const [favorites, setFavorites] = useState<string[]>([])
  const [recent, setRecent] = useState<string[]>([])
  const [admin, setAdmin] = useState(false)
  /** 서버에서 내 정보를 받았는가. 못 받았으면 브라우저 사본으로만 동작한다 */
  const [synced, setSynced] = useState(false)

  const favKey = userKey && `hub.favorites:${userKey}`
  const recentKey = userKey && `hub.recent:${userKey}`

  useEffect(() => {
    if (!favKey || !recentKey) return
    let cancelled = false
    const localFavorites = readIds(favKey)
    setFavorites(localFavorites)
    setRecent(readIds(recentKey))

    fetchHubMe()
      .then((me) => {
        if (cancelled) return
        setAdmin(me.admin)
        setSynced(true)
        setRecent(me.recent)
        writeIds(recentKey, me.recent)

        // 서버에 저장하기 전부터 쓰던 사람은 즐겨찾기가 이 브라우저에만 있다. 한 번 올려 보낸다.
        // 서버 것이 하나라도 있으면 이미 옮긴 사람이라 서버 값을 그대로 따른다.
        if (me.favorites.length === 0 && localFavorites.length > 0) {
          quietly(importFavorites(localFavorites))
          return
        }
        setFavorites(me.favorites)
        writeIds(favKey, me.favorites)
      })
      .catch(() => { /* 서버가 응답하지 않는다 — 브라우저 사본으로 계속 쓴다 */ })
    return () => { cancelled = true }
  }, [favKey, recentKey])

  const toggleFavorite = (id: string) => {
    if (!favKey) return
    const on = !favorites.includes(id)
    const next = on ? [...favorites, id] : favorites.filter((x) => x !== id)
    setFavorites(next)
    writeIds(favKey, next)
    if (synced) quietly(on ? addFavorite(id) : removeFavorite(id))
  }

  const markUsed = (id: string) => {
    if (!recentKey) return
    const next = [id, ...recent.filter((x) => x !== id)].slice(0, RECENT_MAX)
    setRecent(next)
    writeIds(recentKey, next)
    if (synced) quietly(markRecent(id))
  }

  return { favorites, recent, admin, toggleFavorite, markUsed }
}
