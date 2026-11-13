import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { portalApi } from '../../api/portal'
import { useAsync } from '../../hooks/useAsync'
import { usePopover } from '../../hooks/usePopover'
import { ICON_BUTTON, PopoverPanel } from '../ui/Popover'
import { Skeleton } from '../ui/Skeleton'

export function NotificationMenu() {
  const { data, loading } = useAsync(portalApi.notifications)
  const { open, toggle, ref } = usePopover()
  const [seen, setSeen] = useState(false)
  const unread = seen ? 0 : (data ?? []).filter((n) => !n.read).length

  // 목록을 실제로 펼쳐 본 뒤에만 읽음으로 — 오기 전에 눌렀다면 도착해 보일 때 읽음 처리한다
  useEffect(() => {
    if (open && data) setSeen(true)
  }, [open, data])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={unread ? `알림 ${unread}건 안 읽음` : '알림'}
        title="알림"
        className={ICON_BUTTON}
      >
        <Bell className="size-5" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute top-2 right-2 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white" aria-hidden="true">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <PopoverPanel label="알림" className="w-[min(340px,calc(100vw-24px))]">
          <p className="border-b border-line px-4 py-3 text-sm font-bold">알림</p>
          {loading ? (
            <div className="space-y-1 p-1.5" role="status" aria-label="알림 불러오는 중">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex gap-3 px-3 py-2.5">
                  <Skeleton className="mt-1.5 size-2 flex-none rounded-full" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 rounded-md" />
                    <Skeleton className="mt-1.5 h-3 w-16 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto p-1.5">
              {data?.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">새 알림이 없어요.</li>}
              {(data ?? []).map((n) => (
                <li key={n.id}>
                  <a href={n.url} target="_blank" rel="noreferrer" className="flex gap-3 rounded-xl px-3 py-2.5 hover:bg-subtle">
                    <span className={`mt-1.5 size-2 flex-none rounded-full ${n.read ? 'bg-fg/20' : 'bg-accent-fill'}`} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm/normal">{n.title}</span>
                      <span className="mt-0.5 block text-xs text-muted">{n.time}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </PopoverPanel>
      )}
    </div>
  )
}
