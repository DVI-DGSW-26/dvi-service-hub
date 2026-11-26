import account from './ko/account.json'
import calendar from './ko/calendar.json'
import common from './ko/common.json'
import compose from './ko/compose.json'
import home from './ko/home.json'
import info from './ko/info.json'
import layout from './ko/layout.json'
import schedule from './ko/schedule.json'
import systems from './ko/systems.json'
import theme from './ko/theme.json'
import release from './ko/release.json'
import widgets from './ko/widgets.json'
import activity from './ko/greetings/activity.json'
import base from './ko/greetings/base.json'
import date from './ko/greetings/date.json'
import day from './ko/greetings/day.json'
import easter from './ko/greetings/easter.json'
import general from './ko/greetings/general.json'
import season from './ko/greetings/season.json'
import time from './ko/greetings/time.json'
import weather from './ko/greetings/weather.json'

// 인사 카드 문구 — 양이 많아 묶음마다 파일을 나눴다 (features/hero/lib/greetings.ts 가 고른다)
const greetings = { ...base, time, day, season, weather, date, activity, general, easter }

/** 기준 사전. 문구는 JSON 이 원본이고, en 은 이 모양을 그대로 따른다 (shared/i18n/index.ts) */
export const ko = { common, layout, theme, home, schedule, calendar, greetings, systems, info, account, compose, widgets, release }

export type Messages = typeof ko
