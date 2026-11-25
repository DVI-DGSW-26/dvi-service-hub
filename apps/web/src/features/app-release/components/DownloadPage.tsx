import { useEffect, useState } from 'react'
import { ArrowLeft, Download, Info } from 'lucide-react'
import { useI18n } from '@/shared/i18n'
import { Badge, Skeleton } from '@/shared/ui'
import { APK_URL, fetchReleases, type Release } from '../lib/releases'

const android = /android/i.test(navigator.userAgent)
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)}MB`

/**
 * 앱 받기 페이지(/app/) — 주소로 바로 파일이 받아지지 않게, 버전 · 설치 방법을 보고 다운로드를 눌러 받는다.
 * 허브와 같이 로그인 뒤에 있다(middleware). 업데이트 기록은 pnpm release 가 남긴 releases.json 이다
 */
export function DownloadPage() {
  const { t, f, locale } = useI18n()
  const d = t.release.download
  const [releases, setReleases] = useState<Release[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    fetchReleases().then(setReleases, () => setFailed(true))
  }, [])

  const latest = releases?.[0]
  const date = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="mx-auto max-w-xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10">
      <a href="/" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {d.back}
      </a>

      <main className="mt-3 space-y-4">
        <section className="glass rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <img src="/icons/icon-maskable-512.png" alt="" className="size-18 flex-none rounded-2xl shadow-sm ring-1 ring-line" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-[-0.025em]">{d.appName}</h1>
              <p className="mt-1 text-[15px] text-muted">{d.tagline}</p>
            </div>
          </div>

          <div className="mt-5 flex min-h-7 flex-wrap items-center gap-2 text-sm text-muted">
            <Badge tone="accent">{d.platform}</Badge>
            {latest ? (
              <span>
                {f(d.version, { version: latest.versionName })} · {mb(latest.size)} · {f(d.released, { date: date(latest.date) })}
              </span>
            ) : (
              !failed && <Skeleton className="h-5 w-48 rounded-md" />
            )}
          </div>

          {latest ? (
            <a
              href={APK_URL}
              download
              className="mt-5 flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-accent-fill text-base font-bold text-white transition-[scale] active:scale-[0.98]"
            >
              <Download className="size-5" aria-hidden="true" />
              {d.action}
            </a>
          ) : failed ? (
            <p className="mt-5 text-sm text-muted">{d.loadError}</p>
          ) : (
            <Skeleton className="mt-5 h-13 rounded-2xl" />
          )}

          {(window.Capacitor !== undefined || !android) && (
            <p className="mt-4 flex gap-2.5 rounded-2xl bg-subtle px-4 py-3 text-sm text-muted">
              <Info className="mt-0.5 size-4 flex-none text-accent" aria-hidden="true" />
              {window.Capacitor ? d.inApp : d.notAndroid}
            </p>
          )}
        </section>

        <section className="glass rounded-3xl p-6" aria-labelledby="how">
          <h2 id="how" className="text-lg font-bold">
            {d.howTitle}
          </h2>
          <ol className="mt-4 space-y-3">
            {d.steps.map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-[15px]">
                <span className="grid size-7 flex-none place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent">{i + 1}</span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-line pt-4 text-sm text-muted">{d.howNote}</p>
        </section>

        <section className="glass rounded-3xl p-6" aria-labelledby="history">
          <h2 id="history" className="text-lg font-bold">
            {d.historyTitle}
          </h2>
          {releases ? (
            releases.length ? (
              <ol className="mt-4 divide-y divide-line">
                {releases.map((r, i) => (
                  <li key={r.versionCode} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{r.versionName}</span>
                      {i === 0 && <Badge tone="ok">{d.latest}</Badge>}
                      <span className="ml-auto text-sm text-muted">{date(r.date)}</span>
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-muted marker:text-line">
                      {r.notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm text-muted">{d.empty}</p>
            )
          ) : failed ? (
            <p className="mt-4 text-sm text-muted">{d.loadError}</p>
          ) : (
            <div className="mt-4 space-y-2.5">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-2/3 rounded-md" />
            </div>
          )}
        </section>
      </main>

      <footer className="mt-8 text-center text-xs text-muted">© DVISION · DVI Portal</footer>
    </div>
  )
}
