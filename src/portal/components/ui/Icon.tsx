import { BookOpen, CircleHelp, FileText, Folder, Gift, Headset, Network, type LucideProps } from 'lucide-react'
import type { ReactNode } from 'react'
import type { IconName } from '../../types/portal'

/** 플로우 로고 대신 쓰는 단순 표식 (외부 브랜드 로고는 들이지 않는다) */
function FlowMark(props: LucideProps) {
  const { size = 24, className } = props
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity=".18" />
      <path d="M7 12a5 5 0 0 1 10 0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M17 12a5 5 0 0 1-10 0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity=".55" />
    </svg>
  )
}

const ICONS = {
  flow: FlowMark,
  folder: Folder,
  org: Network,
  headset: Headset,
  file: FileText,
  book: BookOpen,
  gift: Gift,
  help: CircleHelp,
} satisfies Record<IconName, (p: LucideProps) => ReactNode>

export function Icon({ name, ...props }: { name: IconName } & LucideProps) {
  const C = ICONS[name]
  return <C aria-hidden="true" {...props} />
}
