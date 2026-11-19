import { useI18n } from '@/shared/i18n'

/** 넓은 화면 페이지 점 — 누르면 그 페이지로 */
export function PageDots({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (p: number) => void }) {
  const { t, f } = useI18n()
  return (
    <div className="hidden flex-none justify-center gap-1 lg:flex" role="group" aria-label={t.widgets.pages}>
      {Array.from({ length: pageCount }, (_, p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPage(p)}
          aria-label={f(t.widgets.page, { page: p + 1, total: pageCount })}
          aria-current={p === page ? 'page' : undefined}
          className="grid size-6 cursor-pointer place-items-center"
        >
          <span className={`block size-2 rounded-full transition-[background-color,scale] ${p === page ? 'scale-125 bg-fg' : 'bg-fg/25 hover:bg-fg/45'}`} />
        </button>
      ))}
    </div>
  )
}
