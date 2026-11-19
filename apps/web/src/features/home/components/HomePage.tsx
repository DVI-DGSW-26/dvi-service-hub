import type { ReactNode } from 'react'
import type { Me } from '@dvi/core/types'
import { NoDepartmentNotice } from '@/shared/ui'
import { useI18n } from '@/shared/i18n'
import { hasNoDepartment } from '@/shared/lib'

interface HomePageProps {
  me: Me | null
  editing: boolean
  /** 위젯 판 — 넓은 화면은 DesktopBoard, 좁은 화면은 MobileBoard. 셸이 골라 넣어 서로의 코드를 받지 않는다 */
  children: ReactNode
}

/**
 * 포털 홈 — 사람마다 고르고 배치하는 위젯 판. 무엇을 어디에 둘지는 이 브라우저에 저장한다(useWidgetLayout).
 * 배치 규칙은 lib/widgetLayout.ts. 편집 중에는 상단 바에 완료가 들어오고, 목업이면 사이드바 자리에 위젯 갤러리가 들어온다(DesktopApp · registry 의 GALLERY).
 */
export function HomePage({ me, editing, children }: HomePageProps) {
  const { t } = useI18n()
  return (
    <>
      {hasNoDepartment(me) && <NoDepartmentNotice className="mb-4 flex-none" />}
      {editing && (
        // 좁은 화면은 안내 없이 — 화면을 가려 불편하다. 화면 낭독기에는 보드의 aria-label 로 남는다(StackBoard)
        <p className="mb-3 flex-none px-1 text-sm text-muted max-lg:hidden" aria-live="polite">
          {t.widgets.editHint}
        </p>
      )}
      <div className="min-h-0 flex-1">{children}</div>
    </>
  )
}
