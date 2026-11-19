const TRANSLATE = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/

/** 위젯 자리(transform: translate(x, y)) 읽기 — 없으면 [0, 0] */
export function readTranslate(el: HTMLElement): [number, number] {
  const [, left = '0', top = '0'] = TRANSLATE.exec(el.style.transform) ?? []
  return [+left, +top]
}
