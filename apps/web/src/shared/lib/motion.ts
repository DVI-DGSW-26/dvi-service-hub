/** OS 의 '동작 줄이기'만 — 테마 메뉴의 끄기는 보지 않는다 */
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** 테마 메뉴에서 껐거나 OS 의 '동작 줄이기'가 켜져 있으면 움직임 없이 바로 바꾼다 */
export const motionOff = () => document.documentElement.dataset.motion === 'off' || reducedMotion()
