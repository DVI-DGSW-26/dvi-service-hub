import { useRef, type MouseEvent, type PointerEvent } from 'react'
import { EDIT_HOLD } from '../lib/constants'

/** 터치로 길게 누르면 편집 시작(마우스는 상단 바의 '홈 편집' 단추로). 손이 8px 넘게 움직이면 취소 */
export function useLongPress(editing: boolean, onEdit: () => void) {
  const press = useRef<{ timer: number; x: number; y: number } | null>(null)
  /** 길게 눌러 편집을 켰다 — 손을 뗄 때의 누르기(링크 열기 등)는 버린다 */
  const pressed = useRef(false)

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (editing || e.button !== 0 || e.pointerType !== 'touch') return
    press.current = {
      x: e.clientX,
      y: e.clientY,
      timer: window.setTimeout(() => {
        press.current = null
        pressed.current = true
        if ('vibrate' in navigator) navigator.vibrate(10) // iOS Safari 에는 없다
        onEdit()
      }, EDIT_HOLD),
    }
  }
  const cancelPress = () => {
    clearTimeout(press.current?.timer)
    press.current = null
  }
  const onPressMove = (e: PointerEvent<HTMLElement>) => {
    const p = press.current
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) cancelPress()
  }

  // 길게 눌러 편집을 시작했으면 손을 뗄 때의 누르기(링크 열기 등)는 버린다
  const onClickCapture = (e: MouseEvent) => {
    if (!pressed.current) return
    pressed.current = false
    e.preventDefault()
    e.stopPropagation()
  }

  return { press, onPointerDown, onPressMove, cancelPress, onClickCapture }
}

export type LongPress = ReturnType<typeof useLongPress>
