import type { Messages } from './ko'
import account from './en/account.json'
import calendar from './en/calendar.json'
import common from './en/common.json'
import compose from './en/compose.json'
import home from './en/home.json'
import info from './en/info.json'
import layout from './en/layout.json'
import schedule from './en/schedule.json'
import systems from './en/systems.json'
import theme from './en/theme.json'
import release from './en/release.json'
import widgets from './en/widgets.json'
import activity from './en/greetings/activity.json'
import base from './en/greetings/base.json'
import date from './en/greetings/date.json'
import day from './en/greetings/day.json'
import easter from './en/greetings/easter.json'
import general from './en/greetings/general.json'
import season from './en/greetings/season.json'
import time from './en/greetings/time.json'
import weather from './en/greetings/weather.json'

// 인사 카드 문구 — 양이 많아 묶음마다 파일을 나눴다 (features/hero/lib/greetings.ts 가 고른다)
const greetings = { ...base, time, day, season, weather, date, activity, general, easter }

// 키가 빠지면 여기서 typecheck 가 걸린다. 남는 키 · 자리표시자 차이는 개발 서버가 콘솔에 알린다 (core/check.ts)
export const en: Messages = { common, layout, theme, home, schedule, calendar, greetings, systems, info, account, compose, widgets, release }
