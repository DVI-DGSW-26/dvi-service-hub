import { useRef, type MouseEvent, type PointerEvent, type RefObject } from 'react'
import { EDIT_HOLD } from '../lib/constants'

/** 마우스로 길게 눌러 편집을 켠 위젯과 그 손 자리 — 편집이 켜진 판(WideBoard)이 손을 떼기 전에 그 자리에서 이어 끈다 */
export interface PickUp {
  i: string
  x: number
  y: number
}

/** 위젯을 길게 누르면(터치 · 마우스) 편집 시작. 손이 8px 넘게 움직이면 취소. 마우스면 그 위젯을 집어 든 채로(pickUpRef) */
export function useLongPress(editing: boolean, onEdit: () => void, pickUpRef?: RefObject<PickUp | null>) {
  const press = useRef<{ timer: number; x: number; y: number } | null>(null)
  /** 길게 눌러 편집을 켰다 — 손을 뗄 때의 누르기(링크 열기 등)는 버린다 */
  const pressed = useRef(false)

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    // 끌어 옮기고 놓으면 누르기(click)가 안 와 버리기 표시가 남는다 — 다음에 누를 때 푼다(StackBoard 와 같다)
    pressed.current = false
    if (editing || e.button !== 0) return
    const { pointerType, clientX: x, clientY: y } = e
    const i = e.currentTarget.dataset.type
    press.current = {
      x,
      y,
      timer: window.setTimeout(() => {
        press.current = null
        pressed.current = true
        if ('vibrate' in navigator) navigator.vibrate(10) // iOS Safari 에는 없다
        // 누르는 동안 브라우저가 시작한 글자 선택을 지운다 — 그대로 두면 이어 끄는 동안 선택이 번진다
        getSelection()?.removeAllRanges()
        if (pickUpRef && i && pointerType === 'mouse') pickUpRef.current = { i, x, y }
        onEdit()
      }, EDIT_HOLD),
    }
  }
  const cancelPress = () => {
    clearTimeout(press.current?.timer)
    press.current = null
    // 판이 이어 끌기 전에 손을 뗐으면 집어 들지 않는다 — 떼고 나서 누르면 버튼 없이도 위젯이 손을 따라온다
    if (pickUpRef) pickUpRef.current = null
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
