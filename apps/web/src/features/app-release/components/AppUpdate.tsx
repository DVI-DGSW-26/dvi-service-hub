import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { useI18n } from '@/shared/i18n'
import { APK_URL, fetchReleases, type Release } from '../lib/releases'

/**
 * 앱 껍데기의 새 버전 알림 — 허브에 올린 최신 버전(releases.json)이 깔린 앱보다 새로우면 뜬다.
 * 누르면 앱(AppUpdatePlugin)이 받아서 스스로 바꾸고 닫힌다. 웹 브라우저에는 앱 통로(window.Capacitor)가 없어 아무것도 그리지 않는다
 */
export function AppUpdate() {
  const { t, f } = useI18n()
  const [latest, setLatest] = useState<Release | null>(null)
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle')

  useEffect(() => {
    const cap = window.Capacitor
    if (!cap) return
    Promise.all([cap.nativePromise('App', 'getInfo') as Promise<{ build: string }>, fetchReleases()])
      .then(([info, list]) => {
        const v = list.at(0)
        if (v && v.versionCode > Number(info.build)) setLatest(v)
      })
      .catch(() => undefined)
  }, [])

  if (!latest || !window.Capacitor) return null
  const update = () => {
    setState('busy')
    window.Capacitor?.nativePromise('AppUpdate', 'install', { url: new URL(APK_URL, location.href).href }).catch((e: unknown) => {
      // 설치 허용을 켜지 않았거나 확인 창에서 취소했으면 조용히 처음으로
      const code = (e as { code?: string } | null)?.code
      setState(code === 'NO_PERMISSION' || code === 'CANCELLED' ? 'idle' : 'failed')
    })
  }

  return (
    <div className="glass mt-3 flex items-center gap-3 rounded-2xl py-2.5 pr-2.5 pl-4" role="status">
      <Download className="size-5 flex-none text-accent" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm">
        <span className="block font-semibold">{f(t.release.update.available, { version: latest.versionName })}</span>
        <span className="block text-muted">{state === 'failed' ? t.release.update.failed : t.release.update.detail}</span>
      </p>
      <button
        type="button"
        onClick={update}
        disabled={state === 'busy'}
        className="min-h-10 flex-none cursor-pointer rounded-xl bg-accent-fill px-4 text-sm font-semibold text-white transition-[scale,opacity] active:scale-95 disabled:opacity-60"
      >
        {state === 'busy' ? t.release.update.busy : t.release.update.action}
      </button>
    </div>
  )
}
