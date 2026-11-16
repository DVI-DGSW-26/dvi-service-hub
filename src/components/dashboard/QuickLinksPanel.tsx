import { Zap } from 'lucide-react'
import { useState } from 'react'
import { quickLinks } from '../../data/quickLinks'
import { useI18n } from '../../i18n'
import { openApp } from '../../lib/openApp'
import { OrgChartModal } from '../info/OrgChartModal'
import { Icon } from '../ui/Icon'
import { Panel } from '../ui/Panel'

const isExternal = (url: string) => /^https?:/.test(url)
// 앱 스킴은 PC 앱 것만 안다 — 휴대폰에서 모르는 스킴을 부르면 Safari 가 오류 창을 띄우므로 웹으로만 연다
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

export function QuickLinksPanel({ className = '' }: { className?: string }) {
  const { t } = useI18n()
  const [org, setOrg] = useState(false)
  // 창은 처음 열 때 붙이고, 닫는 애니메이션을 위해 그 뒤로는 붙여 둔다
  const [orgMounted, setOrgMounted] = useState(false)

  return (
    <Panel title={t.home.quickLinks.title} icon={Zap} className={className}>
      <ul className="grid grid-cols-2 gap-2.5 fit:flex-1 fit:auto-rows-fr">
        {quickLinks.map((q) => (
          <li key={q.id}>
            <a
              href={q.url}
              {...(isExternal(q.url) ? { target: '_blank', rel: 'noreferrer' } : {})}
              {...(q.modal && { 'aria-haspopup': 'dialog' as const })}
              // 창으로 여는 바로가기(조직도)는 홈에서 바로, 앱이 있는 바로가기는 앱부터 — 새 탭 열기(가운데 · Ctrl 누르기)는 그대로 주소로 간다
              onClick={(e) => {
                if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
                if (q.modal === 'org') {
                  e.preventDefault()
                  setOrgMounted(true)
                  setOrg(true)
                } else if (q.appUrl && !isMobile) {
                  e.preventDefault()
                  openApp(q.appUrl, q.url)
                }
              }}
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
      {orgMounted && <OrgChartModal open={org} onClose={() => setOrg(false)} />}
    </Panel>
  )
}
