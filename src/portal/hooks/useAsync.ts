import { useEffect, useState } from 'react'

export interface AsyncState<T> {
  data: T | undefined
  loading: boolean
  error: Error | undefined
}

/** 마운트 때 한 번 불러온다. 화면을 떠난 뒤 도착한 응답은 버린다. */
export function useAsync<T>(load: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, loading: true, error: undefined })

  useEffect(() => {
    let alive = true
    load()
      .then((data) => alive && setState({ data, loading: false, error: undefined }))
      .catch((error: Error) => alive && setState({ data: undefined, loading: false, error }))
    return () => {
      alive = false
    }
    // load 는 portalApi 의 고정 함수라 다시 부를 일이 없다
  }, [])

  return state
}
