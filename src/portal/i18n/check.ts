/** en 사전이 ko 와 어긋난 곳 — 빠진 키 · 남는 키 · 모양 차이 · 자리표시자 차이. 개발 서버에서만 돈다 */

const PLACEHOLDERS = /\{(\w+)\}/g

const kind = (v: unknown) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v)
const names = (s: string) => [...s.matchAll(PLACEHOLDERS)].map((m) => m[1]).sort().join(',')

function diff(ko: unknown, en: unknown, path: string, out: string[]) {
  if (kind(ko) !== kind(en)) return void out.push(`${path}: ko 는 ${kind(ko)}, en 은 ${kind(en)}`)
  if (typeof ko === 'string') {
    if (names(ko) !== names(en as string)) out.push(`${path}: 자리표시자 ko {${names(ko)}} · en {${names(en as string)}}`)
    return
  }
  // 배열(인사말 모음 등)은 길이가 달라도 된다 — 칸마다 글자인지만 본다
  if (Array.isArray(ko)) {
    ;(en as unknown[]).forEach((v, i) => typeof v !== 'string' && out.push(`${path}[${i}]: 글자가 아님`))
    return
  }
  if (kind(ko) !== 'object') return
  const a = ko as Record<string, unknown>
  const b = en as Record<string, unknown>
  for (const k of Object.keys(a)) {
    if (k in b) diff(a[k], b[k], path ? `${path}.${k}` : k, out)
    else out.push(`${path ? `${path}.` : ''}${k}: en 에 없음`)
  }
  for (const k of Object.keys(b)) if (!(k in a)) out.push(`${path ? `${path}.` : ''}${k}: en 에만 있음`)
}

export function checkMessages(ko: unknown, en: unknown) {
  const out: string[] = []
  diff(ko, en, '', out)
  if (out.length) console.warn(`[i18n] en 사전이 ko 와 다른 곳 ${out.length}개\n` + out.join('\n'))
}
