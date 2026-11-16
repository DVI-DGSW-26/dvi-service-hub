import { useEffect, useState } from 'react'
import { onChange } from '../api/portal'

export interface AsyncState<T> {
  data: T | undefined
  loading: boolean
  error: Error | undefined
}

/**
 * 마운트 때 한 번 불러온다. 화면을 떠난 뒤 도착한 응답은 버린다.
 * watch 를 주면 그 데이터에 글이 써질 때(portalApi.create…) 다시 불러온다 — 받는 동안에도 앞의 내용을 그대로 둔다.
 */
export function useAsync<T>(load: () => Promise<T>, watch?: string): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, loading: true, error: undefined })

  useEffect(() => {
    let alive = true
    const run = () =>
      load()
        .then((data) => alive && setState({ data, loading: false, error: undefined }))
        .catch((error: Error) => alive && setState({ data: undefined, loading: false, error }))
    run()
    const off = watch ? onChange(watch, run) : undefined
    return () => {
      alive = false
      off?.()
    }
    // load 는 portalApi 의 고정 함수라 다시 부를 일이 없다
  }, [])

  return state
}
