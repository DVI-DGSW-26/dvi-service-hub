import type { LucideIcon } from 'lucide-react'

interface SegmentedProps<T extends string> {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; icon?: LucideIcon }[]
  className?: string
}

/** 여러 값 중 하나를 고르는 칸 (화면 모드, 전체/즐겨찾기 …) */
export function Segmented<T extends string>({ label, value, onChange, options, className = '' }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex gap-0.5 rounded-xl bg-subtle p-1 ring-1 ring-line ${className}`}>
      {options.map(({ value: v, label: l, icon: I }) => {
        const active = v === value
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-[background-color,color,box-shadow,scale] duration-200 active:scale-[0.97] ${
              active ? 'bg-raised text-fg shadow-[0_1px_3px_oklch(0_0_0/0.12)] ring-1 ring-line' : 'text-muted hover:text-fg'
            }`}
          >
            {I && <I className="size-4" aria-hidden="true" />}
            {l}
          </button>
        )
      })}
    </div>
  )
}
