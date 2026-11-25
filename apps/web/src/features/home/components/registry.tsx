import { canSee, SystemsPanel, services } from '@/features/systems'
import type { Me } from '@/shared/types'
import { CalendarPanel, TodayPanel } from '@/features/schedule'
import { HeroCard } from '@/features/hero'
import { MaintenancePanel } from '@/features/maintenance'
import { NewsPanel } from '@/features/news'
import { FlowPanel } from '@/features/flow'
import { QuickLinksPanel } from '@/features/quick-links'

import { STACK_SIZES, lookOf } from '../lib/stackLayout'
import type { WidgetDef } from '../lib/widgetDef'

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
    decor: 'hero',
    // 1×1 · 1×2 는 인사 · 배경 그림이 들어가지 않아 뺀다
    stack: ['4x1', 's', '3x2', 'w', '2x3', 'm', 'l'],
    render: ({ me, meLoading, services: list, favorites, hero, stack }) => (
      <HeroCard me={me} loading={meLoading} favoriteCount={list.filter((s) => favorites.includes(s.id)).length} image={hero} size={lookOf(stack)} className={FILL} />
    ),
  },
  {
    type: 'quick-links',
    app: 'portal',
    title: (t) => t.home.quickLinks.title,
    description: (t) => t.widgets.builtin.quickLinks,
    sizes: ['s', 'm', 'l'],
    stack: STACK_SIZES,
    render: ({ stack }) => <QuickLinksPanel size={lookOf(stack)} className={FILL} />,
  },
  {
    type: 'systems',
    app: 'portal',
    title: (t) => t.home.systems.title,
    description: (t) => t.widgets.builtin.systems,
    // 카드 여러 장을 줄지어 보여 주는 위젯이라 넓은 크기만
    sizes: ['m', 'xl'],
    // 카드(240px 이상)가 서너 장씩 한 줄에 서는 폭 — 좁아도 깨지지는 않지만(가로 카드 한두 줄) 한 페이지에 보이는 카드가 적다
    min: { w: 860, h: 300 },
    stack: STACK_SIZES,
    render: (ctx) => <SystemsPanel {...ctx} stack={lookOf(ctx.stack)} loading={ctx.meLoading || ctx.servicesLoading} className={FILL} />,
  },
  {
    type: 'today',
    app: 'portal',
    title: (t) => t.schedule.title,
    description: (t) => t.widgets.builtin.today,
    sizes: ['s', 'm', 'l'],
    min: { w: 320, h: 300 },
    stack: STACK_SIZES,
    render: ({ stack }) => <TodayPanel size={lookOf(stack)} className={FILL} />,
  },
  {
    type: 'maintenance',
    app: 'portal',
    title: (t) => t.home.maintenance.title,
    description: (t) => t.widgets.builtin.maintenance,
    sizes: ['s', 'm', 'l'],
    min: { w: 320, h: 300 },
    stack: STACK_SIZES,
    render: ({ me, stack }) => <MaintenancePanel me={me} size={lookOf(stack)} className={FILL} />,
  },
  {
    type: 'news',
    app: 'portal',
    title: (t) => t.home.news.title,
    description: (t) => t.widgets.builtin.news,
    sizes: ['s', 'm', 'l'],
    stack: STACK_SIZES,
    render: ({ stack }) => <NewsPanel size={lookOf(stack)} className={FILL} />,
  },
  {
    type: 'calendar',
    app: 'portal',
    title: (t) => t.calendar.title,
    description: (t) => t.widgets.builtin.calendar,
    sizes: ['s', 'm', 'l'],
    min: { w: 340, h: 300 },
    stack: STACK_SIZES,
    render: ({ stack }) => <CalendarPanel size={lookOf(stack)} className={FILL} />,
  },
  {
    // 처음 배치(DEFAULT_WIDGETS)에는 없다 — 운영 서버에 플로우 연동이 켜지면 넣을지 정한다. 그전에는 갤러리(목업)에서만 넣는다
    type: 'flow',
    app: 'portal',
    title: (t) => t.home.flow.title,
    description: (t) => t.widgets.builtin.flow,
    sizes: ['s', 'm', 'l'],
    min: { w: 320, h: 300 },
    stack: STACK_SIZES,
    render: ({ stack }) => <FlowPanel size={lookOf(stack)} className={FILL} />,
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
