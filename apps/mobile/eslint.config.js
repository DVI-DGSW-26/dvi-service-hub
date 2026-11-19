// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/*'] },
  // 웹 · core 와 같은 파일 길이 한도(docs/adr/0002)
  { files: ['src/**/*.{ts,tsx}'], rules: { 'max-lines': ['error', 400] } },
])
