import type { ReactNode } from 'react'

export type BadgeTone = 'accent' | 'ok' | 'warn' | 'danger' | 'neutral' | 'solid-danger'

const TONE: Record<BadgeTone, string> = {
  accent: 'bg-accent-soft text-accent',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-line text-muted',
  'solid-danger': 'bg-danger text-white',
}

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex flex-none items-center rounded-md px-2 py-0.5 text-[13px] font-semibold whitespace-nowrap ${TONE[tone]}`}>
      {children}
    </span>
  )
}
