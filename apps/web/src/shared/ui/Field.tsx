import type { ReactNode } from 'react'
import { useI18n } from '@/shared/i18n'

/** 입력칸 · 고르기 칸 공통 모양 (SearchBox 와 같은 결) */
export const controlClass =
  'w-full rounded-xl bg-subtle px-3.5 py-2.5 text-[15px] text-fg ring-1 ring-line outline-none transition-[box-shadow,background-color] duration-200 placeholder:text-muted focus:bg-raised focus:ring-2 focus:ring-accent aria-invalid:ring-2 aria-invalid:ring-danger'

interface FieldProps {
  label: string
  required?: boolean
  hint?: string
  /** 잘못 적었을 때 — 안내 문구 대신 빨갛게 보여준다 */
  error?: string
  /** 묶음(고르기 단추 등)은 label 대신 div 로 — 안의 컨트롤이 스스로 이름을 가진다 */
  group?: boolean
  className?: string
  children: ReactNode
}

/** 이름 + 입력칸 + 안내. 필수 칸은 이름 옆에 * */
export function Field({ label, required = false, hint, error, group = false, className = '', children }: FieldProps) {
  const { t } = useI18n()
  const Tag = group ? 'div' : 'label'
  return (
    <Tag className={`block ${className}`}>
      <span className="mb-1.5 flex items-center gap-1 text-sm font-semibold">
        {label}
        {required && (
          <span className="text-danger" title={t.compose.required}>
            *<span className="sr-only">{t.compose.required}</span>
          </span>
        )}
      </span>
      {children}
      {(error || hint) && <span className={`mt-1.5 block text-[13px] ${error ? 'font-semibold text-danger' : 'text-muted'}`}>{error ?? hint}</span>}
    </Tag>
  )
}
