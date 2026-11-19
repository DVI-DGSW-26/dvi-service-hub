/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 목업 API 로 띄우는지 — pnpm dev:mock 과 Vercel preview 배포 (vite.config.ts 가 정한다) */
  readonly VITE_MOCK: boolean
  /** API 로그 단계 — silent · error · info · debug */
  readonly VITE_API_LOG?: string
}
