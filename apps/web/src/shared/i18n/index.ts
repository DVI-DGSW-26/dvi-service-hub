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
export { useI18n } from './context'
export { I18nProvider } from './I18nProvider'
export { LANGS, LOCALE, interpolate } from '@dvi/core/i18n'
export type { Lang, Messages, Plural, Vars } from '@dvi/core/i18n'
