// 앱 홈 위젯 — 무엇을 어떤 크기로 그릴 수 있는지. React 없이 값만 다룬다(node --test 가 직접 읽는다)
import type { StackSize } from '@dvi/core/widget'

export type WidgetKind = 'hero' | 'systems' | 'service'

export interface HomeWidget {
  id: string
  kind: WidgetKind
  /** 그릴 수 있는 크기 — 길게 누르면 이 순서로 돌아간다 */
  sizes: StackSize[]
  size: StackSize
  /** kind 가 service 일 때 그 서비스 id */
  service?: string
}

/** 처음 배치 — 넓은 인사 카드, 서비스 바로가기 셋(1×1 · 2×1), 업무시스템 목록 */
export function defaultWidgets(serviceIds: string[]): HomeWidget[] {
  const tiles = serviceIds.slice(0, 3).map(
    (id, i): HomeWidget => ({ id: `service:${id}`, kind: 'service', service: id, sizes: ['1x1', '2x1', 's'], size: i === 0 ? '2x1' : '1x1' }),
  )
  return [
    { id: 'hero', kind: 'hero', sizes: ['4x1', 'w', '2x4', 's'], size: 'w' },
    ...tiles,
    { id: 'systems', kind: 'systems', sizes: ['s', 'w', '2x4', 'm', '4x1'], size: 'm' },
  ]
}

/** 다음 크기 — 끝이면 처음으로. 지금 크기를 그릴 수 없으면 첫 크기 */
export function nextSize(w: HomeWidget): StackSize {
  const i = w.sizes.indexOf(w.size)
  return w.sizes[(i + 1) % w.sizes.length]
}
