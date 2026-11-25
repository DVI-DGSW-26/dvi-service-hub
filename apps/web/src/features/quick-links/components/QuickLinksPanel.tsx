import { ChevronRight, Zap } from 'lucide-react'
import { Suspense, useState, type MouseEvent } from 'react'
import { quickLinks } from '../lib/quickLinks'
import { isMini, type StackSize } from '@/shared/widget'
import type { QuickLink } from '@/shared/types'
import { useI18n } from '@/shared/i18n'
import { appUrlOf, openLink, savedChoice } from '../lib/openApp'
import { OpenWithModal } from './OpenWithModal'
import { Icon, Panel, SmallPanel } from '@/shared/ui'
import { useClipRows, useLazyModal } from '@/shared/hooks'
import { LazyOrgChartModal as OrgChartModal } from '@/features/info'


const isExternal = (url: string) => /^https?:/.test(url)

export function QuickLinksPanel({ size, className = '' }: { size?: StackSize; className?: string }) {
  const { t } = useI18n()
  const org = useLazyModal()
  const ask = useLazyModal()
  const [asking, setAsking] = useState<QuickLink>()
  const rows = useClipRows<HTMLUListElement>(!!size)

  const linkProps = (q: QuickLink) => ({
    href: q.url,
    ...(isExternal(q.url) ? { target: '_blank', rel: 'noreferrer' } : {}),
    ...(q.modal && { 'aria-haspopup': 'dialog' as const }),
    // 창으로 여는 바로가기(조직도)는 홈에서 바로, 이 기기에 앱이 있는 바로가기는 앱부터(ask 면 먼저 묻기)
    // — 새 탭 열기(가운데 · Ctrl 누르기)는 그대로 웹 주소로 간다
    onClick: (e: MouseEvent) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
      if (q.modal === 'org') {
        e.preventDefault()
        org.show()
      } else if (appUrlOf(q)) {
        e.preventDefault()
        const how = q.ask ? savedChoice(q.id) : 'app'
        if (how) openLink(q, how)
        else {
          setAsking(q)
          ask.show()
        }
      }
    },
  })
  const modal = (
    <>
      {org.mounted && (
        <Suspense>
          <OrgChartModal key={org.key} open={org.open} onClose={org.close} />
        </Suspense>
      )}
      {asking && <OpenWithModal key={ask.key} link={asking} open={ask.open} onClose={ask.close} />}
    </>
  )

  // 아주 작은 칸 — 제목 없이 아이콘만: 1×1 하나, 1×2 둘(세로), 4×1 넷(가로). 이름은 화면낭독 · 마우스 올리기로
  if (isMini(size)) {
    return (
      <section aria-label={t.home.quickLinks.title} className={`glass flex rounded-3xl p-2 ${className}`}>
        <ul className={`grid min-h-0 flex-1 gap-2 ${size === '4x1' ? 'grid-cols-4' : 'auto-rows-fr'}`}>
          {quickLinks.slice(0, size === '1x1' ? 1 : size === '1x2' ? 2 : 4).map((q) => (
            <li key={q.id} className="min-w-0">
              <a
                {...linkProps(q)}
                aria-label={q.title}
                title={q.title}
                className="grid h-full place-items-center rounded-2xl bg-accent-soft text-accent ring-1 ring-line transition-[background-color,color,scale] duration-200 hover:bg-accent-fill hover:text-white active:scale-95"
              >
                <Icon name={q.icon} className="size-6" strokeWidth={2} />
              </a>
            </li>
          ))}
        </ul>
        {modal}
      </section>
    )
  }

  // 넓게(4×2) — 아이콘 넷을 한 줄로, 아래에 짧은 이름
  if (size === 'w') {
    return (
      <SmallPanel title={t.home.quickLinks.title} icon={Zap} className={className}>
        <ul className="grid min-h-0 flex-1 grid-cols-4 gap-2">
          {quickLinks.map((q) => (
            <li key={q.id} className="min-w-0">
              <a
                {...linkProps(q)}
                className="group flex h-full flex-col items-center justify-center gap-1.5 rounded-2xl transition-[scale] duration-200 active:scale-95"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent ring-1 ring-line transition-colors group-hover:bg-accent-fill group-hover:text-white">
                  <Icon name={q.icon} className="size-6" strokeWidth={2} />
                </span>
                <span className="max-w-full truncate text-xs font-semibold">{q.title}</span>
              </a>
            </li>
          ))}
        </ul>
        {modal}
      </SmallPanel>
    )
  }

  // 작게 — 아이콘 2 × 2 만. 이름은 화면낭독 · 마우스 올리기로
  if (size === 's') {
    return (
      <SmallPanel title={t.home.quickLinks.title} icon={Zap} className={className}>
        <ul className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2">
          {quickLinks.map((q) => (
            <li key={q.id}>
              <a
                {...linkProps(q)}
                aria-label={q.title}
                title={q.title}
                className="grid h-full place-items-center rounded-2xl bg-accent-soft text-accent ring-1 ring-line transition-[background-color,color,scale] duration-200 hover:bg-accent-fill hover:text-white active:scale-95"
              >
                <Icon name={q.icon} className="size-6" strokeWidth={2} />
              </a>
            </li>
          ))}
        </ul>
        {modal}
      </SmallPanel>
    )
  }

  // 크게 — 한 줄에 하나씩, 아이콘 옆에 이름 · 설명을 넓게. 보통(좁은 화면 4×3)은 두 줄 두 칸, 아이콘 옆에 이름
  // 두 칸인데 목록 폭이 좁으면(380px 아래) 이름이 몇 글자로 잘리므로 아이콘만 — 이름은 화면낭독 · 마우스 올리기로
  const wide = size === 'l'
  return (
    <Panel title={t.home.quickLinks.title} icon={Zap} className={className}>
      <ul ref={rows} className={`@container grid fit:flex-1 fit:auto-rows-fr ${wide ? 'grid-cols-1 gap-1.5' : 'grid-cols-2 gap-2.5'} ${size ? 'min-h-0 flex-1 overflow-hidden' : ''}`}>
        {quickLinks.map((q) => (
          <li key={q.id}>
            <a
              {...linkProps(q)}
              title={q.title}
              className={`group flex h-full items-center gap-3 rounded-2xl bg-subtle p-3 ${wide ? 'py-2.5' : `@max-[380px]:justify-center ${size ? '' : 'max-sm:flex-col max-sm:items-start max-sm:gap-2.5'}`} tall:flex-col tall:items-start tall:justify-between tall:p-4 ring-1 ring-line transition-[background-color,box-shadow,scale] duration-200 hover:bg-raised hover:ring-fg/15 active:scale-[0.97]`}
            >
              <span className="grid size-10 flex-none place-items-center rounded-xl tall:size-12 bg-accent-soft text-accent transition-colors group-hover:bg-accent-fill group-hover:text-white">
                <Icon name={q.icon} className="size-5" strokeWidth={2} />
              </span>
              <span className={`min-w-0 max-w-full ${wide ? '' : '@max-[380px]:sr-only'}`}>
                <span className="block truncate text-[15px] font-bold tall:text-base">{q.title}</span>
                <span className="mt-1 block truncate text-[13px] text-muted">{q.description}</span>
              </span>
              {wide && <ChevronRight className="ml-auto size-5 flex-none text-muted" aria-hidden="true" />}
            </a>
          </li>
        ))}
      </ul>
      {modal}
    </Panel>
  )
}
