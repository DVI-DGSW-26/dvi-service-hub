import { LogOut } from 'lucide-react'
import { useId } from 'react'
import { useI18n } from '@/shared/i18n'
import { Modal } from '@/shared/ui'
import { LOGOUT_URL } from '../lib/account'

/**
 * 로그아웃 확인 — 휴대폰은 아래에서 올라오는 짧은 시트, 넓은 화면은 작은 창(Modal 의 compact).
 * SSO 세션까지 끊어 다른 사내 서비스도 함께 로그아웃되니, 메뉴에서 잘못 눌러도 한 번 더 묻는다
 */
export function LogoutConfirm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const titleId = useId()
  const c = t.account.logout.confirm
  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} compact>
      <div className="px-6 pt-8 pb-6 sm:pt-6">
        <span className="grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger" aria-hidden="true">
          <LogOut className="size-6" />
        </span>
        <h2 id={titleId} className="mt-4 text-xl font-bold tracking-[-0.015em]">
          {c.title}
        </h2>
        <p className="mt-1.5 text-[15px]/relaxed text-muted">{c.body}</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 cursor-pointer rounded-xl bg-subtle text-[15px] font-semibold ring-1 ring-line transition-[scale] active:scale-[0.98]"
          >
            {c.cancel}
          </button>
          <a
            href={LOGOUT_URL}
            className="flex min-h-12 items-center justify-center rounded-xl bg-danger-fill text-[15px] font-semibold text-white transition-[scale] active:scale-[0.98]"
          >
            {c.action}
          </a>
        </div>
      </div>
    </Modal>
  )
}
