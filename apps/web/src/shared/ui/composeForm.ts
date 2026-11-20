import {  useState } from 'react'
import { isApiError } from '@/shared/api'
import { useI18n } from '@/shared/i18n'

/** 서버가 받는 주소 — http:// · https:// 로 시작 (명세 2.2 · 3.2) */
export const isHttpUrl = (url: string) => /^https?:\/\/\S+$/i.test(url)

/**
 * 등록 실패를 화면 문구로. 서버가 칸을 짚었으면(400, field) 그 칸 아래에 서버 문구를 두고,
 * 아래 줄에는 무엇을 하면 되는지만 — 권한 없음 · 다시 로그인 · 그 밖의 실패.
 */
export function useSubmitError() {
  const { t } = useI18n()
  const [error, setError] = useState<unknown>()
  const api = isApiError(error) ? error : undefined
  const message =
    error === undefined
      ? undefined
      : api?.field
        ? t.compose.checkFields
        : api?.status === 403
          ? t.compose.forbidden
          : api?.status === 401
            ? t.compose.signedOut
            : t.compose.error
  return {
    message,
    /** 서버가 이 칸을 거절했으면 그 문구 */
    field: (key: string) => (api?.field === key ? api.fieldMessage : undefined),
    set: setError,
    reset: () => setError(undefined),
  }
}

/** 작성 폼 상태. 새로 열 때마다 처음 값 — 부르는 쪽이 key 로 다시 그린다(useLazyModal) */
export function useComposeForm<F extends object>(initial: () => F) {
  const [form, setForm] = useState(initial)
  // 한 번 등록을 눌러 본 뒤에만 빠진 칸을 빨갛게 — 열자마자 혼내지 않는다
  const [tried, setTried] = useState(false)
  const submitError = useSubmitError()
  return {
    form,
    set: <K extends keyof F>(key: K, value: F[K]) => setForm((f) => ({ ...f, [key]: value })),
    /** 등록 실패 문구 (ComposeModal error) */
    error: submitError.message,
    /** 칸 아래 문구 — 칸 검사를 지나 서버가 거절한 칸이면(field) 서버 문구 */
    shown: (errors: Partial<Record<string, string>>, key: string) => (tried ? errors[key] : undefined) ?? submitError.field(key),
    /** 칸 검사에 걸렸으면 멈추고, 아니면 보낸다 */
    async submit(invalid: boolean, send: () => Promise<unknown>) {
      setTried(true)
      if (invalid) return
      submitError.reset()
      try {
        await send()
      } catch (e) {
        submitError.set(e)
      }
    },
  }
}
