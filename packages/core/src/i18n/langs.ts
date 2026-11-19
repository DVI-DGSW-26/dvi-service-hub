export type Lang = 'ko' | 'en'

/** 언어 고르기 — 이름은 그 말로 적는다(어느 언어 화면에서든 자기 말을 찾을 수 있게) */
export const LANGS: { value: Lang; label: string }[] = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
]

export const LOCALE: Record<Lang, string> = { ko: 'ko-KR', en: 'en-US' }
