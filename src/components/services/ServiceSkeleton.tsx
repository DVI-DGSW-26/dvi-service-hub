import { Skeleton } from '../ui/Skeleton'

/**
 * 로그인 정보(권한)가 오기 전 업무시스템 자리. 실제 카드 · 줄과 같은 틀(여백 · 로고 크기 · 줄 수)로 그려
 * 목록이 도착해도 높이가 덜컹이지 않는다.
 */
export function ServiceCardSkeleton({ variant = 'compact' }: { variant?: 'compact' | 'detailed' }) {
  const detailed = variant === 'detailed'
  return (
    <li className={`flex flex-col rounded-2xl ring-1 ring-line ${detailed ? 'glass' : 'bg-subtle'}`} aria-hidden="true">
      <div className={`flex items-start gap-3 p-4 ${detailed ? '' : 'fit:p-3 tall:p-4'}`}>
        <Skeleton className={`flex-none ${detailed ? 'size-12' : 'size-11'}`} />
        <div className="min-w-0 flex-1 pt-0.5">
          <Skeleton className="h-5 w-1/2 rounded-md" />
          <Skeleton className="mt-2 h-4 rounded-md" />
          <Skeleton className={`mt-1.5 h-4 w-2/3 rounded-md ${detailed ? '' : 'fit:hidden tall:block'}`} />
          {detailed && <Skeleton className="mt-2 h-3 w-1/3 rounded-md" />}
        </div>
      </div>
      {!detailed && (
        <div className="mt-auto hidden px-4 pb-4 tall:block">
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      )}
      {detailed && (
        <div className="mt-auto border-t border-line px-4 py-3">
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>
      )}
    </li>
  )
}

export function ServiceRowSkeleton() {
  return (
    <li className="flex items-center gap-4 px-4 py-3.5 sm:px-5" aria-hidden="true">
      <Skeleton className="size-11 flex-none" />
      <div className="min-w-0 flex-1 md:w-60 md:flex-none">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="mt-1.5 h-4 w-48 max-w-full rounded-md md:hidden" />
      </div>
      <div className="hidden min-w-0 flex-1 md:block">
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="mt-1.5 h-3 w-1/3 rounded-md" />
      </div>
      <Skeleton className="hidden h-6 w-[88px] rounded-md lg:block" />
      <Skeleton className="size-10 flex-none" />
    </li>
  )
}
