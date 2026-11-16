import { isApiError } from '../../api/errors'
import { useI18n } from '../../i18n'

/** 목록이 오기 전 자리를 잡아 두는 막대. 화면이 덜컹이지 않게 실제 높이와 맞춘다. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-fg/[0.07] ${className}`} aria-hidden="true" />
}

/** 글줄 안에 들어가는 자리표시 (제목 · 숫자). 문단 안에도 넣을 수 있게 span 이다. */
export function SkeletonText({ className = '' }: { className?: string }) {
  return <span className={`inline-block animate-pulse rounded-md bg-fg/[0.07] align-middle ${className}`} aria-hidden="true" />
}

export function SkeletonList({ rows, className = 'h-12' }: { rows: number; className?: string }) {
  const { t } = useI18n()
  return (
    <div className="space-y-2.5" role="status" aria-label={t.common.loading}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  )
}

/** 불러오기 실패. 조회는 재직자(employee)만 되므로 403 이면 다시 시도하라고 하지 않고 이유를 알려 준다 (명세 1.2) */
export function LoadError({ error, className = 'py-6 text-center text-sm' }: { error?: unknown; className?: string }) {
  const { t } = useI18n()
  const forbidden = isApiError(error) && error.status === 403
  return <p className={`text-muted ${className}`}>{forbidden ? t.common.loadForbidden : t.common.loadError}</p>
}
