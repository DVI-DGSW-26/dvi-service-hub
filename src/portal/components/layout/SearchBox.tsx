import { Search } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useI18n } from '../../i18n'

interface SearchBoxProps {
  value: string
  onChange: (q: string) => void
  /** '/' 키로 이 입력칸에 바로 들어간다 */
  hotkey?: boolean
  /** 화면낭독기용 이름 (기본: 업무시스템 검색) */
  label?: string
  placeholder?: string
  className?: string
}

export function SearchBox({
  value,
  onChange,
  hotkey = false,
  label,
  placeholder,
  className = '',
}: SearchBoxProps) {
  const { t } = useI18n()
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!hotkey) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key !== '/' || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
      e.preventDefault()
      ref.current?.focus()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [hotkey])

  return (
    <label className={`relative block ${className}`}>
      <span className="sr-only">{label ?? t.layout.search.label}</span>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t.layout.search.placeholder}
        className="w-full rounded-xl bg-subtle py-2.5 pr-10 pl-10 text-[15px] text-fg ring-1 ring-line outline-none transition-[box-shadow,background-color] duration-200 placeholder:text-muted focus:bg-raised focus:ring-2 focus:ring-accent"
      />
      {hotkey && !value && (
        <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md bg-raised px-1.5 text-xs text-muted ring-1 ring-line xl:block">
          /
        </kbd>
      )}
    </label>
  )
}
