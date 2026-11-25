import { AppWindow, Globe, type LucideIcon } from 'lucide-react'
import { useId, useState } from 'react'
import type { QuickLink } from '@/shared/types'
import { useI18n } from '@/shared/i18n'
import { Modal } from '@/shared/ui'
import { openLink, saveChoice, type OpenWith } from '../lib/openApp'

/** 바로가기를 웹 · 앱 중 어디로 열지 묻는다. '다시 묻지 않기'를 고르면 다음부터 그 답대로 바로 연다 */
export function OpenWithModal({ link, open, onClose }: { link: QuickLink; open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const c = t.home.quickLinks.openWith
  const titleId = useId()
  const [remember, setRemember] = useState(false)

  const choose = (how: OpenWith) => {
    if (remember) saveChoice(link.id, how)
    openLink(link, how)
    onClose()
  }
  const option = (how: OpenWith, Icon: LucideIcon, label: string, hint: string) => (
    <button
      type="button"
      onClick={() => choose(how)}
      className="group flex cursor-pointer flex-col items-center gap-3 rounded-2xl bg-subtle px-3 py-5 text-center ring-1 ring-line transition-[background-color,box-shadow,scale] duration-200 hover:bg-raised hover:ring-fg/15 active:scale-[0.98]"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent transition-colors group-hover:bg-accent-fill group-hover:text-white">
        <Icon className="size-6" strokeWidth={2} aria-hidden="true" />
      </span>
      <span>
        <span className="block text-[15px] font-bold">{label}</span>
        <span className="mt-1 block text-[13px] text-muted break-keep">{hint}</span>
      </span>
    </button>
  )

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} compact>
      <div className="p-6 pr-16 sm:p-8 sm:pr-20">
        <p className="text-[15px] font-semibold text-accent">{link.title}</p>
        <h2 id={titleId} className="mt-2 text-[22px]/[1.3] font-bold tracking-[-0.025em]">
          {c.title}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-2.5 px-6 sm:px-8">
        {option('app', AppWindow, c.app, c.appHint)}
        {option('web', Globe, c.web, c.webHint)}
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 px-6 pt-4 pb-6 text-sm font-semibold text-muted sm:px-8 sm:pb-8">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-5 flex-none cursor-pointer accent-[var(--color-accent-fill)]" />
        {c.dontAsk}
      </label>
    </Modal>
  )
}
