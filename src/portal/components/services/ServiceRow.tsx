import { ArrowUpRight, Star } from 'lucide-react'
import type { Service } from '../../../services'
import { Badge } from '../ui/Badge'
import { AUTH, ServiceLogo } from './ServiceCard'

interface ServiceRowProps {
  service: Service
  favorite: boolean
  onToggleFavorite: (id: string) => void
}

/**
 * 업무시스템 리스트 보기의 한 줄. 카드와 같이 줄 전체가 첫 번째 링크로 가는 큰 링크이고,
 * 별 · 보조 링크는 그 위(z-10)에 올려 따로 눌린다.
 * 좁은 화면에서는 설명을 이름 아래로 내리고 주소 · 로그인 방식은 뺀다.
 */
export function ServiceRow({ service: s, favorite, onToggleFavorite }: ServiceRowProps) {
  const primary = s.links[0]

  return (
    <li className="group relative flex items-center gap-4 px-4 py-3.5 transition-colors duration-150 hover:bg-subtle has-[a:focus-visible]:bg-subtle sm:px-5">
      <ServiceLogo service={s} />

      <div className="min-w-0 flex-1 md:w-60 md:flex-none">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 truncate text-base font-bold">
            <a
              href={primary.url}
              target="_blank"
              rel="noreferrer"
              className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
            >
              {s.name}
              <span className="sr-only"> (새 탭에서 열림)</span>
            </a>
          </h3>
          <span className="flex-none rounded-md bg-subtle px-1.5 py-px text-xs text-muted ring-1 ring-line">{s.category}</span>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted md:hidden">{s.description}</p>
      </div>

      <div className="hidden min-w-0 flex-1 md:block">
        <p className="truncate text-sm">{s.description}</p>
        <p className="mt-0.5 truncate text-xs text-muted/80">{new URL(primary.url).host}</p>
      </div>

      <div className="hidden flex-none items-center gap-3 text-[13px] lg:flex">
        {s.links.length > 1 &&
          s.links.slice(1).map((l) => (
            <a key={l.url} className="relative z-10 font-semibold text-accent hover:underline" href={l.url} target="_blank" rel="noreferrer">
              {l.label} ↗
            </a>
          ))}
        <span className="w-[88px] text-right">
          {s.inDevelopment ? <Badge tone="neutral">개발 중</Badge> : <Badge tone={AUTH[s.auth].tone}>{AUTH[s.auth].label}</Badge>}
        </span>
      </div>

      <div className="relative z-10 flex flex-none items-center">
        <button
          type="button"
          onClick={() => onToggleFavorite(s.id)}
          aria-pressed={favorite}
          aria-label={favorite ? `${s.name} 즐겨찾기 해제` : `${s.name} 즐겨찾기`}
          title={favorite ? '즐겨찾기 해제' : '즐겨찾기'}
          className="grid size-10 cursor-pointer place-items-center rounded-xl text-muted transition-[background-color,color,scale] duration-150 hover:bg-raised hover:text-amber active:scale-90"
        >
          <Star className={`size-[18px] ${favorite ? 'fill-amber text-amber' : ''}`} aria-hidden="true" />
        </button>
      </div>
      <ArrowUpRight
        className="hidden size-4 flex-none text-muted transition-[translate,color] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent sm:block"
        aria-hidden="true"
      />
    </li>
  )
}
