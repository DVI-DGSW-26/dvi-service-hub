import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, MessagesSquare } from 'lucide-react'
import { isApiError } from '@/shared/api'
import { useI18n, type Lang } from '@/shared/i18n'
import { clockTime, formatDate, monthDay } from '@/shared/format'
import { toIso } from '@/shared/lib'
import { isMini, type StackSize } from '@/shared/widget'
import { LoadError, MiniPanel, PANEL_LINK, Panel, SMALL_BODY, SkeletonList, SmallPanel, Skeleton, SourceTag } from '@/shared/ui'
import { FLOW_OPEN_URL, type FlowPost } from '../api/flow'
import { flowQueries } from '../api/queries'

/** 본인이 고칠 수 있는 사유 — 나머지(연동 미설정 · 장애)는 불러오지 못했다고만 */
const NOTICE = ['FLOW_ACCOUNT_UNKNOWN', 'FLOW_FORBIDDEN', 'FLOW_PROJECT_NOT_FOUND'] as const

/** 오늘 글은 시각, 올해 글은 월 · 일, 그 전 글은 연도까지 */
function when(at: string | undefined, lang: Lang) {
  if (!at) return ''
  const date = at.slice(0, 10)
  const today = toIso(new Date())
  if (date === today) return clockTime(at.slice(11, 16), lang)
  return date.slice(0, 4) === today.slice(0, 4) ? monthDay(date, lang) : formatDate(date, lang)
}

/**
 * 플로우 '대외업무 공유방'의 최근 글 — 로그인한 본인의 플로우 계정 기준이라 사람마다 읽음 표시가 다르다.
 * 누르면 그 방이 본인 계정으로 플로우에서 열린다(새 탭).
 */
export function FlowPanel({ size, className = '' }: { size?: StackSize; className?: string }) {
  const { t, f, lang } = useI18n()
  const c = t.home.flow
  const { data, isPending: loading, error } = useQuery(flowQueries.posts())
  const posts = data?.posts ?? []
  const title = data?.projectTitle ?? c.title
  const unread = posts.filter((p) => p.read === false).length
  const code = isApiError(error) ? error.code : undefined
  const notice = NOTICE.find((n) => n === code)
  const failed = error && (notice ? <p className="text-[13px] text-muted break-keep">{c.notice[notice]}</p> : <LoadError error={error} className="text-sm" />)
  const top = posts.at(0)
  const open = () => window.open(FLOW_OPEN_URL, '_blank', 'noopener')

  if (isMini(size)) {
    return <MiniPanel size={size} title={title} icon={MessagesSquare} value={loading || error ? undefined : unread || undefined} detail={top ? postTitle(top) : undefined} onClick={open} className={className} />
  }

  if (size === 's' || size === 'w') {
    return (
      <SmallPanel title={title} icon={MessagesSquare} className={className}>
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          (failed ??
          (top ? (
            <a href={FLOW_OPEN_URL} target="_blank" rel="noreferrer" className={SMALL_BODY}>
              <span className="line-clamp-2 text-sm font-semibold break-keep">{postTitle(top)}</span>
              <span className="mt-auto pt-1 text-[13px] text-muted">
                {top.author} · {when(top.registeredAt, lang)}
              </span>
            </a>
          ) : (
            <p className="text-[13px] text-muted">{c.empty}</p>
          )))
        )}
      </SmallPanel>
    )
  }

  return (
    <Panel
      title={title}
      icon={MessagesSquare}
      meta={<SourceTag>{c.source}</SourceTag>}
      toolbar={
        !error && (
          <a href={FLOW_OPEN_URL} target="_blank" rel="noreferrer" className={PANEL_LINK}>
            {c.open}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        )
      }
      className={className}
    >
      {loading ? (
        <SkeletonList rows={4} className="h-12" />
      ) : (
        (failed ??
        (posts.length === 0 ? (
          <p className="py-4 text-sm text-muted">{c.empty}</p>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-line overflow-hidden">
            {posts.map((p) => (
              <li key={p.id}>
                {/* 글마다 같은 주소다 — 플로우가 글 단위 링크를 주지 않아 방이 열린다 */}
                <a href={FLOW_OPEN_URL} target="_blank" rel="noreferrer" className="group flex items-start gap-3 py-2.5">
                  <span className="mt-0.5 flex-none rounded-md bg-subtle px-1.5 py-px text-xs text-muted ring-1 ring-line">{c.type[p.type]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      {p.read === false && <span className="size-2 flex-none rounded-full bg-accent-fill" role="img" aria-label={c.unread} />}
                      <span className={`truncate text-[15px] group-hover:text-accent ${p.read === false ? 'font-bold' : 'font-semibold'}`}>{postTitle(p) || c.untitled}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-muted">
                      {p.author}
                      {p.commentCount > 0 && ` · ${f(c.comments, { count: p.commentCount })}`}
                    </span>
                  </span>
                  <time dateTime={p.registeredAt} className="flex-none text-[13px] text-muted tabular-nums">
                    {when(p.registeredAt, lang)}
                  </time>
                </a>
              </li>
            ))}
          </ul>
        )))
      )}
    </Panel>
  )
}

const postTitle = (p: FlowPost) => p.title || p.content
