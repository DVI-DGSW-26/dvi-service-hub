// 목업 서비스 위젯(widgets.tsx · opsWidgets.tsx)을 만드는 도구

import type { Access, WidgetView } from '@/features/systems'
import { ServiceWidget } from '@/features/systems'
import type { WidgetDef, WidgetSize } from '@/features/home'

/** sizes — 그릴 수 있는 크기. 가장 작은 것이 최소 크기 */
export const w = (app: string, key: string, title: string, description: string, sizes: WidgetSize[], view: WidgetView, access?: Access): WidgetDef => ({
  type: `${app}/${key}`,
  app,
  title,
  description,
  sizes,
  access,
  render: ({ size }) => <ServiceWidget app={app} title={title} size={size} view={view} />,
})

/** 연구노트 역할 — 연구원 / 과제 책임자 / 관리자. 목업 사용자(mocks/info.ts)는 앞의 둘만 있다 */
export const rn = (role: string): Access => ({ type: 'client', client: 'research-note', role })

export const series = (seed: number, n = 12, base = 50, swing = 30) => Array.from({ length: n }, (_, i) => Math.round(base + Math.sin(i * 0.9 + seed) * swing * 0.6 + ((i * seed * 7) % 11) - 5))
