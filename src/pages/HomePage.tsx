import { NoDepartmentNotice } from '../components/dashboard/NoDepartmentNotice'
import type { WidgetContext, WidgetDef } from '../components/widgets/registry'
import { WidgetGrid } from '../components/widgets/WidgetGrid'
import type { Decor } from '../hooks/useDecor'
import type { WidgetLayout } from '../hooks/useWidgetLayout'
import { useI18n } from '../i18n'
import { hasNoDepartment } from '../lib/access'

interface HomePageProps {
  ctx: Omit<WidgetContext, 'size'>
  layout: WidgetLayout
  /** 이 사람에게 보이는 위젯 */
  defs: WidgetDef[]
  editing: boolean
  onEdit: () => void
  decor: Decor
}

/**
 * 포털 홈 — 사람마다 고르고 배치하는 위젯 판. 무엇을 어디에 둘지는 이 브라우저에 저장한다(useWidgetLayout).
 * 배치 규칙은 lib/widgetLayout.ts, 끌기 · 크기 조절은 react-grid-layout. 편집 중에는 상단 바에 완료가 들어오고, 목업이면 사이드바 자리에 위젯 갤러리가 들어온다(App · registry 의 GALLERY).
 */
export function HomePage({ ctx, layout, defs, editing, onEdit, decor }: HomePageProps) {
  const { t } = useI18n()
  return (
    <>
      {hasNoDepartment(ctx.me) && <NoDepartmentNotice className="mb-4 flex-none" />}
      {editing && (
        <p className="mb-3 flex-none px-1 text-sm text-muted" aria-live="polite">
          {t.widgets.editHint}
        </p>
      )}
      <div className="min-h-0 flex-1">
        <WidgetGrid layout={layout} defs={defs} ctx={ctx} editing={editing} onEdit={onEdit} decor={decor} />
      </div>
    </>
  )
}
