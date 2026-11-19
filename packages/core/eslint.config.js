// 공용 패키지 — 플랫폼(DOM · React · RN)을 몰라야 한다
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  { languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } } },
  { files: ['**/*.js'], ...tseslint.configs.disableTypeChecked },
  {
    files: ['src/**/*.ts'],
    rules: {
      'max-lines': ['error', { max: 400 }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'no-restricted-imports': ['error', { patterns: [{ regex: '^(react|react-dom|react-native)(/|$)', message: '공용 패키지는 플랫폼을 모른다' }] }],
    },
  },
)
