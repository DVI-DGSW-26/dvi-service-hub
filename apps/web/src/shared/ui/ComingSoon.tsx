import { Clock } from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from '@/shared/i18n'

/**
 * 데이터를 줄 API 가 아직 없는 자리 — 예시 값을 진짜처럼 보여주지 않고 '준비 중' 으로 둔다.
 * 어떤 자리가 비어 있는지는 docs/adr/0001-unbacked-features-coming-soon.md 에 모았다.
 */
export function ComingSoon({ children, action }: { children: ReactNode; action?: ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-subtle px-5 py-8 text-center">
      <span className="grid size-11 place-items-center rounded-xl bg-fg/[0.06] text-muted" aria-hidden="true">
        <Clock className="size-5" />
      </span>
      <p className="text-[15px] font-semibold">{t.common.comingSoon}</p>
      <p className="max-w-sm text-sm/relaxed text-muted">{children}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
