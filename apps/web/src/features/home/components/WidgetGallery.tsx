import { Check, GripVertical, Plus, RotateCcw, Search } from 'lucide-react'
import { useId, useState, type CSSProperties } from 'react'
import type { WidgetLayout } from '../hooks/useWidgetLayout'
import { useI18n } from '@/shared/i18n'
import { services, ServiceLogo } from '@/features/systems'
import { Modal } from '@/shared/ui'
import { MAX_PER_PAGE } from '../lib/constants'
import { galleryDrag, text, type WidgetDef } from '../lib/widgetDef'

interface GalleryProps {
  layout: WidgetLayout
  defs: WidgetDef[]
}

/** 차례로 아래에서 올라오는 순서 — 많아도 마지막이 너무 늦지 않게 끊는다 */
const rise = (i: number) => ({ '--i': Math.min(i, 8) }) as CSSProperties

/**
 * 편집 중 왼쪽 사이드바 자리에 들어오는 위젯 고르기 (iPadOS 위젯 갤러리). 빈 유리판이 먼저 뜨고 안의 것들이 아래에서 차례로 올라온다.
 * 위젯은 홈으로 끌어 놓거나 눌러서(보고 있는 페이지의 처음 들어가는 자리, 없으면 새 페이지에) 추가한다. '완료'는 화면 아래 편집 독에 있다(EditDock).
 * 좁은 화면은 사이드바가 없어 아래쪽 편집 막대의 '위젯 추가'가 같은 목록을 시트로 연다. Esc 로 편집을 마치는 것은 App 이 한다.
 * 목업(GALLERY)에서만 쓴다.
 */
export function WidgetEditBar({ layout, defs }: GalleryProps) {
  const { t, f } = useI18n()
  const [sheet, setSheet] = useState(false)
  const titleId = useId()

  const reset = (
    <button
      type="button"
      onClick={layout.reset}
      title={t.widgets.reset}
      className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:bg-subtle hover:text-fg"
    >
      <RotateCcw className="size-4" aria-hidden="true" />
      {/* 휴대폰 편집 막대는 좁아 글자를 숨긴다 — 화면낭독기는 그대로 읽는다 */}
      <span className="max-sm:sr-only">{t.widgets.reset}</span>
    </button>
  )

  return (
    <>
      <aside aria-labelledby={titleId} className="glass-chrome fixed inset-y-3 left-3 z-30 hidden w-[380px] animate-materialize flex-col overflow-hidden rounded-3xl lg:flex">
        <div className="rise px-6 pt-6 pb-4" style={rise(0)}>
          <h2 id={titleId} className="text-xl font-bold tracking-[-0.015em]">
            {t.widgets.galleryTitle}
          </h2>
          <p className="mt-1 text-[13px] text-muted">{t.widgets.galleryHint}</p>
        </div>
        <GalleryList layout={layout} defs={defs} className="min-h-0 flex-1 px-4" />
        <div className="rise flex items-center justify-between border-t border-line p-3" style={rise(8)}>
          {reset}
          <span className="pr-2 text-[13px] text-muted tabular-nums">
            {f(t.widgets.perPage, { n: layout.items.length, max: MAX_PER_PAGE })}
          </span>
        </div>
      </aside>

      {/* 좁은 화면 — 탭 바 자리는 편집 탭 바(EditTabBar)가 쓰니 그 위에 */}
      <div className="glass-chrome fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-2 rounded-[22px] p-2 lg:hidden">
        <button
          type="button"
          onClick={() => setSheet(true)}
          aria-haspopup="dialog"
          className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-subtle px-3.5 text-[15px] font-semibold ring-1 ring-line active:scale-95"
        >
          <Plus className="size-[18px]" aria-hidden="true" />
          {t.widgets.galleryTitle}
        </button>
        <div className="flex-1">{reset}</div>
      </div>
      <Modal open={sheet} onClose={() => setSheet(false)} labelledBy={`${titleId}-sheet`} className="lg:hidden">
        <div className="flex max-h-[80dvh] flex-col p-4">
          <h2 id={`${titleId}-sheet`} className="pr-12 pb-1 pl-1 text-lg font-bold">
            {t.widgets.galleryTitle}
          </h2>
          <p className="pr-12 pb-3 pl-1 text-[13px] text-muted">{t.widgets.galleryHint}</p>
          <GalleryList layout={layout} defs={defs} onAdded={() => setSheet(false)} className="min-h-0 flex-1" />
        </div>
      </Modal>
    </>
  )
}

/** 검색 + 서비스별 위젯 목록 */
function GalleryList({ layout, defs, onAdded, className = '' }: { layout: WidgetLayout; defs: WidgetDef[]; onAdded?: () => void; className?: string }) {
  const { t, f } = useI18n()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const groups = [{ id: 'portal', name: t.widgets.portal }, ...services]
    .map((g) => ({
      ...g,
      service: services.find((s) => s.id === g.id),
      items: defs.filter((d) => d.app === g.id && `${g.name} ${text(d.title, t)} ${text(d.description, t)}`.toLowerCase().includes(q)),
    }))
    .filter((g) => g.items.length)

  // 좁은 화면은 한 줄로 쌓여 있으니 그 위젯까지 스크롤
  const add = (d: WidgetDef) => {
    layout.add(d.type)
    onAdded?.()
    requestAnimationFrame(() => document.querySelector(`.widget-board > [data-type="${d.type}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <label className="rise relative mx-1 mb-2 block flex-none" style={rise(1)}>
        <span className="sr-only">{t.widgets.search}</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.widgets.search}
          className="h-11 w-full rounded-xl bg-subtle pr-3 pl-9 text-[15px] ring-1 ring-line outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
        />
      </label>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-3">
        {groups.length === 0 && <p className="px-2 py-8 text-center text-sm text-muted">{t.widgets.noResults}</p>}
        {groups.map((g, gi) => (
          <section key={g.id} aria-label={g.name} className="rise mt-4 first:mt-1" style={rise(gi + 2)}>
            <h3 className="flex items-center gap-2 px-2 pb-1.5 text-[13px] font-bold text-muted">
              {g.service ? <ServiceLogo service={g.service} size="sm" /> : <img src="/favicon.svg" alt="" width={20} height={20} className="m-1 size-5" />}
              {g.name}
            </h3>
            <ul className="space-y-1.5">
              {g.items.map((d) => {
                const name = text(d.title, t)
                const added = layout.has(d.type)
                const room = !added
                return (
                  <li
                    key={d.type}
                    draggable={room}
                    onDragStart={(e) => {
                      galleryDrag.type = d.type
                      e.dataTransfer.effectAllowed = 'copy'
                      e.dataTransfer.setData('text/plain', name)
                    }}
                    onDragEnd={() => (galleryDrag.type = '')}
                    className={`group flex items-center gap-2 rounded-2xl p-2.5 ring-1 transition-[background-color,box-shadow] ${
                      room ? 'cursor-grab bg-subtle/60 ring-line hover:bg-subtle hover:ring-accent/40 active:cursor-grabbing' : 'ring-transparent'
                    }`}
                  >
                    <GripVertical className={`size-4 flex-none ${room ? 'text-muted' : 'text-transparent'}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{name}</span>
                      <span className="mt-0.5 line-clamp-2 block text-[13px] text-muted">{text(d.description, t)}</span>
                    </div>
                    {added ? (
                      <span className="flex flex-none items-center gap-1 px-1.5 text-[13px] font-semibold text-ok">
                        <Check className="size-4" aria-hidden="true" />
                        {t.widgets.added}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => add(d)}
                        aria-label={f(t.widgets.add, { name })}
                        title={f(t.widgets.add, { name })}
                        className="grid size-9 flex-none cursor-pointer place-items-center rounded-full bg-accent-fill text-white transition-[scale] hover:scale-105 active:scale-95"
                      >
                        <Plus className="size-[18px]" strokeWidth={2.5} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
