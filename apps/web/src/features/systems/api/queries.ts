// 허브 서버의 기존 API 훅.

import { queryOptions } from '@tanstack/react-query'
import { adminServicesApi, fetchServices, meApi, type HubMe, type ServiceInput } from './hub'
import { queryClient, useWrite } from '@/shared/api'
import { KEYS, readPref, writePref } from '@/shared/lib'

// 관리 목록 열쇠가 ['services'] 로 시작해서 관리 화면에서 고치면 홈 · 업무시스템 목록도 함께 다시 받는다
const serviceKeys = { list: ['services'] as const, admin: ['services', 'admin'] as const }
export const preferenceKey = ['hub', 'me'] as const

/** 이 브라우저의 즐겨찾기 사본 — 서버에 닿지 못할 때 이걸로 그린다 */
export function readLocalFavorites(): string[] {
  try {
    const parsed: unknown = JSON.parse(readPref(KEYS.favorites) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export const writeLocalFavorites = (ids: string[]) => writePref(KEYS.favorites, JSON.stringify(ids))

/**
 * 서버에 저장하기 전부터 이 브라우저에만 즐겨찾기가 있던 사람 — 처음 한 번 서버로 올린다.
 * 한 번 맞춘 브라우저는 표시를 남겨, 다른 기기에서 모두 지운 즐겨찾기를 이 브라우저의 옛 사본으로 되살리지 않는다.
 */
async function fetchPreferences({ signal }: { signal?: AbortSignal }) {
  const me = await meApi.get({ signal })
  const local = readLocalFavorites()
  if (readPref(KEYS.favoritesSynced) || me.favorites.length > 0 || local.length === 0) {
    writePref(KEYS.favoritesSynced, '1')
    writeLocalFavorites(me.favorites)
    return me
  }
  await meApi.importFavorites(local)
  writePref(KEYS.favoritesSynced, '1')
  return { ...me, favorites: local }
}

export const serviceQueries = {
  /** 서버의 서비스 목록 (GET /services). 실패하면 호출부가 내장 목록(services.ts)으로 돌아간다 */
  list: () =>
    queryOptions({
      queryKey: serviceKeys.list,
      queryFn: ({ signal }) => fetchServices({ signal }),
      staleTime: 5 * 60_000,
    }),

  /** 서비스 관리 목록 — 숨긴 것까지. admin 만 받는다 */
  admin: () =>
    queryOptions({
      queryKey: serviceKeys.admin,
      queryFn: ({ signal }) => adminServicesApi.list({ signal }),
    }),
}

export const preferenceQueries = {
  /** 내 즐겨찾기 · 최근 사용 · 관리 버튼 여부 (GET /me). 못 받으면 즐겨찾기는 브라우저 사본으로 */
  me: () =>
    queryOptions({
      queryKey: preferenceKey,
      queryFn: fetchPreferences,
      staleTime: 5 * 60_000,
    }),
}

/** 최근 사용에 보여줄 수 — 서버가 정하는 수와 다르면 다음에 받을 때 서버 값으로 맞춰진다 */
const RECENT_MAX = 4

/**
 * 서비스 링크를 눌렀다 — 최근 사용 맨 앞으로. 카드 · 줄 · 아이콘이 훅 없이 부르도록 캐시를 바로 고친다.
 * 서버에 닿지 못한 사람(내 정보를 못 받음)은 기록하지 않는다. 실패해도 이동은 막지 않는다
 */
export function markUsed(id: string) {
  const me = queryClient.getQueryData<HubMe>(preferenceKey)
  if (!me) return
  queryClient.setQueryData<HubMe>(preferenceKey, { ...me, recent: [id, ...me.recent.filter((x) => x !== id)].slice(0, RECENT_MAX) })
  meApi.markRecent(id).catch(() => queryClient.invalidateQueries({ queryKey: preferenceKey }))
}

export const useCreateService =() => useWrite((input: ServiceInput) => adminServicesApi.create(input), serviceKeys.list)
export const useUpdateService = () => useWrite(({ id, input }: { id: string; input: ServiceInput }) => adminServicesApi.update(id, input), serviceKeys.list)
export const useDeleteService = () => useWrite((id: string) => adminServicesApi.remove(id), serviceKeys.list)
export const useReorderServices = () => useWrite((ids: string[]) => adminServicesApi.reorder(ids), serviceKeys.list)
