// 플로우 "대외업무 공유방" 글 — 허브 서버의 기존 API (feat/flow-posts 브랜치에서 옮겼다). 화면은 같은 폴더 queries.ts 를 쓴다

import { hubApi } from '@/shared/api'

interface Opts { signal?: AbortSignal }

/** 공유방의 글 한 건. 로그인한 본인의 플로우 계정 기준이다 */
export interface FlowPost {
  id: string
  /** post 글 · task 업무 · schedule 일정 · todo 할일 */
  type: 'post' | 'task' | 'schedule' | 'todo' | 'other'
  title: string
  content: string
  author: string
  /** 한국 시각, 예: 2026-05-09T09:30 */
  registeredAt?: string
  commentCount: number
  /** 본인이 읽었는지. 플로우가 알려주지 않은 글에는 없다 */
  read?: boolean
}

export interface FlowPostPage {
  projectTitle?: string
  posts: FlowPost[]
  hasNext: boolean
  nextCursor?: number
}

export const flowApi = {
  posts: (cursor: number, pageSize: number, { signal }: Opts = {}) => hubApi.get<FlowPostPage>('/flow/posts', { params: { cursor, pageSize }, signal }),
}

/**
 * 그 방을 본인 계정으로 플로우에서 여는 주소. 서버가 플로우의 본인용 로그인 링크로 넘겨 보낸다(302).
 * axios 로 부르지 않고 링크의 href 로 쓴다 — 브라우저가 따라가야 플로우가 열린다.
 * 플로우가 글 단위 링크를 주지 않아 글을 눌러도 방이 열린다.
 */
export const FLOW_OPEN_URL = '/api/hub/flow/open'
