import { useState } from 'react'
import { fitImage, KEYS, readPref, writePref } from '@/shared/lib'
import { CENTER, MAX_ZOOM, type DecorPos } from '../lib/wallpaper'

export type DecorKind = 'wallpaper' | 'hero'
export type { DecorPos }

/** 긴 변 최대 px — 배경은 화면을 덮고, 인사 카드 그림은 카드를 덮는다 */
const MAX: Record<DecorKind, number> = { wallpaper: 1920, hero: 1200 }
const KEY: Record<DecorKind, string> = { wallpaper: KEYS.wallpaper, hero: KEYS.heroImage }
const POS_KEY: Record<DecorKind, string> = { wallpaper: KEYS.wallpaperPos, hero: KEYS.heroPos }

const clamp = (v: unknown, lo: number, hi: number, fallback: number) => (typeof v === 'number' && v >= lo && v <= hi ? v : fallback)

function loadPos(kind: DecorKind): DecorPos {
  try {
    const p = JSON.parse(readPref(POS_KEY[kind]) ?? 'null') as Partial<DecorPos> | null
    return { x: clamp(p?.x, 0, 100, 50), y: clamp(p?.y, 0, 100, 50), zoom: clamp(p?.zoom, 1, MAX_ZOOM, 1) }
  } catch {
    return CENTER
  }
}

/**
 * 홈 꾸미기 — 대시보드 배경 · 인사 카드 그림. 위젯 편집의 꾸미기 메뉴에서 바꾸고, 줄인 그림과 자리를 이 브라우저에 저장한다.
 * 위치 조정 중(adjusting)에는 그 그림의 pos 를 바꿔 보다가 완료하면 저장하고, 취소하면 저장해 둔 자리로 돌아간다
 */
export function useDecor() {
  const [images, setImages] = useState(() => ({ wallpaper: readPref(KEY.wallpaper), hero: readPref(KEY.hero) }))
  const [saved, setSaved] = useState(() => ({ wallpaper: loadPos('wallpaper'), hero: loadPos('hero') }))
  const [pos, setPos] = useState(saved)
  const [adjusting, setAdjusting] = useState<DecorKind | null>(null)

  const savePos = (kind: DecorKind, p: DecorPos) => {
    setSaved((s) => ({ ...s, [kind]: p }))
    setPos((s) => ({ ...s, [kind]: p }))
    writePref(POS_KEY[kind], p === CENTER ? null : JSON.stringify(p))
  }

  /** 그림을 바꾼다(null 이면 기본으로). 못 읽는 파일이면 throw, 저장 공간이 모자라면 이번 화면에만 두고 false. 새 그림은 가운데에서 위치 조정을 시작한다 */
  const set = async (kind: DecorKind, file: File | null) => {
    const url = file && (await fitImage(file, MAX[kind]))
    setImages((s) => ({ ...s, [kind]: url }))
    savePos(kind, CENTER)
    try {
      if (url) localStorage.setItem(KEY[kind], url)
      else localStorage.removeItem(KEY[kind])
      if (url) setAdjusting(kind)
      return true
    } catch {
      // 예전 그림이 남아 새로고침 때 되살아나지 않게
      try { localStorage.removeItem(KEY[kind]) } catch { /* 저장소를 못 쓰면 지울 것도 없다 */ }
      return false
    }
  }

  return {
    ...images,
    pos,
    adjusting,
    startAdjust: setAdjusting,
    /** 조정 중인 그림의 자리를 바꾼다(저장은 endAdjust) */
    movePos: (p: DecorPos) => adjusting && setPos((s) => ({ ...s, [adjusting]: p })),
    /** 위치 조정을 마친다 — keep 이면 지금 자리를 저장, 아니면 저장해 둔 자리로 */
    endAdjust: (keep: boolean) => {
      if (!adjusting) return
      setAdjusting(null)
      if (keep) savePos(adjusting, pos[adjusting])
      else setPos((s) => ({ ...s, [adjusting]: saved[adjusting] }))
    },
    set,
  }
}

export type Decor = ReturnType<typeof useDecor>
