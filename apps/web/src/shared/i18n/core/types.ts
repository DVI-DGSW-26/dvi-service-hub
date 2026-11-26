import type { ReactNode } from 'react'
import type { Messages } from '../messages/ko'

export type Lang = 'ko' | 'en'

/** 수에 따라 모양이 바뀌는 문구 */
export interface Plural {
  one: string
  other: string
}

export type Vars = Record<string, string | number>

export interface I18n {
  lang: Lang
  /** Intl 에 넘길 로캘 (ko-KR · en-US) */
  locale: string
  t: Messages
  /** 자리표시자 채우기. Plural 이면 vars.count 로 one/other 를 고른다 */
  f: (entry: string | Plural, vars?: Vars) => string
  /** f 의 요소판 — 문장 가운데 요소를 끼울 때. 복수형은 count 로 고른다(vars.count 가 요소일 수 있어서 따로 받는다) */
  rich: (entry: string | Plural, vars: Record<string, ReactNode>, count?: number) => ReactNode
  setLang: (lang: Lang) => void
}
