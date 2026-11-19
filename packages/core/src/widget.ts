// 위젯이 그려질 크기 — 홈 보드와 위젯(패널)이 함께 쓰는 약속

/** 좁은 화면에서 고르는 크기(4칸 격자의 칸 수 또는 넓은 화면 크기 이름) */
export type StackSize = 's' | 'w' | 'm' | 'l' | '1x1' | '1x2' | '2x1' | '4x1' | '3x2' | '2x3' | '2x4'
/** 아주 작은 칸 — 아이콘 · 숫자 하나(1×1 · 1×2)나 한 줄 띠(2×1 · 4×1)만 들어간다(shared/ui 의 MiniPanel) */
export type MiniSize = '1x1' | '1x2' | '2x1' | '4x1'
export const isMini = (s: StackSize | undefined): s is MiniSize => s === '1x1' || s === '1x2' || s === '2x1' || s === '4x1'
