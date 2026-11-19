// 홈 위젯 판의 기준값 — 배치 규칙(lib/widgetLayout.ts) · 위젯 판(WidgetGrid) · 갤러리가 함께 쓴다.
// 화면 크기 기준(FIT · BOARD)과 틈(GAP)은 styles.css 의 board-fit · fit · tall 변형 · 64rem · 1.25rem 에도 같은 값이 적혀 있다 — 바꾸면 같이.

/** 한 페이지의 칸 — 24열 × 12행. 위젯 위치 · 크기는 이 칸의 정수라 경계가 늘 칸 선 위에 있다. 잘게 나눠 크기를 조금씩 맞출 수 있게 */
export const COLS = 24
export const ROWS = 12
/** 칸 사이 틈(px) — 가로 · 세로 같다 */
export const GAP = 20
/** 화면에 맞추지 않는 크기(넓지만 낮은 화면)의 행 높이(px). 페이지가 화면보다 길면 스크롤된다 */
export const ROW_H = 70
/** 한 페이지에 둘 수 있는 위젯 수 — 화면이 넓어도 이보다 많으면 한눈에 안 들어온다 */
export const MAX_PER_PAGE = 12

/** 넓은 화면 — 칸 배치 · 끌기 · 페이지는 여기서만. 좁은 화면은 읽는 순서로 쌓는다 */
export const BOARD = '(min-width: 64rem)'
/** 한 페이지를 스크롤 없이 화면에 담을 만큼 넓고 높은 화면 — 행 높이를 화면 높이로 나눠 정한다 */
export const FIT = '(min-width: 1880px) and (min-height: 900px)'

/** 끄는 위젯을 위젯 판 왼쪽 · 오른쪽 끝 이만큼(px) 안에 놓으면 옆 페이지로(오른쪽 끝 페이지면 새 페이지) */
export const EDGE = 72
/** 끄는 위젯을 끝에 이만큼(ms) 대고 있으면 놓지 않아도 옆 페이지로 넘긴다 */
export const FLIP_HOLD = 500
/** 페이지가 옆으로 미끄러지는 시간(ms) — styles.css 의 .widget-track transition(0.45s)보다 조금 길게. 그 뒤에 옆 페이지를 그리고 · 숨기고 · 이어 끈다 */
export const SLIDE = 460
/** 편집 중이 아닐 때 터치로 이만큼(ms) 길게 누르면 편집이 시작된다 */
export const EDIT_HOLD = 550
