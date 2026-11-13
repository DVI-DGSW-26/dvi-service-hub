/** 목록이 오기 전 자리를 잡아 두는 막대. 화면이 덜컹이지 않게 실제 높이와 맞춘다. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-fg/[0.07] ${className}`} aria-hidden="true" />
}

/** 글줄 안에 들어가는 자리표시 (제목 · 숫자). 문단 안에도 넣을 수 있게 span 이다. */
export function SkeletonText({ className = '' }: { className?: string }) {
  return <span className={`inline-block animate-pulse rounded-md bg-fg/[0.07] align-middle ${className}`} aria-hidden="true" />
}

export function SkeletonList({ rows, className = 'h-12' }: { rows: number; className?: string }) {
  return (
    <div className="space-y-2.5" role="status" aria-label="불러오는 중">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  )
}

export function LoadError() {
  return <p className="py-6 text-center text-sm text-muted">정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
}
