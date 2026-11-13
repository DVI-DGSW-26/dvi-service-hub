import { Fragment, createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { readPref, writePref } from '../lib/theme'
import { en } from './en'
import { ko, type Messages } from './ko'

/**
 * 화면 문구는 모두 여기 사전(ko · en)에서 꺼낸다 — 컴포넌트에 한글을 직접 쓰지 않는다.
 *
 * 문구의 원본은 ko/*.json · en/*.json 이다(SSOT). 사전에는 함수를 두지 않는다.
 *
 *   const { t, f, lang } = useI18n()
 *   t.home.today.title                       // 글자
 *   f(t.schedule.total, { count: 12 })       // 숫자 · 이름은 {자리표시자} 로 — 말마다 어순 · 조사가 달라서 이어 붙이지 않는다
 *
 * 복수형이 갈리는 문구는 { "one": …, "other": … } 로 두고 f 에 count 를 넘긴다(한국어는 둘 다 같게 적는다).
 * en 은 ko 와 모양이 같아야 한다(타입 Messages) — 키가 빠지면 typecheck 에서, 남는 키 · 자리표시자 차이는
 * 개발 서버 콘솔에서 걸린다(check.ts).
 * 서버가 내려줄 내용(공지 · 일정 · 소식 목업)은 사전이 아니라 데이터라 여기 두지 않는다.
 */

export type Lang = 'ko' | 'en'
export type { Messages }

/** 수에 따라 모양이 바뀌는 문구 */
export interface Plural {
  one: string
  other: string
}

export type Vars = Record<string, string | number>

const PLACEHOLDER = /\{(\w+)\}/g

/** '{name} 님' + { name: '지현' } → '지현 님'. 값이 없는 자리는 그대로 둔다 — 빠진 걸 화면에서 알아볼 수 있게 */
export function interpolate(template: string, vars?: Vars) {
  if (!vars) return template
  return template.replace(PLACEHOLDER, (whole, key: string) => (key in vars ? String(vars[key]) : whole))
}

/** interpolate 와 같지만 자리에 요소(굵은 글씨 · 링크 · 스켈레톤)를 끼울 수 있다 */
function interpolateNodes(template: string, vars: Record<string, ReactNode>): ReactNode {
  // split 에 묶음이 있으면 홀수 칸이 자리표시자 이름이다
  return template.split(/\{(\w+)\}/).map((part, i) =>
    i % 2 === 0 ? part : <Fragment key={i}>{part in vars ? vars[part] : `{${part}}`}</Fragment>,
  )
}

/** 언어 고르기 — 이름은 그 말로 적는다(어느 언어 화면에서든 자기 말을 찾을 수 있게) */
export const LANGS: { value: Lang; label: string }[] = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
]

const MESSAGES: Record<Lang, Messages> = { ko, en }
const LOCALE: Record<Lang, string> = { ko: 'ko-KR', en: 'en-US' }
const KEY = 'portal-lang'

interface I18n {
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

const I18nContext = createContext<I18n | null>(null)

// 개발 중에만: en 이 ko 와 어긋난 곳을 콘솔에 알린다 (배포 번들에는 들어가지 않는다)
if (import.meta.env.DEV) void import('./check').then((m) => m.checkMessages(ko, en))

function initialLang(): Lang {
  const saved = readPref(KEY)
  return saved === 'en' || saved === 'ko' ? saved : 'ko'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  // 화면낭독기 발음 · 맞춤법 검사 · 줄바꿈 규칙이 따라오게
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<I18n>(() => {
    const plurals = new Intl.PluralRules(LOCALE[lang])
    const pick = (entry: string | Plural, count = 0) =>
      typeof entry === 'string' ? entry : entry[plurals.select(count) === 'one' ? 'one' : 'other']
    return {
      lang,
      locale: LOCALE[lang],
      t: MESSAGES[lang],
      f: (entry, vars) => interpolate(pick(entry, Number(vars?.count ?? 0)), vars),
      rich: (entry, vars, count) => interpolateNodes(pick(entry, count), vars),
      setLang: (next) => {
        writePref(KEY, next === 'ko' ? null : next)
        setLangState(next)
      },
    }
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>')
  return value
}
