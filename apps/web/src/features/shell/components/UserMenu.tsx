import { ChevronDown, Download, LogOut, Settings } from 'lucide-react'
import { useState } from 'react'
import { PHONE } from '@/shared/constants'
import { hrefOf, useMedia, usePopover } from '@/shared/hooks'
import { LogoutConfirm } from '@/features/account'
import { useI18n } from '@/shared/i18n'
import type { Me } from '@/shared/types'
import { PopoverPanel } from '@/shared/ui'

const ITEM = 'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-subtle'

export function UserMenu({ me }: { me: Me }) {
  const { open, toggle, close, ref } = usePopover()
  const { t, f } = useI18n()
  // 확인 시트는 메뉴 밖에 둔다 — 메뉴가 닫혀도(바깥 누르기) 시트는 남아야 한다
  const [confirm, setConfirm] = useState(false)
  // 앱 받기 — 휴대폰 브라우저에서만(앱 안에서는 이미 앱이고, APK 는 Android 만 깔린다). shortcut: iPhone 앱이 생기면 조건을 넓힌다
  const getApp = useMedia(PHONE) && !window.Capacitor && /Android/i.test(navigator.userAgent)

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
          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 부서가 빈 글자로 와도 메일을 보인다 */}
          <span className="block max-w-36 truncate text-xs text-muted">{me.department || me.email}</span>
        </span>
        <ChevronDown className={`size-4 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <PopoverPanel label={t.layout.user.menu} onClose={close} className="w-64 p-1.5">
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
          {getApp && (
            <a href="/app/" className={ITEM}>
              <Download className="size-4 text-muted" aria-hidden="true" />
              {t.release.download.pageTitle}
            </a>
          )}
          {/* SSO 세션까지 끊는다 — 다른 사내 서비스도 함께 로그아웃되니 한 번 더 묻는다 */}
          <button
            type="button"
            onClick={() => {
              close()
              setConfirm(true)
            }}
            aria-haspopup="dialog"
            className={`${ITEM} cursor-pointer font-semibold text-danger`}
          >
            <LogOut className="size-4" aria-hidden="true" />
            {t.layout.user.logout}
          </button>
        </PopoverPanel>
      )}
      <LogoutConfirm open={confirm} onClose={() => setConfirm(false)} />
    </div>
  )
}
