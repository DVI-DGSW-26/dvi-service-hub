import { ChevronDown, CircleHelp, Headset, KeyRound, Search, Star } from 'lucide-react'
import { portalApi } from '../api/portal'
import { Panel } from '../components/ui/Panel'
import { LoadError, SkeletonList } from '../components/ui/Skeleton'
import { useAsync } from '../hooks/useAsync'
import { useI18n } from '../i18n'
import { PageTitle } from '../components/ui/PageTitle'

/** 글은 사전(t.guide.steps)에 있다 */
const STEPS = [
  { icon: KeyRound, key: 'account' },
  { icon: Search, key: 'search' },
  { icon: Star, key: 'favorite' },
] as const

export function GuidePage() {
  const { t, f } = useI18n()
  const { data, loading, error } = useAsync(portalApi.faqs)

  return (
    <>
      <PageTitle title={t.guide.title} description={t.guide.description} />

      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map(({ icon: I, key }, i) => (
          <li key={key} className="glass rounded-3xl p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
                <I className="size-5" aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold text-muted">{f(t.guide.step, { n: i + 1 })}</span>
            </div>
            <h2 className="mt-3 font-bold">{t.guide.steps[key].title}</h2>
            <p className="mt-1 text-sm/relaxed text-muted">{t.guide.steps[key].body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title={t.guide.faq} icon={CircleHelp}>
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

        <Panel title={t.guide.contact.title} icon={Headset}>
          <p className="text-sm/relaxed text-muted">{t.guide.contact.body}</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t.guide.contact.owner}</dt>
              <dd className="font-semibold">{t.guide.contact.ownerValue}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t.guide.contact.flow}</dt>
              <dd className="font-semibold">{t.guide.contact.flowValue}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t.guide.contact.hours}</dt>
              <dd className="font-semibold">{t.guide.contact.hoursValue}</dd>
            </div>
          </dl>
        </Panel>
      </div>
    </>
  )
}
