import { ArrowUpRight, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from '@/shared/i18n'
import { services } from '../lib/services'
import { Badge, type BadgeTone } from '@/shared/ui'
import { ServiceLogo } from './ServiceCard'
import type { WidgetSize } from '@/features/home'

/** 설비 · 라인 상태 — 글자는 사전(widgets.state)에서 */
export type UnitState = 'run' | 'idle' | 'alarm' | 'off'

/**
 * 서비스 위젯이 보여주는 모양. 서비스마다 화면을 따로 만들지 않고 이 몇 가지에 데이터만 바꿔 넣는다.
 * 크기가 작으면 같은 모양에서 덜 보여준다 (iOS 위젯처럼).
 */
export type WidgetView =
  | { kind: 'list'; rows: { title: string; sub?: string; meta?: string; badge?: [BadgeTone, string] }[] }
  | { kind: 'stats'; tiles: { label: string; value: string; unit?: string; delta?: [BadgeTone, string] }[]; trend?: number[] }
  | { kind: 'chart'; label: string; value: string; delta?: [BadgeTone, string]; series: number[]; labels?: string[]; bars?: boolean }
  | { kind: 'monitor'; units: { name: string; state: UnitState; value?: string; load?: number }[] }
  | { kind: 'actions'; lead: string; actions: string[] }
  | { kind: 'namecard'; name: string; role: string; team: string; phone: string; email: string }
  | { kind: 'search'; placeholder: string; recent: string[] }

const STATE_TONE: Record<UnitState, BadgeTone> = { run: 'ok', idle: 'warn', alarm: 'danger', off: 'neutral' }
const STATE_DOT: Record<UnitState, string> = { run: 'bg-ok', idle: 'bg-warn', alarm: 'bg-danger', off: 'bg-muted' }
/** 크기별로 보여줄 줄 수 */
const ROWS: Record<WidgetSize, number> = { s: 4, m: 4, l: 9, xl: 9 }

/** 서비스 위젯의 겉틀 — 로고 · 제목 · 서비스 이름, 오른쪽 위에 그 서비스로 가는 단추 */
export function ServiceWidget({ app, title, size, view }: { app: string; title: string; size: WidgetSize; view: WidgetView }) {
  const { t, f } = useI18n()
  const service = services.find((s) => s.id === app)!
  const url = service.links[0].url

  return (
    <section aria-label={title} className="glass flex h-full min-h-0 flex-col overflow-hidden rounded-3xl p-4 sm:p-5">
      <header className="mb-3 flex flex-none items-center gap-2.5">
        <ServiceLogo service={service} size="sm" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-bold tracking-[-0.01em]">{title}</h2>
          <p className="truncate text-xs text-muted">{service.name}</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label={f(t.widgets.open, { name: service.name })}
          className="grid size-8 flex-none place-items-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-accent"
        >
          <ArrowUpRight className="size-[18px]" aria-hidden="true" />
        </a>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <Body view={view} size={size} url={url} />
      </div>
    </section>
  )
}

function Body({ view, size, url }: { view: WidgetView; size: WidgetSize; url: string }) {
  const { t } = useI18n()
  const big = size === 'l' || size === 'xl'

  switch (view.kind) {
    case 'list': {
      const rows = view.rows.slice(0, ROWS[size])
      return (
        <ul className={`grid min-h-0 gap-x-4 ${size === 'xl' ? 'grid-cols-2' : ''}`}>
          {rows.map((r, i) => (
            <li key={i} className="flex min-w-0 items-center gap-3 border-b border-line py-2 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{r.title}</p>
                {r.sub && size !== 's' && <p className="truncate text-[13px] text-muted">{r.sub}</p>}
              </div>
              {r.meta && size !== 's' && <span className="flex-none text-[13px] text-muted tabular-nums">{r.meta}</span>}
              {r.badge && <Badge tone={r.badge[0]}>{r.badge[1]}</Badge>}
            </li>
          ))}
        </ul>
      )
    }

    case 'stats': {
      const tiles = view.tiles.slice(0, size === 's' ? 2 : 4)
      return (
        <>
          <div className={`grid gap-2.5 ${size === 's' ? 'grid-cols-1' : size === 'xl' ? 'grid-cols-4' : 'grid-cols-2'}`}>
            {tiles.map((tile) => (
              <div key={tile.label} className="min-w-0 rounded-2xl bg-subtle px-3.5 py-3 ring-1 ring-line">
                <p className="truncate text-[13px] text-muted">{tile.label}</p>
                <p className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tracking-[-0.02em] tabular-nums">{tile.value}</span>
                  {tile.unit && <span className="text-[13px] text-muted">{tile.unit}</span>}
                  {tile.delta && size !== 's' && (
                    <span className="ml-auto">
                      <Badge tone={tile.delta[0]}>{tile.delta[1]}</Badge>
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
          {big && view.trend && <Chart series={view.trend} className="mt-3 min-h-24 flex-1" />}
        </>
      )
    }

    case 'chart':
      return (
        <>
          <p className="text-[13px] text-muted">{view.label}</p>
          <p className="flex items-baseline gap-2">
            <span className="text-[28px] font-bold tracking-[-0.02em] tabular-nums">{view.value}</span>
            {view.delta && <Badge tone={view.delta[0]}>{view.delta[1]}</Badge>}
          </p>
          <Chart series={view.series} bars={view.bars} className="mt-2 min-h-20 flex-1" />
          {big && view.labels && (
            <div className="mt-1.5 flex justify-between text-xs text-muted tabular-nums">
              {view.labels.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </div>
          )}
        </>
      )

    case 'monitor': {
      if (size === 's') {
        // 작은 칸은 상태별 대수만
        const count = (s: UnitState) => view.units.filter((u) => u.state === s).length
        return (
          <div className="grid flex-1 grid-cols-2 gap-2">
            {(['run', 'idle', 'alarm', 'off'] as const).map((s) => (
              <div key={s} className="flex flex-col justify-center rounded-2xl bg-subtle px-3 ring-1 ring-line">
                <span className="flex items-center gap-1.5 text-[13px] text-muted">
                  <span className={`size-2 rounded-full ${STATE_DOT[s]}`} aria-hidden="true" />
                  {t.widgets.state[s]}
                </span>
                <span className="text-2xl font-bold tabular-nums">{count(s)}</span>
              </div>
            ))}
          </div>
        )
      }
      // 칸 높이(최소 크기 기준)에 들어가는 줄 수만큼만 — 넘치면 아래가 잘린다. 나머지는 서비스에서 본다
      const cols = size === 'xl' ? 4 : size === 'l' ? 2 : 3
      return (
        <ul className={`grid min-h-0 gap-2 ${size === 'xl' ? 'grid-cols-4' : size === 'l' ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {view.units.slice(0, cols * (size === 'm' ? 1 : 4)).map((u) => (
            <li key={u.name} className="min-w-0 rounded-2xl bg-subtle px-3 py-2.5 ring-1 ring-line">
              <div className="flex items-center gap-2">
                <span className={`size-2 flex-none rounded-full ${STATE_DOT[u.state]} ${u.state === 'alarm' ? 'animate-pulse' : ''}`} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{u.name}</span>
                <Badge tone={STATE_TONE[u.state]}>{t.widgets.state[u.state]}</Badge>
              </div>
              {u.value && <p className="mt-1 truncate text-[13px] text-muted tabular-nums">{u.value}</p>}
              {u.load != null && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line" role="meter" aria-valuenow={u.load} aria-valuemin={0} aria-valuemax={100} aria-label={u.name}>
                  <div className={`h-full rounded-full ${u.state === 'alarm' ? 'bg-danger' : 'bg-accent-fill'}`} style={{ width: `${u.load}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )
    }

    case 'actions':
      return (
        <>
          <p className={`text-sm/relaxed text-muted ${size === 's' ? 'line-clamp-2' : ''}`}>{view.lead}</p>
          <div className={`mt-auto grid gap-2 pt-3 ${size === 's' ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {view.actions.slice(0, size === 's' ? 2 : 6).map((a, i) => (
              <ActionLink key={a} href={url} primary={i === 0}>
                {a}
              </ActionLink>
            ))}
          </div>
        </>
      )

    case 'namecard':
      return (
        <>
          <div className="hero flex flex-1 flex-col justify-center rounded-2xl px-4 py-3">
            <p className="text-xl font-bold tracking-[-0.02em]">{view.name}</p>
            <p className="text-[13px] font-semibold text-accent">
              {view.team} · {view.role}
            </p>
            {size !== 's' && (
              <p className="mt-2 text-[13px] text-muted tabular-nums">
                {view.phone}
                <br />
                {view.email}
              </p>
            )}
          </div>
          <div className="mt-3">
            <ActionLink href={url} primary>
              {t.widgets.editCard}
            </ActionLink>
          </div>
        </>
      )

    case 'search':
      return (
        // 그 서비스의 검색으로 새 탭에서 연다 — 서비스가 ?q= 를 받는다고 보고
        <form action={url} target="_blank" className="flex flex-1 flex-col">
          <label className="relative block">
            <span className="sr-only">{view.placeholder}</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              name="q"
              type="search"
              placeholder={view.placeholder}
              className="h-11 w-full rounded-xl bg-subtle pr-3 pl-9 text-[15px] ring-1 ring-line outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
            />
          </label>
          {size !== 's' && (
            <>
              <p className="mt-3 text-xs font-semibold text-muted">{t.widgets.recent}</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {view.recent.map((r) => (
                  <li key={r}>
                    <a
                      href={`${url}?q=${encodeURIComponent(r)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-full bg-subtle px-3 py-1 text-[13px] font-medium ring-1 ring-line hover:text-accent"
                    >
                      {r}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </form>
      )
  }
}

function ActionLink({ href, primary = false, children }: { href: string; primary?: boolean; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`flex min-h-10 items-center justify-center rounded-xl px-3 text-sm font-semibold transition-[background-color,scale] active:scale-[0.97] ${
        primary ? 'bg-accent-fill text-white' : 'bg-subtle ring-1 ring-line hover:bg-raised'
      }`}
    >
      <span className="truncate">{children}</span>
    </a>
  )
}

/** 칸을 가득 채우는 선 · 막대 그래프. 색은 강조색, 값은 0 부터가 아니라 가장 작은 값부터 */
function Chart({ series, bars = false, className = '' }: { series: number[]; bars?: boolean; className?: string }) {
  const max = Math.max(...series)
  const min = bars ? 0 : Math.min(...series)
  const y = (v: number) => 38 - ((v - min) / (max - min || 1)) * 34
  const x = (i: number) => (i / Math.max(1, series.length - 1)) * 100
  const line = series.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={`w-full text-accent ${className}`} aria-hidden="true">
      {bars ? (
        series.map((v, i) => {
          const w = 100 / series.length
          return <rect key={i} x={i * w + w * 0.18} width={w * 0.64} y={y(v)} height={40 - y(v)} rx={1} className="fill-current opacity-80" />
        })
      ) : (
        <>
          <polygon points={`0,40 ${line} 100,40`} className="fill-current opacity-12" />
          <polyline points={line} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </>
      )}
    </svg>
  )
}
