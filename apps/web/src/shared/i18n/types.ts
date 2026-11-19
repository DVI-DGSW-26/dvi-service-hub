import type { ReactNode } from 'react'
import type { Lang, Messages, Plural, Vars } from '@dvi/core/i18n'

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
