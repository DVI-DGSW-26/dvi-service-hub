// typescript-eslint 는 TS 7(네이티브)의 컴파일러 API 를 못 쓴다 — lint 쪽 패키지에만 TS 5.9 를 물린다. 빌드 · tsc 는 7 그대로
const LINT_TS = /^(@typescript-eslint\/|typescript-eslint$|ts-api-utils$)/

module.exports = {
  hooks: {
    readPackage(pkg) {
      if (LINT_TS.test(pkg.name) && pkg.peerDependencies?.typescript) {
        delete pkg.peerDependencies.typescript
        pkg.dependencies = { ...pkg.dependencies, typescript: '5.9.3' }
      }
      return pkg
    },
  },
}
