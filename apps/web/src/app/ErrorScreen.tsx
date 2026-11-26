import { Component, type ReactNode } from 'react'

/**
 * 화면 코드가 그리다 죽으면 React 가 화면을 통째로 지워 빈 화면이 된다 — 대신 안내와 새로 고침을 보인다.
 * 모양은 로그인 오류 화면(lib/oidc.ts 의 htmlError) · 앱 오류 화면(apps/mobile/www)과 같다.
 * i18n · 테마 기능이 죽었을 수도 있어 그 기능을 쓰지 않는다 — 문구는 <html lang> 으로 고르고, 색은 전역 CSS 토큰
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? <ErrorScreen /> : this.props.children
  }
}

function ErrorScreen() {
  const en = document.documentElement.lang.startsWith('en')
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 py-6 text-center text-fg break-keep" role="alert">
      <div className="grid max-w-[22rem] justify-items-center">
        <span className="mb-6 grid size-16 place-items-center rounded-[18px] bg-white shadow-[0_2px_8px_oklch(0_0_0/0.12)] ring-1 ring-black/5">
          <img src="/favicon.svg" alt="" width={46} height={46} />
        </span>
        <h1 className="mb-2 text-xl font-bold">{en ? 'Something went wrong' : '문제가 생겼어요'}</h1>
        <p className="mb-7 text-[15px] leading-relaxed text-muted">
          {en ? 'Reloading usually fixes it.' : '새로 고치면 대부분 괜찮아져요.'}
          <br />
          {en ? 'If it keeps happening, let the admin know.' : '계속되면 관리자에게 알려 주세요.'}
        </p>
        <button
          type="button"
          onClick={() => location.reload()}
          className="min-h-12 cursor-pointer rounded-[14px] bg-accent-fill px-7 text-[15px] font-semibold text-white transition-[scale] active:scale-[0.97]"
        >
          {en ? 'Reload' : '새로 고침'}
        </button>
      </div>
    </main>
  )
}
