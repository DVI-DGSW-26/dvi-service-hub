import { ArrowUpRight, Lock, Star } from 'lucide-react'
import type { AuthMode, Service } from '../lib/services'
import { markUsed } from '../api/queries'
import { useI18n } from '@/shared/i18n'
import { Badge, type BadgeTone } from '@/shared/ui'

const AUTH_TONE: Record<AuthMode, BadgeTone> = { sso: 'ok', separate: 'warn', none: 'accent' }

/** 개발 중이면 그 표시, 아니면 로그인 방식 — 카드 · 줄이 같이 쓴다 */
export function ServiceBadge({ service: s }: { service: Service }) {
  const { t } = useI18n()
  return s.inDevelopment ? <Badge tone="neutral">{t.systems.inDevelopment}</Badge> : <Badge tone={AUTH_TONE[s.auth]}>{t.systems.auth[s.auth]}</Badge>
}

const LOGO_SIZE = {
  sm: 'size-7 rounded-lg p-0.5 text-sm',
  md: 'size-11 rounded-xl p-1 text-[22px]',
  lg: 'size-12 rounded-xl p-1 text-[22px]',
  xl: 'size-14 rounded-2xl p-1.5 text-[28px]',
  // dense 카드 높이를 따라 — 낮으면 sm 만큼, 칸을 채워 커지면 lg 보다 조금 크게(카드가 container)
  fluid: 'size-[clamp(1.75rem,40cqh,3.5rem)] rounded-xl p-1 text-xl',
}

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
  /** detailed: 업무시스템 화면 — 분류, 주소, 로그인 방식, 보조 링크까지. dense: 넓은 화면 홈 — 작은 로고 · 이름 · 별 한 줄(설명은 마우스를 올리면) */
  variant?: 'compact' | 'detailed' | 'dense'
  /** 지금 계정에 권한이 없는 서비스 ('전체' 보기). 흐리게 두고 '권한 없음' 을 붙인다 — 막는 건 각 서비스가 한다 */
  locked?: boolean
}

/**
 * 카드 전체가 첫 번째 링크로 가는 큰 링크다 (::after 로 덮는다).
 * 별 · 보조 링크는 그 위(z-10)에 올려 따로 눌리게 한다 — 링크 안에 버튼을 넣지 않기 위해서다.
 * 누르는 순간 살짝 눌리고(active), 올리면 떠오른다(hover).
 */
export function ServiceCard({ service: s, favorite, onToggleFavorite, variant = 'compact', locked = false }: ServiceCardProps) {
  const { t, f } = useI18n()
  const primary = s.links[0]
  const detailed = variant === 'detailed'
  const dense = variant === 'dense'

  return (
    <li
      className={`group relative flex flex-col rounded-2xl ring-1 ring-line transition-[background-color,box-shadow,translate,scale] duration-200 hover:-translate-y-0.5 hover:bg-raised hover:shadow-[0_12px_28px_-14px_oklch(0_0_0/0.22)] hover:ring-fg/15 active:scale-[0.985] has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-accent ${
        detailed ? 'glass' : 'bg-subtle'
      } ${locked ? 'opacity-60 hover:opacity-100' : ''} ${variant === 'compact' ? '@container' : dense ? 'min-h-12 [container-type:size]' : ''}`}
      title={locked ? t.home.systems.lockedHint : dense ? s.description : undefined}
    >
      {/* 홈 카드가 좁으면(위젯을 줄였을 때) 로고를 위로 올리고 별은 모서리로 — 이름 · 설명이 카드 폭을 다 쓴다 */}
      {/* dense 는 칸을 채워 높아지면(5.5rem 넘게) 넓은 여백 · 큰 이름 · 설명 두 줄 */}
      <div className={dense ? 'flex h-full items-center gap-2.5 p-2 [@container(min-height:5.5rem)]:gap-3.5 [@container(min-height:5.5rem)]:p-4' : `flex items-start gap-3 p-4 ${detailed ? '' : 'max-sm:p-3 fit:p-3 tall:p-4 @max-[14rem]:flex-col @max-[14rem]:items-stretch @max-[14rem]:gap-2'}`}>
        <ServiceLogo service={s} size={detailed ? 'lg' : dense ? 'fluid' : 'md'} />
        <div className="min-w-0 flex-1">
          {/* 홈 카드는 이름 줄을 한 줄로(이름이 길면 …) — 개발 중 표시가 내려가 그 카드만 커지지 않게. 위젯 페이지의 카드 크기는 모두 같다 */}
          <div className={`flex items-center gap-x-2 gap-y-1 ${detailed ? 'flex-wrap' : ''}`}>
            <h3 className={`min-w-0 ${dense ? 'text-sm [@container(min-height:5.5rem)]:text-base' : 'text-base'} font-bold break-keep ${detailed ? '' : 'truncate'}`}>
              <a
                href={primary.url}
                onClick={() => markUsed(s.id)}
                target="_blank"
                rel="noreferrer"
                className="outline-none after:absolute after:inset-0 after:rounded-2xl after:content-['']"
              >
                {s.name}
                <span className="sr-only"> {t.common.newTab}</span>
              </a>
            </h3>
            {dense ? null : detailed ? (
              <span className="flex-none rounded-md bg-subtle px-1.5 py-px text-xs text-muted ring-1 ring-line">{t.systems.category[s.category]}</span>
            ) : locked ? (
              <Badge tone="neutral">
                <Lock className="mr-1 size-3" aria-hidden="true" />
                {t.home.systems.locked}
              </Badge>
            ) : (
              s.inDevelopment && <Badge tone="neutral">{t.systems.inDevelopment}</Badge>
            )}
          </div>
          <p className={`mt-1 text-sm/normal text-muted ${dense ? 'line-clamp-2 [@container(max-height:5.5rem)]:hidden' : detailed ? '' : 'line-clamp-2 max-sm:line-clamp-1 fit:line-clamp-1 tall:line-clamp-2'}`}>{s.description}</p>
          {detailed && <p className="mt-1.5 text-xs text-muted">{new URL(primary.url).host}</p>}
        </div>
        <div className={`relative z-10 flex flex-none flex-col items-center ${dense ? '-my-1 -mr-1' : '-mt-1.5 -mr-2 @max-[14rem]:absolute @max-[14rem]:top-2 @max-[14rem]:right-2 @max-[14rem]:m-0'}`}>
          {/* 즐겨찾기는 권한 있는 서비스에서만 모은다 — 권한 없는 카드에는 숨긴다 */}
          <button
            type="button"
            hidden={locked}
            onClick={() => onToggleFavorite(s.id)}
            aria-pressed={favorite}
            aria-label={favorite ? f(t.systems.favorite.removeNamed, { name: s.name }) : f(t.systems.favorite.addNamed, { name: s.name })}
            title={favorite ? t.systems.favorite.remove : t.systems.favorite.add}
            className={`grid ${dense ? 'size-8' : 'size-9'} cursor-pointer place-items-center rounded-xl text-muted transition-[background-color,color,scale] duration-150 hover:bg-subtle hover:text-amber active:scale-90`}
          >
            <Star className={`size-[18px] ${favorite ? 'fill-amber text-amber' : ''}`} aria-hidden="true" />
          </button>
          {!dense && (
            <ArrowUpRight
              className="pointer-events-none size-4 text-muted opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent group-hover:opacity-100"
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {/* 높은 화면의 홈 카드 — 늘어난 아래쪽에 로그인 방식을 붙인다 */}
      {variant === 'compact' && (
        <div className="mt-auto hidden px-4 pb-4 tall:block">
          <ServiceBadge service={s} />
        </div>
      )}

      {detailed && (
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line px-4 py-3 text-[13px]">
          <ServiceBadge service={s} />
          {s.links.length > 1 && (
            <div className="relative z-10 flex gap-3">
              {s.links.map((l) => (
                <a key={l.url} className="font-semibold text-accent hover:underline" href={l.url} target="_blank" rel="noreferrer" onClick={() => markUsed(s.id)}>
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
