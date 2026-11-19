import { en, interpolate, ko, LOCALE, type Lang, type Vars } from '@dvi/core/i18n'

// 웹과 같은 사전(@dvi/core/i18n) — 기기 언어가 한국어면 ko, 아니면 en.
// shortcut: 앱 안에서 언어를 바꾸는 설정은 없다, 웹처럼 바꾸게 하려면 저장소(expo-secure-store 등)와 Context 로 올린다
export const lang: Lang = Intl.DateTimeFormat().resolvedOptions().locale.startsWith('ko') ? 'ko' : 'en'
export const locale = LOCALE[lang]
export const t = lang === 'ko' ? ko : en
export const f = (text: string, vars: Vars) => interpolate(text, vars)
