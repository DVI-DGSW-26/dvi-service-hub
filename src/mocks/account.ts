// 계정 설정 화면 목업. Keycloak 계정 API(/account/credentials, /account/sessions) 연동 전까지 쓴다.

import type { AccountSecurity } from '../types/portal'

export const accountSecurity: AccountSecurity = {
  password: { changed: '2026-08-21' },
  otp: { registered: true, label: 'Google Authenticator', added: '2026-03-04' },
  passkeys: [
    { id: 'pk-1', name: '업무용 노트북 (Windows Hello)', added: '2026-03-04', lastUsed: '오늘 오전 8:42' },
    { id: 'pk-2', name: 'iPhone 15', added: '2026-06-17', lastUsed: '11월 10일' },
  ],
  sessions: [
    { id: 's-1', device: 'desktop', client: 'Windows · Chrome', place: '사내망 · 본사', lastActive: '지금 사용 중', current: true },
    { id: 's-2', device: 'mobile', client: 'iPhone · Safari', place: '서울', lastActive: '2시간 전', current: false },
    { id: 's-3', device: 'desktop', client: 'macOS · Edge', place: '사내망 · 연구동', lastActive: '어제 오후 6:10', current: false },
  ],
}
