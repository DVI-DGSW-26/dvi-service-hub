import { Presentation } from 'lucide-react'
import type { NewsItem } from '@dvi/core/types'

/**
 * 소식 그림. 목록은 작은 그림(400px), 펼쳐 보기는 큰 그림(1920px · large).
 * 한쪽만 올 수 있어(명세 6.2) 없는 쪽은 다른 쪽으로 채운다. 둘 다 없으면 자리표시
 */
export function NewsThumb({ item, large = false, className = '' }: { item: NewsItem; large?: boolean; className?: string }) {
  const src = large ? (item.imageLarge ?? item.image) : (item.image ?? item.imageLarge)
  return src ? (
    <img src={src} alt="" loading="lazy" className={`bg-subtle object-cover ${className}`} />
  ) : (
    <div className={`grid place-items-center bg-accent-soft text-accent ring-1 ring-line ${className}`} aria-hidden="true">
      <Presentation className="size-9" strokeWidth={1.6} />
    </div>
  )
}
