import { useEffect, useState, type ReactNode } from 'react'
import { KEYS, readPref, writePref } from '@/shared/lib'
import { I18nContext } from './context'
import { en } from '../messages/en'
import { interpolate, interpolateNodes } from './interpolate'
import { ko, type Messages } from '../messages/ko'
import { LOCALE } from './langs'
import type { I18n, Lang, Plural } from './types'

const MESSAGES: Record<Lang, Messages> = { ko, en }

// 개발 중에만: en 이 ko 와 어긋난 곳을 콘솔에 알린다 (배포 번들에는 들어가지 않는다)
if (import.meta.env.DEV) void import('./check').then((m) => m.checkMessages(ko, en))

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

  const plurals = new Intl.PluralRules(LOCALE[lang])
  const pick = (entry: string | Plural, count = 0) =>
    typeof entry === 'string' ? entry : entry[plurals.select(count) === 'one' ? 'one' : 'other']
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
