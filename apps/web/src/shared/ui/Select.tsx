import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { controlClass } from './Field'
import { PickerPopover } from './PickerPopover'
import { moveOption } from './moveOption'

export interface SelectOption<T extends string> {
  value: T
  label: string
  /** 이름 앞 그림 (서비스 로고 등) */
  icon?: ReactNode
  /** 이름 아래 작은 글씨 */
  description?: string
}

interface SelectProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SelectOption<T>[]
  /** 화면낭독기용 이름 (Field 의 이름과 같게) */
  label: string
}

/**
 * 고르기 칸 — 브라우저 기본 <select> 대신 앱과 같은 유리 판에 로고 · 설명까지 보여주는 목록.
 * 위아래 화살표로 펼치고 옮기며, Enter · Space 로 고른다.
 */
export function Select<T extends string>({ value, onChange, options, label }: SelectProps<T>) {
  const anchor = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const current = options.find((o) => o.value === value)

  // 펼치면 고른 항목에 초점 — 목록이 길면 그 자리가 보이게
  useEffect(() => {
    if (!open) return
    const items = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('[role=option]') ?? [])]
    const target = items[Math.max(0, options.findIndex((o) => o.value === value))]
    target?.scrollIntoView({ block: 'nearest' })
    target?.focus({ preventScroll: true })
  }, [open, options, value])

  const pick = (v: T) => {
    onChange(v)
    setOpen(false)
    anchor.current?.focus()
  }

  return (
    <>
      <button
        ref={anchor}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
          e.preventDefault()
          setOpen(true)
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={current ? `${label}, ${current.label}` : label}
        className={`${controlClass} flex cursor-pointer items-center gap-2.5 text-left`}
      >
        {current?.icon}
        <span className="min-w-0 flex-1 truncate">{current?.label}</span>
        <ChevronDown className={`size-[18px] flex-none text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <PickerPopover open={open} anchor={anchor} onClose={close} label={label} matchWidth className="p-1.5">
        <div
          ref={listRef}
          role="listbox"
          aria-label={label}
          onKeyDown={(e) => moveOption(e, listRef.current)}
          className="max-h-72 overflow-y-auto overscroll-contain"
        >
          {options.map((o) => {
            const selected = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => pick(o.value)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors focus-visible:outline-offset-[-2px] ${
                  selected ? 'bg-accent-soft' : 'hover:bg-subtle'
                }`}
              >
                {o.icon}
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[15px] ${selected ? 'font-bold text-accent' : 'font-semibold'}`}>{o.label}</span>
                  {o.description && <span className="mt-0.5 block truncate text-[13px] text-muted">{o.description}</span>}
                </span>
                {selected && <Check className="size-4 flex-none text-accent" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </PickerPopover>
    </>
  )
}
