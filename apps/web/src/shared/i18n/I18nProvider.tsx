import { useEffect, useState, type ReactNode } from 'react'
import { KEYS, readPref, writePref } from '@/shared/lib'
import { I18nContext } from './context'
import { en, interpolate, ko, LOCALE, pickPlural, type Lang, type Messages, type Plural } from '@dvi/core/i18n'
import { interpolateNodes } from './interpolate'
import type { I18n } from './types'

const MESSAGES: Record<Lang, Messages> = { ko, en }

function initialLang(): Lang {
  const saved = readPref(KEYS.lang)
  return saved === 'en' || saved === 'ko' ? saved : 'ko'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  // 화면낭독기 발음 · 맞춤법 검사 · 줄바꿈 규칙이 따라오게
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const pick = (entry: string | Plural, count = 0) => pickPlural(entry, LOCALE[lang], count)
  const value: I18n = {
    lang,
    locale: LOCALE[lang],
    t: MESSAGES[lang],
    f: (entry, vars) => interpolate(pick(entry, Number(vars?.count ?? 0)), vars),
    rich: (entry, vars, count) => interpolateNodes(pick(entry, count), vars),
    setLang: (next) => {
      writePref(KEYS.lang, next === 'ko' ? null : next)
      setLangState(next)
    },
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
