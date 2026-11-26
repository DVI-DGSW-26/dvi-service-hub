import { KEYS, readPref, writePref } from '@/shared/lib'

/**
 * 인사 문구를 고를 때 쓰는 이 사람의 상황 — 방문 기록 · 날씨. 둘 다 이 브라우저에만 남긴다.
 * 화면을 열 때 남아 있는 값으로 고르고(readGreetingContext), 새 값은 그 뒤에 적는다(noteGreetingVisit) —
 * 날씨가 늦게 와도 보던 인사가 바뀌지 않는다. 새 날씨는 다음에 열 때 쓰인다.
 */
export type Visit = 'firstVisit' | 'firstLoginToday' | 'returnVisit' | 'longAbsence' | 'longSession'
export type Weather = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'hot' | 'cold' | 'dusty'
export interface GreetingContext {
  visit?: Visit
  weather: Weather[]
}

/** 이만큼 안 왔으면 '오랜만이에요' */
const LONG_ABSENCE_MS = 14 * 86_400_000
/** 한 탭을 이만큼 켜 두었으면 '잠시 쉬어 가세요' */
const LONG_SESSION_MS = 3 * 3_600_000
const SESSION_KEY = 'hub:greet-session-start'
/** 허브가 로그인할 때 적는 세션 만료 시각(shared/api/session.ts) — 있으면 이 기록이 생기기 전부터 쓰던 사람이다 */
const SEEN_KEY = 'hub:session-exp'
/** 날씨는 한 시간에 한 번만 받는다 */
const WEATHER_TTL_MS = 3_600_000

/**
 * 날씨를 볼 곳(위도,경도) — VITE_WEATHER_AT 로 바꾼다. 기본은 서울.
 * shortcut: 회사 한 곳의 날씨다, 사업장마다 다르게 하려면 부서 · 사업장 정보가 생긴 뒤 사람마다 고른다
 */
const WEATHER_AT = (import.meta.env.VITE_WEATHER_AT as string | undefined) ?? '37.5665,126.9780'

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

function readJson(key: string): unknown {
  try {
    return JSON.parse(readPref(key) ?? 'null')
  } catch {
    return null
  }
}

function sessionStart(now: number): number {
  try {
    const saved = Number(sessionStorage.getItem(SESSION_KEY))
    if (saved) return saved
    sessionStorage.setItem(SESSION_KEY, String(now))
  } catch {
    /* 저장소를 못 쓰면 오래 켜 둔 것을 모를 뿐 */
  }
  return now
}

export function readGreetingContext(now: Date): GreetingContext {
  const last = readJson(KEYS.greetVisit) as number | null
  const visit: Visit = !last
    ? readPref(SEEN_KEY) === null ? 'firstVisit' : 'firstLoginToday'
    : now.getTime() - last > LONG_ABSENCE_MS
      ? 'longAbsence'
      : !sameDay(new Date(last), now)
        ? 'firstLoginToday'
        : now.getTime() - sessionStart(now.getTime()) > LONG_SESSION_MS
          ? 'longSession'
          : 'returnVisit'
  return { visit, weather: (readJson(KEYS.greetWeather) as { kinds: Weather[] } | null)?.kinds ?? [] }
}

/** 이번 방문을 적고, 날씨가 오래됐으면 새로 받아 둔다 */
export function noteGreetingVisit() {
  writePref(KEYS.greetVisit, String(Date.now()))
  const saved = readJson(KEYS.greetWeather) as { at: number } | null
  if (!saved || Date.now() - saved.at > WEATHER_TTL_MS) void fetchWeather()
}

/** Open-Meteo(키 없이 쓰는 공개 날씨 API) — 지금 하늘 · 기온 · 미세먼지(PM10) */
async function fetchWeather() {
  const [lat, lon] = WEATHER_AT.split(',')
  try {
    const [sky, air] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m`).then((r) => r.json()),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10`).then((r) => r.json()),
    ]) as [{ current?: { weather_code?: number; temperature_2m?: number } }, { current?: { pm10?: number } }]
    writePref(KEYS.greetWeather, JSON.stringify({ at: Date.now(), kinds: weatherKinds(sky.current?.weather_code, sky.current?.temperature_2m, air.current?.pm10) }))
  } catch {
    /* 날씨를 못 받으면 날씨 인사만 빠진다 */
  }
}

/** WMO 날씨 코드 · 기온 · PM10 을 인사 묶음으로. PM10 81 이상은 환경부 기준 '나쁨' */
export function weatherKinds(code?: number, temp?: number, pm10?: number): Weather[] {
  const kinds: Weather[] = []
  if (code !== undefined) {
    if (code <= 1) kinds.push('sunny')
    else if (code <= 48) kinds.push('cloudy')
    else if ((code >= 71 && code <= 77) || code === 85 || code === 86) kinds.push('snowy')
    else kinds.push('rainy')
  }
  if (temp !== undefined && temp >= 30) kinds.push('hot')
  if (temp !== undefined && temp <= -5) kinds.push('cold')
  if (pm10 !== undefined && pm10 > 80) kinds.push('dusty')
  return kinds
}
