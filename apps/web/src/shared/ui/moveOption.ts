import {      type KeyboardEvent } from 'react'

/**
 * 목록(role=option 단추들) 안에서 위아래 화살표 · Home · End 로 초점을 옮긴다. 고르기는 단추라 Enter · Space 로 된다.
 * 맨 끝에서 더 누르면 멈춘다 — 돌아가면 처음인지 끝인지 헷갈린다.
 */
export function moveOption(e: KeyboardEvent, list: HTMLElement | null) {
  const items = [...(list?.querySelectorAll<HTMLElement>('[role=option]') ?? [])]
  const i = items.indexOf(document.activeElement as HTMLElement)
  const next = ({ ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 } as Record<string, number>)[e.key]
  if (next === undefined) return
  e.preventDefault()
  items[Math.max(0, Math.min(items.length - 1, next))]?.focus()
}
