import account from './ko/account.json'
import calendar from './ko/calendar.json'
import common from './ko/common.json'
import compose from './ko/compose.json'
import greetings from './ko/greetings.json'
import home from './ko/home.json'
import info from './ko/info.json'
import layout from './ko/layout.json'
import schedule from './ko/schedule.json'
import systems from './ko/systems.json'
import theme from './ko/theme.json'
import release from './ko/release.json'
import widgets from './ko/widgets.json'

/** 기준 사전. 문구는 JSON 이 원본이고, en 은 이 모양을 그대로 따른다 (i18n/index.ts) */
export const ko = { common, layout, theme, home, schedule, calendar, greetings, systems, info, account, compose, widgets, release }

export type Messages = typeof ko
