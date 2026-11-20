import { Eye, EyeOff, GripVertical, Lock, PencilRuler, Search } from 'lucide-react'
import { Fragment, useRef, useState, useSyncExternalStore, type PointerEvent, type ReactNode } from 'react'
import { hrefOf, type Page } from '@/shared/hooks'
import type { PortalTheme } from '@/features/theme'
import { PHONE } from '@/shared/constants'
import { useMedia } from '@/shared/hooks'
import { useI18n } from '@/shared/i18n'
import { KEYS, readPref, writePref } from '@/shared/lib'
import type { Me } from '@/shared/types'
import { ICON_BUTTON, Skeleton, SearchBox } from '@/shared/ui'
import { Brand } from './Sidebar'
import { ThemeMenu } from '@/features/theme'
import { UserMenu } from './UserMenu'

interface TopBarProps {
  me: Me | null
  meLoading: boolean
  page: Page
  query: string
  onQueryChange: (q: string) => void
  theme: PortalTheme
  /** 홈에서만 — 홈 편집을 연다 */
  onEditWidgets?: () => void
  /** 테마 메뉴의 '홈 배경 · 그림 바꾸기' — 홈으로 가서 편집을 연다 */
  onCustomize: () => void
  /** 홈 편집 중 — 상단 바 항목의 순서 · 보이기를 고친다. 나머지 도구와 '완료'는 화면 아래 편집 독(EditDock) */
  editing?: boolean
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

/** 문서를 px 보다 더 내렸는지 — 넘나들 때만 다시 그린다 */
function useScrolled(px: number) {
  return useSyncExternalStore(
    (onChange) => {
      addEventListener('scroll', onChange, { passive: true })
      return () => removeEventListener('scroll', onChange)
    },
    () => scrollY > px,
  )
}

/** 본문 위에 떠 있는 유리 상단 바. 본문이 그 아래로 흘러 지나간다. 휴대폰에서는 화면 맨 위에 붙는다(styles/layout.css 의 .app-bar) */
export function TopBar({ me, meLoading, page, query, onQueryChange, theme, onEditWidgets, onCustomize, editing }: TopBarProps) {
  const { t, f } = useI18n()
  const [prefs, setPrefs] = useState(loadPrefs)
  // 휴대폰은 상단 바를 고치지 않는다 — 편집 중에도 · 고친 설정이 있어도 늘 같은 모양(좁아 항목 줄이 들어갈 자리도 없다)
  const phone = useMedia(PHONE)
  const scrolled = useScrolled(0)
  // 큰 제목(PageTitle 의 h1) 이 바 밑으로 다 들어간 즈음
  const pastTitle = useScrolled(52)
  // 드래그 중인 항목 — 놓기 전에는 순서를 안 바꾸고 transform 으로만 보여 준다(바로 바꾸면 폭이 다른 항목끼리 자리가 왔다 갔다 한다)
  const [drag, setDrag] = useState<{ from: number; to: number; dx: number; step: number } | null>(null)
  // 손에 든 값은 ref 에도 — 빠르게 놓으면 다시 그리기 전에 pointerup 이 와서 state 가 한 박자 늦다
  const held = useRef<{ x: number; dx: [number, number]; edges: [number, number]; mids: number[]; from: number; to: number } | null>(null)
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
    theme: <ThemeMenu theme={theme} onCustomize={onCustomize} />,
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
  const shown = phone ? ITEMS : prefs.order.filter((i) => !prefs.hidden.includes(i))

  const onDragStart = (e: PointerEvent<HTMLLIElement>, from: number) => {
    if (e.button !== 0 || (e.target as Element).closest('button')) return
    const list = e.currentTarget.parentElement
    if (!list) return
    const rects = [...list.children].map((li) => li.getBoundingClientRect())
    const me = rects[from]
    const gap = rects.length > 1 ? rects[1].left - rects[0].right : 0
    e.currentTarget.setPointerCapture(e.pointerId)
    held.current = {
      from,
      to: from,
      x: e.clientX,
      // 목록 밖으로는 못 나가게
      dx: [rects[0].left - me.left, rects[rects.length - 1].right - me.right],
      edges: [me.left, me.right],
      mids: rects.map((r) => r.left + r.width / 2),
    }
    setDrag({ from, to: from, dx: 0, step: me.width + gap })
  }
  const onDragMove = (e: PointerEvent<HTMLLIElement>) => {
    const h = held.current
    if (!h) return
    const dx = Math.min(h.dx[1], Math.max(h.dx[0], e.clientX - h.x))
    // 가는 쪽 변이 이웃의 가운데를 넘으면 자리를 바꾼다 — 가운데끼리 견주면 넓은 항목은 끝 항목을 못 넘는다
    const edge = (dx > 0 ? h.edges[1] : h.edges[0]) + dx
    h.to = h.mids.filter((m, i) => i !== h.from && m < edge).length
    setDrag((d) => d && { ...d, dx, to: h.to })
  }
  const onDragEnd = () => {
    const h = held.current
    held.current = null
    if (h) moveTo(prefs.order[h.from], h.to)
    setDrag(null)
  }
  // 드래그 중 비켜 주는 항목의 이동 거리
  const shift = (i: number) => {
    if (!drag || i === drag.from) return 0
    const { from, to, step } = drag
    if (from < to && i > from && i <= to) return -step
    if (from > to && i >= to && i < from) return step
    return 0
  }

  return (
    <header data-scrolled={scrolled || undefined} className="app-bar glass-chrome sticky top-3 z-20 flex h-16 items-center gap-3 rounded-2xl pr-2 pl-3 sm:pl-4">
      <div className="lg:hidden">
        <Brand compact />
      </div>
      {/* 지금 어디에 있는지 — 휴대폰에서 큰 제목(PageTitle)이 있는 화면은 그 제목이 바 밑으로 들어간 뒤에 나타난다 */}
      <p className={`min-w-0 truncate leading-tight transition-opacity duration-200 ${phone && page !== 'home' && !pastTitle ? 'opacity-0' : ''}`}>
        <span className="hidden text-xs text-muted sm:block">DVI Portal</span>
        <span className="block text-[15px] font-bold tracking-[-0.01em] sm:text-base">{t.layout.pages[page]}</span>
      </p>

      {editing && !phone ? (
        // 편집 중 — 항목을 드래그해 순서를 바꾸고 눈 아이콘으로 숨긴다
        <div className="fade-up ml-auto flex min-w-0 items-center gap-2">
          <span className="hidden text-[13px] text-muted xl:block">{t.widgets.header.hint}</span>
          <ul className="-my-2 flex min-w-0 items-center gap-1.5 overflow-x-auto py-2" aria-label={t.widgets.header.title}>
            {prefs.order.map((item, index) => {
              const name = t.widgets.header.items[item]
              const off = prefs.hidden.includes(item)
              const toggle = f(off ? t.widgets.header.show : t.widgets.header.hide, { name })
              const lifted = drag?.from === index
              return (
                // 드래그 · ← → 로 옮기는 항목이라 초점을 받는다 (버튼으로 바꾸면 안의 눈 버튼과 겹친다)
                // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- 위와 같다
                <li
                  key={item}
                  // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- 위와 같다
                  tabIndex={0}
                  aria-label={f(t.widgets.header.move, { name, index: index + 1 })}
                  onPointerDown={(e) => onDragStart(e, index)}
                  onPointerMove={onDragMove}
                  onPointerUp={onDragEnd}
                  onPointerCancel={onDragEnd}
                  style={drag ? { translate: `${lifted ? drag.dx : shift(index)}px 0` } : undefined}
                  onKeyDown={(e) => {
                    const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key]
                    if (!d || e.target !== e.currentTarget) return
                    e.preventDefault()
                    moveTo(item, index + d)
                  }}
                  // 놓는 순간에는 transition 없이 — 순서가 바뀌는 자리와 비켜 있던 자리가 같아 튀지 않는다
                  className={`flex h-10 flex-none cursor-grab touch-none items-center gap-1 rounded-xl pr-1 pl-1.5 text-sm font-semibold outline-none select-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing ${
                    lifted ? 'relative z-10 bg-bg shadow-[0_4px_14px_oklch(0_0_0/0.25)]' : `bg-subtle ${drag ? 'transition-[translate] duration-200 ease-out' : ''}`
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
        </div>
      ) : (
        <div className={`ml-auto flex items-center gap-1 ${toggled && !phone ? 'fade-up' : ''}`}>
          {/* 글자와 함께 — 아이콘만으로는 배치 · 배경을 여기서 바꾼다는 걸 알기 어렵다 */}
          {onEditWidgets && !editing && (
            <button
              type="button"
              onClick={onEditWidgets}
              className="mr-1 flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted ring-1 ring-line transition-[background-color,color,scale] duration-150 hover:bg-subtle hover:text-fg active:scale-95"
            >
              <PencilRuler className="size-[18px]" aria-hidden="true" />
              <span className="max-sm:sr-only">{t.widgets.edit}</span>
            </button>
          )}
          {/* 알림은 서버 API 가 생길 때까지 숨긴다. 사용자 메뉴 앞에는 구분선(맨 앞이면 없음) */}
          {shown.map((item, i) => (
            <Fragment key={item}>
              {item === 'user' && i > 0 && (me ?? meLoading) && <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden="true" />}
              {parts[item]}
            </Fragment>
          ))}
        </div>
      )}
    </header>
  )
}
