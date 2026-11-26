import type { DecorKind } from '../hooks/useDecor'

/** 기본 배경 — public/decor 의 {kind}-{id}.svg. 배경은 정사각형(어느 쪽으로 잘려도 빛이 가운데), 인사 카드는 빛 · 물결이 오른쪽(왼쪽은 글자) */
export const PRESETS = ['dawn', 'ocean', 'forest', 'aurora', 'sunset', 'lavender', 'sand', 'mint', 'night', 'blossom'] as const

export const presetUrl = (kind: DecorKind, id: (typeof PRESETS)[number]) => `/decor/${kind}-${id}.svg`
