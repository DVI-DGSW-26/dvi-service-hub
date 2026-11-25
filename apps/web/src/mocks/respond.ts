// 목업 응답 · 오류 모양과 입력 검사 도구 — server.ts 와 services.ts 가 같이 쓴다

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly field?: string,
  ) {
    super(message)
  }
}

export type Params = Record<string, string | number | undefined>
export interface Result { status: number; body: unknown }

export const ok = <T>(data: T, message = '성공', status = 200) => ({ status, body: { status, message, data } })
export const done = (message: string) => ({ status: 200, body: { status: 200, message } })
export const bad = (field: string, message: string) => new HttpError(400, 'METHOD_ARGUMENT_NOT_VALID', `${field}: ${message}`, field)

export const blank = (s: unknown) => typeof s !== 'string' || s.trim() === ''

export function requireText(input: Record<string, unknown>, field: string, label: string, max: number, trim = true) {
  const v = input[field]
  if (blank(v)) throw bad(field, `${label}을(를) 입력해 주세요.`)
  const s = trim ? String(v).trim() : String(v)
  if (s.length > max) throw bad(field, `${label}은(는) ${max.toLocaleString()}자 이하로 입력해 주세요.`)
  return s
}
