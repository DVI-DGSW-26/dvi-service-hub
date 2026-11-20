import type { Messages } from './ko'
import account from './en/account.json'
import calendar from './en/calendar.json'
import common from './en/common.json'
import compose from './en/compose.json'
import greetings from './en/greetings.json'
import home from './en/home.json'
import info from './en/info.json'
import layout from './en/layout.json'
import schedule from './en/schedule.json'
import systems from './en/systems.json'
import theme from './en/theme.json'
import widgets from './en/widgets.json'

// 키가 빠지면 여기서 typecheck 가 걸린다. 남는 키 · 자리표시자 차이는 개발 서버가 콘솔에 알린다 (check.ts)
export const en: Messages = { common, layout, theme, home, schedule, calendar, greetings, systems, info, account, compose, widgets }
