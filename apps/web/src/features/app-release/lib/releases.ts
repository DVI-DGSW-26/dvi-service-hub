/** 허브에 올린 앱 버전 하나 — apps/mobile 의 pnpm release 가 public/app/releases.json 맨 앞에 넣는다 */
export interface Release {
  versionCode: number
  versionName: string
  /** YYYY-MM-DD */
  date: string
  /** APK 크기(바이트) */
  size: number
  notes: string[]
}

/** 늘 최신 버전 하나만 이 주소에 둔다 — 지난 APK 는 기록(releases.json)만 남는다 */
export const APK_URL = '/app/dvi-service-hub.apk'

/** 최신이 맨 앞. 로그인이 풀렸거나 아직 올린 것이 없으면 실패한다 */
export async function fetchReleases(): Promise<Release[]> {
  const res = await fetch('/app/releases.json', { cache: 'no-store' })
  if (!res.ok) throw new Error(`releases.json ${res.status}`)
  return (await res.json()) as Release[]
}
