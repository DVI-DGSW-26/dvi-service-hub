import { useEffect } from 'react'
import type { WidgetLayout } from './useWidgetLayout'

/** 편집 중 Ctrl(⌘) + Z 되돌리기 · Ctrl + Shift + Z · Ctrl + Y 다시 하기 — 글을 쓰는 칸 · 열린 창에서는 그쪽 몫으로 둔다 */
export function useUndoKeys(editing: boolean, layout: WidgetLayout) {
  useEffect(() => {
    if (!editing) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      const key = e.key.toLowerCase()
      if (!(e.ctrlKey || e.metaKey) || (key !== 'z' && key !== 'y')) return
      if (e.defaultPrevented || document.querySelector('dialog[open]') || el.closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      if (key === 'z' && !e.shiftKey) layout.undo()
      else layout.redo()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [editing, layout])
}
