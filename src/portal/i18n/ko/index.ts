import account from './account.json'
import calendar from './calendar.json'
import common from './common.json'
import compose from './compose.json'
import greetings from './greetings.json'
import home from './home.json'
import info from './info.json'
import layout from './layout.json'
import schedule from './schedule.json'
import systems from './systems.json'
import theme from './theme.json'

/** 기준 사전. 문구는 JSON 이 원본이고, en 은 이 모양을 그대로 따른다 (i18n/index.tsx) */
export const ko = { common, layout, theme, home, schedule, calendar, greetings, systems, info, account, compose }

export type Messages = typeof ko
