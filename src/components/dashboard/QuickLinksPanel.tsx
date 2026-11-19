import { Zap } from 'lucide-react'
import { Suspense, lazy, type MouseEvent } from 'react'
import { quickLinks } from '../../data/quickLinks'
import type { StackSize } from '../../lib/widgetLayout'
import type { QuickLink } from '../../types/portal'
import { useI18n } from '../../i18n'
import { openApp } from '../../lib/openApp'
import { Icon } from '../ui/Icon'
import { Panel, SmallPanel } from '../ui/Panel'
import { useLazyModal } from '../../hooks/useLazyModal'

// 눌러서 열 때 받는다 — 첫 화면 번들에서 뺀다
const OrgChartModal = lazy(() => import('../info/OrgChartModal').then((m) => ({ default: m.OrgChartModal })))

const isExternal = (url: string) => /^https?:/.test(url)
// 앱 스킴은 PC 앱 것만 안다 — 휴대폰에서 모르는 스킴을 부르면 Safari 가 오류 창을 띄우므로 웹으로만 연다
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

export function QuickLinksPanel({ size, className = '' }: { size?: StackSize; className?: string }) {
  const { t } = useI18n()
  const org = useLazyModal()

  const linkProps = (q: QuickLink) => ({
    href: q.url,
    ...(isExternal(q.url) ? { target: '_blank', rel: 'noreferrer' } : {}),
    ...(q.modal && { 'aria-haspopup': 'dialog' as const }),
    // 창으로 여는 바로가기(조직도)는 홈에서 바로, 앱이 있는 바로가기는 앱부터 — 새 탭 열기(가운데 · Ctrl 누르기)는 그대로 주소로 간다
    onClick: (e: MouseEvent) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
      if (q.modal === 'org') {
        e.preventDefault()
        org.show()
      } else if (q.appUrl && !isMobile) {
        e.preventDefault()
        openApp(q.appUrl, q.url)
      }
    },
  })
  const modal = org.mounted && (
    <Suspense>
      <OrgChartModal key={org.key} open={org.open} onClose={org.close} />
    </Suspense>
  )

  // 작게 — 아이콘 2 × 2 만. 이름은 화면낭독 · 마우스 올리기로
  if (size === 's') {
    return (
      <SmallPanel title={t.home.quickLinks.title} icon={Zap} className={className}>
        <ul className="grid flex-1 grid-cols-2 gap-2">
          {quickLinks.map((q) => (
            <li key={q.id}>
              <a
                {...linkProps(q)}
                aria-label={q.title}
                title={q.title}
                className="grid h-full min-h-14 place-items-center rounded-2xl bg-accent-soft text-accent ring-1 ring-line transition-[background-color,color,scale] duration-200 hover:bg-accent-fill hover:text-white active:scale-95"
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

  return (
    <Panel title={t.home.quickLinks.title} icon={Zap} className={className}>
      <ul className="grid grid-cols-2 gap-2.5 fit:flex-1 fit:auto-rows-fr">
        {quickLinks.map((q) => (
          <li key={q.id}>
            <a
              {...linkProps(q)}
              className="group flex h-full items-center gap-3 rounded-2xl bg-subtle p-3 max-sm:flex-col max-sm:items-start max-sm:gap-2.5 tall:flex-col tall:items-start tall:justify-between tall:p-4 ring-1 ring-line transition-[background-color,box-shadow,scale] duration-200 hover:bg-raised hover:ring-fg/15 active:scale-[0.97]"
            >
              <span className="grid size-10 flex-none place-items-center rounded-xl tall:size-12 bg-accent-soft text-accent transition-colors group-hover:bg-accent-fill group-hover:text-white">
                <Icon name={q.icon} className="size-5" strokeWidth={2} />
              </span>
              <span className="min-w-0 max-w-full">
                <span className="block truncate text-[15px] font-bold tall:text-base">{q.title}</span>
                <span className="mt-1 block truncate text-[13px] text-muted">{q.description}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      {modal}
    </Panel>
  )
}
