import { RotateCw } from 'lucide-react'
import { useIsFetching, useQueryClient, type Query } from '@tanstack/react-query'
import { isApiError } from '@/shared/api'
import { useI18n } from '@/shared/i18n'

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

/**
 * 실패한 조회 — 연결이 끊기면 위젯이 한꺼번에 실패하므로, 다시 시도는 이 위젯만이 아니라 실패한 조회를 모두 다시 부른다.
 * 값이 null 인 것도 넣는다: 로그인 정보(fetchMe)는 실패하면 오류 대신 null 을 남긴다
 */
const failed = (q: Query) => q.state.status === 'error' || q.state.data === null

/** 불러오기 실패. 조회는 재직자(employee)만 되므로 403 이면 다시 시도하라고 하지 않고 이유를 알려 준다 (명세 1.2) */
export function LoadError({ error, message, className = 'justify-center py-6 text-center text-sm' }: { error?: unknown; message?: string; className?: string }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const retrying = useIsFetching({ predicate: failed }) > 0
  const forbidden = isApiError(error) && error.status === 403
  if (forbidden) return <p className={`text-muted ${className}`}>{t.common.loadForbidden}</p>
  // 문구와 버튼을 한 줄에 — 자리가 모자라면 버튼만 다음 줄로
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 text-muted ${className}`} role="status">
      <span className="min-w-0">{message ?? t.common.loadError}</span>
      <button
        type="button"
        onClick={() => void queryClient.refetchQueries({ type: 'active', predicate: failed })}
        disabled={retrying}
        className="inline-flex h-7 flex-none cursor-pointer items-center gap-1 rounded-full bg-subtle px-2.5 text-xs font-semibold text-fg ring-1 ring-line transition-[background-color,scale] hover:bg-raised active:scale-95 disabled:cursor-default disabled:opacity-60"
      >
        <RotateCw className={`size-3 ${retrying ? 'animate-spin' : ''}`} aria-hidden="true" />
        {retrying ? t.common.retrying : t.common.retry}
      </button>
    </div>
  )
}
