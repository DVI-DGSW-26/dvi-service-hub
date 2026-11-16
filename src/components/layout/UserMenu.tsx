import { ChevronDown, LogOut, Settings } from 'lucide-react'
import { hrefOf } from '../../hooks/useHashRoute'
import { LOGOUT_URL } from '../../lib/account'
import { usePopover } from '../../hooks/usePopover'
import { useI18n } from '../../i18n'
import type { Me } from '../../types/portal'
import { PopoverPanel } from '../ui/Popover'

const ITEM = 'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-subtle'

export function UserMenu({ me }: { me: Me }) {
  const { open, toggle, close, ref } = usePopover()
  const { t, f } = useI18n()

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={f(t.layout.user.menuButton, { name: me.name })}
        className="flex cursor-pointer items-center gap-2.5 rounded-xl py-1 pr-2 pl-1 transition-[background-color,scale] duration-150 hover:bg-subtle active:scale-[0.97]"
      >
        <span
          className="grid size-9 place-items-center rounded-full bg-accent-fill text-[15px] font-bold text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.3)]"
          aria-hidden="true"
        >
          {me.name.slice(0, 1)}
        </span>
        <span className="hidden text-left leading-tight md:block" aria-hidden="true">
          <span className="block text-sm font-semibold">{f(t.layout.user.name, { name: me.name })}</span>
          <span className="block max-w-36 truncate text-xs text-muted">{me.department || me.email}</span>
        </span>
        <ChevronDown className={`size-4 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <PopoverPanel label={t.layout.user.menu} className="w-64 p-1.5">
          <div className="px-3 py-2.5">
            <p className="text-sm font-bold">{me.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted">{me.email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          {/* 포털 안의 계정 설정 화면 — 비밀번호 · OTP · 패스키 변경은 거기서 통합 로그인 화면으로 보낸다 */}
          <a href={hrefOf('account')} onClick={close} className={ITEM}>
            <Settings className="size-4 text-muted" aria-hidden="true" />
            {t.layout.user.account}
          </a>
          {/* SSO 세션까지 끊는다 — 다른 사내 서비스도 함께 로그아웃된다. */}
          <a href={LOGOUT_URL} className={`${ITEM} font-semibold text-danger`}>
            <LogOut className="size-4" aria-hidden="true" />
            {t.layout.user.logout}
          </a>
        </PopoverPanel>
      )}
    </div>
  )
}
