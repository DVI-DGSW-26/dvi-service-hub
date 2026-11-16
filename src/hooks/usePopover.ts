import { useCallback, useRef, useState } from 'react'
import { useDismiss } from './useDismiss'

/** 버튼 + 펼침 패널 한 쌍. 바깥 클릭 · Esc 로 닫힌다. */
export function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)
  return { open, toggle: () => setOpen((o) => !o), close, ref }
}
