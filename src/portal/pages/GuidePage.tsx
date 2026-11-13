import { ChevronDown, CircleHelp, Headset, KeyRound, Search, Star } from 'lucide-react'
import { portalApi } from '../api/portal'
import { Panel } from '../components/ui/Panel'
import { LoadError, SkeletonList } from '../components/ui/Skeleton'
import { useAsync } from '../hooks/useAsync'
import { PageTitle } from '../components/ui/PageTitle'

const STEPS = [
  { icon: KeyRound, title: '회사 계정 하나로', body: '‘회사 계정’ 표시가 있는 서비스는 포털에 로그인한 상태로 바로 열립니다.' },
  { icon: Search, title: '찾고 바로 이동', body: '위쪽 검색칸에 서비스 이름이나 기능을 입력하세요. / 키를 누르면 바로 검색칸으로 갑니다.' },
  { icon: Star, title: '자주 쓰는 서비스는 별표', body: '카드의 별을 누르면 즐겨찾기가 되어 목록 맨 앞에 보입니다.' },
]

export function GuidePage() {
  const { data, loading, error } = useAsync(portalApi.faqs)

  return (
    <>
      <PageTitle title="이용안내" description="DVI Portal 사용법과 자주 묻는 질문입니다." />

      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map(({ icon: I, title, body }, i) => (
          <li key={title} className="glass rounded-3xl p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
                <I className="size-5" aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold text-muted">STEP {i + 1}</span>
            </div>
            <h2 className="mt-3 font-bold">{title}</h2>
            <p className="mt-1 text-sm/relaxed text-muted">{body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="자주 묻는 질문" icon={CircleHelp}>
          {loading ? (
            <SkeletonList rows={4} />
          ) : error ? (
            <LoadError />
          ) : (
            <div className="divide-y divide-line">
              {data?.map((f) => (
                <details key={f.id} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                    {f.question}
                    <ChevronDown className="size-4 flex-none text-muted transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="pb-4 text-sm/relaxed text-muted">{f.answer}</p>
                </details>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="시스템 문의" icon={Headset}>
          <p className="text-sm/relaxed text-muted">계정 · 접속 · 장애 문의는 아래로 연락해 주세요. 근무 시간 중 순서대로 답변드립니다.</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">담당</dt>
              <dd className="font-semibold">관리팀 IT 지원</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">플로우</dt>
              <dd className="font-semibold">#IT-문의 프로젝트</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">운영 시간</dt>
              <dd className="font-semibold">평일 09:00 – 18:00</dd>
            </div>
          </dl>
        </Panel>
      </div>
    </>
  )
}
