import { ArrowUpRight, Star } from 'lucide-react'
import type { AuthMode, Service } from '../../../services'
import { Badge, type BadgeTone } from '../ui/Badge'

export const AUTH: Record<AuthMode, { label: string; tone: BadgeTone }> = {
  sso: { label: '회사 계정', tone: 'ok' },
  separate: { label: '개별 로그인', tone: 'warn' },
  none: { label: '로그인 없음', tone: 'accent' },
}

const LOGO_SIZE = { sm: 'size-7 rounded-lg p-0.5 text-sm', md: 'size-11 rounded-xl p-1 text-[22px]', lg: 'size-12 rounded-xl p-1 text-[22px]' }

export function ServiceLogo({ service: s, size = 'md' }: { service: Service; size?: keyof typeof LOGO_SIZE }) {
  const box = LOGO_SIZE[size]
  return s.logo ? (
    <img
      className={`${box} flex-none bg-white object-contain shadow-[0_2px_6px_oklch(0_0_0/0.1)] ring-1 ring-black/5`}
      src={s.logo}
      alt=""
      width={48}
      height={48}
    />
  ) : (
    <span className={`${box} grid flex-none place-items-center bg-white shadow-[0_2px_6px_oklch(0_0_0/0.1)] ring-1 ring-black/5`} aria-hidden="true">
      {s.emoji}
    </span>
  )
}

interface ServiceCardProps {
  service: Service
  favorite: boolean
  onToggleFavorite: (id: string) => void
  /** detailed: 업무시스템 화면 — 분류, 주소, 로그인 방식, 보조 링크까지 */
  variant?: 'compact' | 'detailed'
}

/**
 * 카드 전체가 첫 번째 링크로 가는 큰 링크다 (::after 로 덮는다).
 * 별 · 보조 링크는 그 위(z-10)에 올려 따로 눌리게 한다 — 링크 안에 버튼을 넣지 않기 위해서다.
 * 누르는 순간 살짝 눌리고(active), 올리면 떠오른다(hover).
 */
export function ServiceCard({ service: s, favorite, onToggleFavorite, variant = 'compact' }: ServiceCardProps) {
  const primary = s.links[0]
  const detailed = variant === 'detailed'

  return (
    <li
      className={`group relative flex flex-col rounded-2xl ring-1 ring-line transition-[background-color,box-shadow,translate,scale] duration-200 hover:-translate-y-0.5 hover:bg-raised hover:shadow-[0_12px_28px_-14px_oklch(0_0_0/0.22)] hover:ring-fg/15 active:scale-[0.985] has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-accent ${
        detailed ? 'glass' : 'bg-subtle'
      }`}
    >
      <div className={`flex items-start gap-3 p-4 ${detailed ? '' : 'fit:p-3 tall:p-4'}`}>
        <ServiceLogo service={s} size={detailed ? 'lg' : 'md'} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="min-w-0 text-base font-bold break-keep">
              <a
                href={primary.url}
                target="_blank"
                rel="noreferrer"
                className="outline-none after:absolute after:inset-0 after:rounded-2xl after:content-['']"
              >
                {s.name}
                <span className="sr-only"> (새 탭에서 열림)</span>
              </a>
            </h3>
            {detailed ? (
              <span className="flex-none rounded-md bg-subtle px-1.5 py-px text-xs text-muted ring-1 ring-line">{s.category}</span>
            ) : (
              s.inDevelopment && <Badge tone="neutral">개발 중</Badge>
            )}
          </div>
          <p className={`mt-1 text-sm/normal text-muted ${detailed ? '' : 'line-clamp-2 fit:line-clamp-1 tall:line-clamp-2'}`}>{s.description}</p>
          {detailed && <p className="mt-1.5 text-xs text-muted/80">{new URL(primary.url).host}</p>}
        </div>
        <div className="relative z-10 -mt-1.5 -mr-2 flex flex-none flex-col items-center">
          <button
            type="button"
            onClick={() => onToggleFavorite(s.id)}
            aria-pressed={favorite}
            aria-label={favorite ? `${s.name} 즐겨찾기 해제` : `${s.name} 즐겨찾기`}
            title={favorite ? '즐겨찾기 해제' : '즐겨찾기'}
            className="grid size-9 cursor-pointer place-items-center rounded-xl text-muted transition-[background-color,color,scale] duration-150 hover:bg-subtle hover:text-amber active:scale-90"
          >
            <Star className={`size-[18px] ${favorite ? 'fill-amber text-amber' : ''}`} aria-hidden="true" />
          </button>
          <ArrowUpRight
            className="pointer-events-none size-4 text-muted opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent group-hover:opacity-100"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* 높은 화면의 홈 카드 — 늘어난 아래쪽에 로그인 방식을 붙인다 */}
      {!detailed && (
        <div className="mt-auto hidden px-4 pb-4 tall:block">
          {s.inDevelopment ? <Badge tone="neutral">개발 중</Badge> : <Badge tone={AUTH[s.auth].tone}>{AUTH[s.auth].label}</Badge>}
        </div>
      )}

      {detailed && (
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line px-4 py-3 text-[13px]">
          {s.inDevelopment ? <Badge tone="neutral">개발 중</Badge> : <Badge tone={AUTH[s.auth].tone}>{AUTH[s.auth].label}</Badge>}
          {s.links.length > 1 && (
            <div className="relative z-10 flex gap-3">
              {s.links.map((l) => (
                <a key={l.url} className="font-semibold text-accent hover:underline" href={l.url} target="_blank" rel="noreferrer">
                  {l.label} ↗
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  )
}
