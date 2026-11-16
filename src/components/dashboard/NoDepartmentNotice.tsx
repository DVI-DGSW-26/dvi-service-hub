import { Info } from 'lucide-react'
import { useI18n } from '../../i18n'

/** 부서 미지정 신규 입사자 안내. 빈 화면이나 403 은 본인에게 고장으로 보인다. */
export function NoDepartmentNotice({ className = '' }: { className?: string }) {
  const { t } = useI18n()
  return (
    <p className={`glass flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm ${className}`}>
      <Info className="size-4 flex-none text-accent" aria-hidden="true" />
      {t.home.noDepartment}
    </p>
  )
}
