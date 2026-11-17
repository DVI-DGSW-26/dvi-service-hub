import type { ReactNode } from 'react'
import type { Messages } from '../../i18n'
import { canSee } from '../../lib/access'
import { services, type Access, type Service } from '../../services'
import type { Me } from '../../types/portal'
import { CalendarPanel } from '../dashboard/CalendarPanel'
import { HeroCard } from '../dashboard/HeroCard'
import { MaintenancePanel } from '../dashboard/MaintenancePanel'
import { NewsPanel } from '../dashboard/NewsPanel'
import { QuickLinksPanel } from '../dashboard/QuickLinksPanel'
import { SystemsPanel } from '../dashboard/SystemsPanel'
import { TodayPanel } from '../dashboard/TodayPanel'

import type { WidgetSize } from '../../lib/widgetLayout'

export { SIZES, type WidgetSize } from '../../lib/widgetLayout'

/** 위젯이 그릴 때 받는 것 — 홈 화면이 가진 것을 그대로 넘긴다 */
export interface WidgetContext {
  me: Me | null
  meLoading: boolean
  /** 권한으로 거르고 즐겨찾기 순으로 정렬한 목록 */
  services: Service[]
  allServices: Service[]
  favorites: string[]
  onToggleFavorite: (id: string) => void
  size: WidgetSize
}

export interface WidgetDef {
  /** 저장되는 이름 — 바꾸면 저장해 둔 배치에서 빠진다 */
  type: string
  /** 갤러리 묶음 — 'portal'(허브 자체) 또는 services.ts 의 id. 그 서비스가 안 보이는 사람에게는 위젯도 안 보인다 */
  app: string
  title: string | ((t: Messages) => string)
  description: string | ((t: Messages) => string)
  /** 그릴 수 있는 크기 — 칸이 클수록 큰 것으로 그린다. 가장 작은 것이 이 위젯의 최소 크기(lib/widgetLayout.ts 의 PX) */
  sizes: WidgetSize[]
  /** 최소 크기(px)를 따로 정할 때 — 내용이 sizes 의 기본 최소(PX)보다 더 있어야 안 잘리는 위젯 */
  min?: { w: number; h: number }
  /** 서비스 안에서 역할이 더 필요한 위젯 (연구노트 책임자용 등). 숨기는 것은 안내이고, 막는 건 그 서비스다 */
  access?: Access
  render: (ctx: WidgetContext) => ReactNode
}

/** 갤러리에서 브라우저 끌어 놓기로 끄는 위젯 — 위젯 판이 dragover 중에 읽는다(dataTransfer 는 놓을 때만 읽힌다) */
export const galleryDrag = { type: '' }

export const text = (v: WidgetDef['title'], t: Messages) => (typeof v === 'string' ? v : v(t))

/** 기존 패널이 칸 높이에 맞춰 줄고 넘치는 것은 자른다 */
const FILL = 'h-full min-h-0 overflow-hidden'

/**
 * 모든 위젯. 허브 자체 위젯이 먼저고, pnpm dev:mock 에서는 main.tsx 가 서비스 위젯(mocks/widgets.tsx)을 뒤에 붙인다
 * — 서비스 위젯은 아직 데이터를 줄 API 가 없어 운영 화면에 내보내지 않는다 (docs/adr/0001).
 */
export const WIDGETS: WidgetDef[] = [
  {
    type: 'hero',
    app: 'portal',
    title: (t) => t.widgets.builtin.hero.title,
    description: (t) => t.widgets.builtin.hero.description,
    sizes: ['m', 'l'],
    min: { w: 560, h: 300 },
    render: ({ me, meLoading, services: list, favorites }) => (
      <HeroCard me={me} loading={meLoading} favoriteCount={list.filter((s) => favorites.includes(s.id)).length} className={FILL} />
    ),
  },
  {
    type: 'quick-links',
    app: 'portal',
    title: (t) => t.home.quickLinks.title,
    description: (t) => t.widgets.builtin.quickLinks,
    sizes: ['s', 'm', 'l'],
    render: () => <QuickLinksPanel className={FILL} />,
  },
  {
    type: 'systems',
    app: 'portal',
    title: (t) => t.home.systems.title,
    description: (t) => t.widgets.builtin.systems,
    // 카드 다섯 칸 × 두 줄이라 넓은 크기만 — 좁으면 카드가 세로로 길쭉해진다
    sizes: ['m', 'xl'],
    // 화면에 맞춘 칸에서는 카드가 다섯 칸으로 늘어선다 — 그보다 좁으면 이름과 별이 겹친다
    min: { w: 860, h: 300 },
    render: (ctx) => <SystemsPanel {...ctx} loading={ctx.meLoading} className={FILL} />,
  },
  {
    type: 'today',
    app: 'portal',
    title: (t) => t.schedule.title,
    description: (t) => t.widgets.builtin.today,
    sizes: ['s', 'm', 'l'],
    min: { w: 320, h: 300 },
    render: () => <TodayPanel className={FILL} />,
  },
  {
    type: 'maintenance',
    app: 'portal',
    title: (t) => t.home.maintenance.title,
    description: (t) => t.widgets.builtin.maintenance,
    sizes: ['s', 'm', 'l'],
    min: { w: 320, h: 300 },
    render: ({ me }) => <MaintenancePanel me={me} className={FILL} />,
  },
  {
    type: 'news',
    app: 'portal',
    title: (t) => t.home.news.title,
    description: (t) => t.widgets.builtin.news,
    sizes: ['s', 'm', 'l'],
    render: () => <NewsPanel className={FILL} />,
  },
  {
    type: 'calendar',
    app: 'portal',
    title: (t) => t.calendar.title,
    description: (t) => t.widgets.builtin.calendar,
    sizes: ['s', 'm', 'l'],
    min: { w: 340, h: 300 },
    render: () => <CalendarPanel className={FILL} />,
  },
]

/** 이 사람에게 보여줄 위젯 — 서비스 권한(services.ts 의 access)과 위젯 자체 권한을 같은 규칙(canSee)으로 본다 */
export function visibleWidgets(me: Me | null): WidgetDef[] {
  return WIDGETS.filter((d) => {
    if (d.access && !canSee({ access: d.access }, me)) return false
    if (d.app === 'portal') return true
    const s = services.find((x) => x.id === d.app)
    return !!s && canSee(s, me)
  })
}
