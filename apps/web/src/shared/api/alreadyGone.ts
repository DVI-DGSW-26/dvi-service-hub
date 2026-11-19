import { isApiError } from './errors'

/** 같은 글을 다른 사람이 먼저(또는 동시에) 지웠으면 404 가 온다 (명세 2.3 · 3.3) — 지우려던 결과는 같으니 성공으로 */
export const alreadyGone = (e: unknown) => {
  if (isApiError(e) && e.status === 404) return
  throw e
}
