import { defineConfig } from 'vite'

/**
 * switcher.js 전용 빌드 — 다른 사이트가 <script> 한 줄로 불러가는 파일.
 * 허브 화면 빌드(vite.config.ts)가 끝난 뒤 같은 dist/ 에 파일 하나를 더 넣는다.
 * 모듈(type="module")이 아닌 일반 스크립트로 불러도 돌도록 IIFE 로 묶는다.
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false, // 허브 화면 빌드 결과를 지우지 않는다
    copyPublicDir: false,
    lib: {
      entry: 'src/switcher/index.ts',
      formats: ['iife'],
      name: 'DviSwitcher',
      fileName: () => 'switcher.js',
    },
  },
})
