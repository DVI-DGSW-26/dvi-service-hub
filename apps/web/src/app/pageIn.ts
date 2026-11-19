import type { CSSProperties } from 'react'

/** 화면을 옮기면 main 을 새로 그려 옮긴 방향에서 밀려 들어온다(styles/layout.css 의 .page-in) */
export const pageIn = (dir: number | undefined) =>
  dir ? { className: 'page-in', style: { '--dir': Math.sign(dir) } as CSSProperties } : { className: '', style: undefined }
