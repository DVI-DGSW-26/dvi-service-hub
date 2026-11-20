import { readPref } from '@/shared/lib'

/** 저장해 둔 JSON — 없거나 깨졌으면 null */
export const readJson = (key: string): unknown => {
  try {
    return JSON.parse(readPref(key) ?? 'null')
  } catch {
    return null
  }
}
