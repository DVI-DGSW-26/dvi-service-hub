import { Eye, EyeOff, GripVertical, LayoutDashboard, Lock, Search } from 'lucide-react'
import { Fragment, useState, type ReactNode } from 'react'
import { hrefOf, type Page } from '../../hooks/useHashRoute'
import type { PortalTheme } from '../../hooks/usePortalTheme'
import { useI18n } from '../../i18n'
import { KEYS, readPref, writePref } from '../../lib/theme'
import type { Me } from '../../types/portal'
import { ICON_BUTTON } from '../ui/Popover'
import { Skeleton } from '../ui/Skeleton'
import { SearchBox } from './SearchBox'
import { Brand } from './Sidebar'
import { ThemeMenu } from './ThemeMenu'
import { UserMenu } from './UserMenu'

interface TopBarProps {
  me: Me | null
  meLoading: boolean
  page: Page
  query: string
  onQueryChange: (q: string) => void
  theme: PortalTheme
  /** 홈에서만 — 위젯 편집을 연다 */
  onEditWidgets?: () => void
  /** 위젯 편집 중 — 상단 바 항목도 순서 · 보이기를 고치고, 끝에 '완료' */
  editing?: boolean
  onDone?: () => void
}

/** 고칠 수 있는 상단 바 항목. 사용자 메뉴는 로그아웃이 있어 숨길 수 없다 */
const ITEMS = ['search', 'theme', 'user'] as const
type Item = (typeof ITEMS)[number]
interface HeaderPrefs {
  order: Item[]
  hidden: Item[]
}

/** 저장된 상단 바 설정 — 모르는 항목은 버리고 빠진 항목은 끝에 붙인다(항목이 늘어도 사라지지 않게) */
function loadPrefs(): HeaderPrefs {
  try {
    const saved = JSON.parse(readPref(KEYS.header) ?? 'null') as Partial<HeaderPrefs> | null
    const known = (v: unknown): v is Item => ITEMS.includes(v as Item)
    const order = Array.isArray(saved?.order) ? saved.order.filter(known) : []
    const hidden = Array.isArray(saved?.hidden) ? saved.hidden.filter((i) => known(i) && i !== 'user') : []
    return { order: [...new Set([...order, ...ITEMS])], hidden }
  } catch {
    return { order: [...ITEMS], hidden: [] }
  }
}

/** 본문 위에 떠 있는 유리 상단 바. 본문이 그 아래로 흘러 지나간다. */
export function TopBar({ me, meLoading, page, query, onQueryChange, theme, onEditWidgets, editing, onDone }: TopBarProps) {
  const { t, f } = useI18n()
  const [prefs, setPrefs] = useState(loadPrefs)
  const [dragging, setDragging] = useState<Item | null>(null)
  // 편집을 켜고 끌 때만 오른쪽 내용이 흐려진 채 올라온다 — 처음 열 때는 그대로
  const [toggled, setToggled] = useState(false)
  if (editing && !toggled) setToggled(true)
  const save = (next: HeaderPrefs) => {
    setPrefs(next)
    writePref(KEYS.header, JSON.stringify(next))
  }
  const moveTo = (item: Item, index: number) => {
    const order = prefs.order.filter((i) => i !== item)
    order.splice(Math.max(0, Math.min(order.length, index)), 0, item)
    if (order.join() !== prefs.order.join()) save({ ...prefs, order })
  }

  const parts: Record<Item, ReactNode> = {
    search: (
      <>
        <SearchBox value={query} onChange={onQueryChange} hotkey className="mr-1.5 hidden w-64 md:block xl:w-96" />
        <a href={hrefOf('systems')} aria-label={t.layout.search.label} className={`${ICON_BUTTON} md:hidden`}>
          <Search className="size-5" aria-hidden="true" />
        </a>
      </>
    ),
    theme: <ThemeMenu theme={theme} />,
    user: me ? (
      <UserMenu me={me} />
    ) : (
      meLoading && (
        // 사용자 버튼과 같은 크기로 자리만 잡아 둔다
        <span className="flex items-center gap-2.5 py-1 pr-2 pl-1" role="status" aria-label={t.layout.user.loading}>
          <Skeleton className="size-9 rounded-full" />
          <span className="hidden md:block">
            <Skeleton className="h-3.5 w-14 rounded-md" />
            <Skeleton className="mt-1.5 h-3 w-20 rounded-md" />
          </span>
          <span className="w-4" />
        </span>
      )
    ),
  }
  const shown = prefs.order.filter((i) => !prefs.hidden.includes(i))

  return (
    <header className="glass-chrome sticky top-3 z-20 flex h-16 items-center gap-3 rounded-2xl pr-2 pl-3 sm:pl-4">
      <div className="lg:hidden">
        <Brand compact />
      </div>
      {/* 지금 어디에 있는지 */}
      <p className="min-w-0 truncate leading-tight">
        <span className="hidden text-xs text-muted sm:block">DVI Portal</span>
        <span className="block text-[15px] font-bold tracking-[-0.01em] sm:text-base">{t.layout.pages[page]}</span>
      </p>

      {editing ? (
        // 편집 중 — 항목을 끌어 순서를 바꾸고 눈 단추로 숨긴다(브라우저 끌어 놓기, 다른 항목 위를 지나는 순간 자리를 바꾼다)
        <div className="fade-up ml-auto flex min-w-0 items-center gap-2">
          <span className="hidden text-[13px] text-muted xl:block">{t.widgets.header.hint}</span>
          <ul className="flex min-w-0 items-center gap-1.5 overflow-x-auto" aria-label={t.widgets.header.title}>
            {prefs.order.map((item, index) => {
              const name = t.widgets.header.items[item]
              const off = prefs.hidden.includes(item)
              const toggle = f(off ? t.widgets.header.show : t.widgets.header.hide, { name })
              return (
                <li
                  key={item}
                  draggable
                  tabIndex={0}
                  aria-label={f(t.widgets.header.move, { name, index: index + 1 })}
                  onDragStart={(e) => {
                    setDragging(item)
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', name)
                  }}
                  onDragOver={(e) => {
                    if (!dragging) return
                    e.preventDefault()
                    moveTo(dragging, index)
                  }}
                  onDragEnd={() => setDragging(null)}
                  onKeyDown={(e) => {
                    const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key]
                    if (!d || e.target !== e.currentTarget) return
                    e.preventDefault()
                    moveTo(item, index + d)
                  }}
                  className={`flex h-10 flex-none cursor-grab items-center gap-1 rounded-xl pr-1 pl-1.5 text-sm font-semibold ring-1 transition-[opacity,background-color] outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing ${
                    dragging === item ? 'bg-accent-soft ring-accent/50' : 'bg-subtle ring-line'
                  } ${off ? 'text-muted' : ''}`}
                >
                  <GripVertical className="size-4 text-muted" aria-hidden="true" />
                  <span className={off ? 'line-through' : ''}>{name}</span>
                  {item === 'user' ? (
                    <span className="grid size-8 place-items-center text-muted" title={t.widgets.header.locked}>
                      <Lock className="size-4" aria-hidden="true" />
                      <span className="sr-only">{t.widgets.header.locked}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => save({ ...prefs, hidden: off ? prefs.hidden.filter((i) => i !== item) : [...prefs.hidden, item] })}
                      aria-pressed={!off}
                      aria-label={toggle}
                      title={toggle}
                      className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg"
                    >
                      {off ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            onClick={onDone}
            className="h-10 flex-none cursor-pointer rounded-xl bg-accent-fill px-5 text-[15px] font-semibold text-white transition-[scale] active:scale-95"
          >
            {t.widgets.done}
          </button>
        </div>
      ) : (
        <div className={`ml-auto flex items-center gap-1 ${toggled ? 'fade-up' : ''}`}>
          {onEditWidgets && (
            <button type="button" onClick={onEditWidgets} aria-label={t.widgets.edit} title={t.widgets.edit} className={ICON_BUTTON}>
              <LayoutDashboard className="size-5" aria-hidden="true" />
            </button>
          )}
          {/* 알림은 서버 API 가 생길 때까지 숨긴다. 사용자 메뉴 앞에는 구분선(맨 앞이면 없음) */}
          {shown.map((item, i) => (
            <Fragment key={item}>
              {item === 'user' && i > 0 && (me || meLoading) && <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden="true" />}
              {parts[item]}
            </Fragment>
          ))}
        </div>
      )}
    </header>
  )
}
