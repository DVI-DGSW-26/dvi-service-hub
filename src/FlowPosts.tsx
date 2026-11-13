/**
 * 플로우 "대외업무 공유방"의 최근 글.
 *
 * 글은 로그인한 본인의 플로우 계정 기준으로 온다 — 사람마다 읽음 표시가 다르다.
 * 누르면 그 방이 본인 계정으로 플로우에서 열린다. 플로우가 주는 링크가 프로젝트 단위라
 * 글 하나가 아니라 방이 열린다.
 *
 * 허브의 본래 일은 서비스 목록이다. 플로우 연동이 꺼져 있거나 서버가 응답하지 않으면
 * 이 영역을 아예 그리지 않는다. 본인이 고칠 수 있는 사유만 한 줄로 알려준다.
 */
import { useEffect, useState } from 'react'
import { ApiError, FLOW_OPEN_URL, fetchFlowPosts, type FlowPost } from './api'

const PAGE_SIZE = 5

const TYPE_LABEL: Record<FlowPost['type'], string> = {
  post: '글',
  task: '업무',
  schedule: '일정',
  todo: '할일',
  other: '글',
}

/** 본인이 알아야 하는 사유. 여기 없는 오류(미설정·장애)는 영역을 숨긴다 */
const NOTICE: Record<string, string> = {
  FLOW_ACCOUNT_UNKNOWN: '회사 메일로 로그인한 계정에서만 볼 수 있습니다.',
  FLOW_FORBIDDEN: '플로우에서 이 방의 참여자가 아니어서 글을 볼 수 없습니다.',
  FLOW_PROJECT_NOT_FOUND: '플로우에서 본인 계정이나 이 방을 찾지 못했습니다.',
}

/** 오늘 쓴 글은 시각, 올해 글은 월·일, 그 전 글은 연도까지 */
function when(iso: string | undefined, now: Date): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const md = `${d.getMonth() + 1}월 ${d.getDate()}일`
  return d.getFullYear() === now.getFullYear() ? md : `${d.getFullYear()}년 ${md}`
}

export default function FlowPosts() {
  const [posts, setPosts] = useState<FlowPost[] | null>(null)
  const [title, setTitle] = useState('대외업무 공유방')
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [notice, setNotice] = useState('')
  const [hidden, setHidden] = useState(false)

  const load = (cursor: number) =>
    fetchFlowPosts(cursor, PAGE_SIZE).then((page) => {
      setPosts((current) => {
        const seen = new Set((current ?? []).map((p) => p.id))
        // 페이지를 넘기는 사이 새 글이 올라오면 같은 글이 다음 페이지에 다시 나온다
        return [...(current ?? []), ...page.posts.filter((p) => !seen.has(p.id))]
      })
      if (page.projectTitle) setTitle(page.projectTitle)
      setNextCursor(page.hasNext && page.nextCursor != null ? page.nextCursor : null)
    })

  useEffect(() => {
    let cancelled = false
    load(0).catch((e) => {
      if (cancelled) return
      const known = e instanceof ApiError && e.code ? NOTICE[e.code] : undefined
      if (known) setNotice(known)
      else setHidden(true)
    })
    return () => { cancelled = true }
  }, [])

  if (hidden || (posts === null && !notice)) return null

  const more = () => {
    if (nextCursor === null) return
    setLoadingMore(true)
    load(nextCursor)
      .catch(() => setNextCursor(null))
      .finally(() => setLoadingMore(false))
  }

  const now = new Date()

  return (
    <section className="flow" aria-label={title}>
      <div className="flow-head">
        <h2>
          {title} <span className="tag">플로우</span>
        </h2>
        {!notice && (
          <a className="flow-open" href={FLOW_OPEN_URL} target="_blank" rel="noreferrer">
            플로우에서 열기 ↗
          </a>
        )}
      </div>

      {notice ? (
        <p className="notice">{notice}</p>
      ) : posts && posts.length === 0 ? (
        <p className="empty">아직 올라온 글이 없습니다.</p>
      ) : (
        <>
          <ul className="flow-list">
            {posts?.map((p) => (
              <li key={p.id}>
                {/* 글마다 같은 주소다 — 플로우가 글 단위 링크를 주지 않아 방이 열린다 */}
                <a
                  className={p.read === false ? 'flow-item unread' : 'flow-item'}
                  href={FLOW_OPEN_URL}
                  target="_blank"
                  rel="noreferrer"
                  title="플로우에서 이 방 열기"
                >
                  <span className="flow-type">{TYPE_LABEL[p.type] ?? '글'}</span>
                  <span className="flow-body">
                    <span className="flow-title">
                      {p.read === false && <span className="flow-dot" aria-label="안 읽음" />}
                      {p.title || p.content || '(제목 없음)'}
                    </span>
                    {p.title && p.content && <span className="flow-snippet">{p.content}</span>}
                  </span>
                  <span className="flow-meta">
                    {p.author}
                    {p.commentCount > 0 && ` · 댓글 ${p.commentCount}`}
                    <time dateTime={p.registeredAt}>{when(p.registeredAt, now)}</time>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {nextCursor !== null && (
            <button type="button" className="btn flow-more" onClick={more} disabled={loadingMore}>
              {loadingMore ? '불러오는 중…' : '더 보기'}
            </button>
          )}
        </>
      )}
    </section>
  )
}
