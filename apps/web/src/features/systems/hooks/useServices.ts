import { useQuery } from '@tanstack/react-query'
import { serviceQueries } from '../api/queries'
import { services as bundled } from '../lib/services'

/**
 * 서비스 목록 — 허브 서버(서비스 관리 화면에서 고친 것). 서버가 응답하지 않거나 모양이 틀리면 내장 목록(services.ts)으로 연다.
 * 받는 중에는 빈 목록과 loading — 내장 목록을 먼저 그렸다가 바꾸면 카드가 들썩인다
 */
export function useServices() {
  const { data, isError } = useQuery(serviceQueries.list())
  return { services: data ?? (isError ? bundled : []), loading: !data && !isError }
}
