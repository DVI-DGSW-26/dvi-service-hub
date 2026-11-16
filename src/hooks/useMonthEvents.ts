import { useEffect, useState } from 'react'
import { onChange, portalApi } from '../api/portal'
import type { CalendarEvent } from '../types/portal'
import type { AsyncState } from './useAsync'

/**
 * 한 달치 회사 캘린더('YYYY-MM'). 달이 바뀌면 다시 받는다 — 같은 달은 portalApi 가 한 번만 요청한다.
 * 일정을 등록 · 삭제하면 다시 받되, 받는 동안은 보던 일정을 그대로 둔다.
 */
export function useMonthEvents(month: string): AsyncState<CalendarEvent[]> {
  const [state, setState] = useState<AsyncState<CalendarEvent[]> & { month: string }>({
    month,
    data: undefined,
    loading: true,
    error: undefined,
  })

  const [version, setVersion] = useState(0)
  useEffect(() => onChange('calendar', () => setVersion((v) => v + 1)), [])

  useEffect(() => {
    let alive = true
    portalApi
      .calendar(month)
      .then((data) => alive && setState({ month, data, loading: false, error: undefined }))
      .catch((error: Error) => alive && setState({ month, data: undefined, loading: false, error }))
    return () => {
      alive = false
    }
  }, [month, version])

  // 앞서 보던 달의 응답이 남아 있으면 아직 받는 중으로 본다
  return state.month === month ? state : { data: undefined, loading: true, error: undefined }
}
