import type { Messages } from '../ko'
import account from './account.json'
import common from './common.json'
import greetings from './greetings.json'
import guide from './guide.json'
import home from './home.json'
import info from './info.json'
import layout from './layout.json'
import schedule from './schedule.json'
import systems from './systems.json'
import theme from './theme.json'

// 키가 빠지면 여기서 typecheck 가 걸린다. 남는 키 · 자리표시자 차이는 개발 서버가 콘솔에 알린다 (check.ts)
export const en: Messages = { common, layout, theme, home, schedule, greetings, systems, info, guide, account }
