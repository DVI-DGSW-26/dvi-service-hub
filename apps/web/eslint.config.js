// 코드 규칙 — 구조 · 방향 · 크기는 docs/adr/0002-domain-modules.md
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import importX from 'eslint-plugin-import-x'
import boundaries from 'eslint-plugin-boundaries'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import globals from 'globals'

// 기능(features/*) 루트에는 index 하나만(shared 묶음은 평평하게 둔다), 하위 폴더에는 index 를 두지 않는다
const MODULE_ROOT = /[\\/]src[\\/]features[\\/][^\\/]+[\\/]([^\\/]+)$/
const NESTED_INDEX = /[\\/]src[\\/](features|shared)[\\/][^\\/]+[\\/].+[\\/]index\.tsx?$/
const MODULE_INDEX = (types) => [{ types, internalPath: 'index.{ts,tsx}' }]

const structure = {
  rules: {
    'module-root': {
      meta: { type: 'problem', messages: { root: '기능 루트에는 index.ts 만 둔다 — {{name}} 는 하위 폴더로', nested: '하위 폴더에는 index 를 두지 않는다 — 모듈의 index 하나로 내보낸다' } },
      create(context) {
        return {
          Program(node) {
            const root = MODULE_ROOT.exec(context.filename)
            if (root && !/^index\.tsx?$/.test(root[1])) context.report({ node, messageId: 'root', data: { name: root[1] } })
            if (NESTED_INDEX.test(context.filename)) context.report({ node, messageId: 'nested' })
          },
        }
      },
    },
  },
}

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.agents', '.claude', 'docs', 'public'] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // onClick={() => setOpen(false)} 같은 한 줄 화살표는 이 코드베이스의 관례
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  { files: ['**/*.js', '**/*.cjs'], ...tseslint.configs.disableTypeChecked },
  { files: ['**/*.cjs'], languageOptions: { sourceType: 'commonjs', globals: globals.node } },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    extends: [reactHooks.configs.flat['recommended-latest'], reactRefresh.configs.vite, jsxA11y.flatConfigs.recommended],
  },
  // 크기 · 한 가지 일
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 400, skipBlankLines: false, skipComments: false }],
      'max-lines-per-function': ['error', { max: 150, skipBlankLines: true, skipComments: true }],
      complexity: ['error', 15],
      'max-depth': ['error', 4],
      'max-params': ['error', 4],
    },
  },
  // 순환 · 중복 가져오기
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'import-x': importX },
    settings: { ...importX.flatConfigs.typescript.settings, 'import-x/resolver-next': [createTypeScriptImportResolver({ project: './tsconfig.app.json' })] },
    rules: {
      'import-x/no-cycle': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-duplicates': 'error',
    },
  },
  // 구조 · 의존 방향(app · switcher · mocks → features → shared)
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries, structure },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.app.json' } },
      'boundaries/include': ['src/**/*.{ts,tsx}'],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app' },
        { type: 'switcher', pattern: 'src/switcher' },
        { type: 'mocks', pattern: 'src/mocks' },
        { type: 'feature', pattern: 'src/features/*', capture: ['name'] },
        { type: 'shared', pattern: 'src/shared/*', capture: ['name'] },
      ],
    },
    rules: {
      'structure/module-root': 'error',
      'boundaries/no-unknown-files': 'error',
      // 다른 기능 · shared 묶음은 index 로만 — 같은 묶음 안은 검사하지 않는다(checkInternals 기본값 false)
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            { from: { element: { type: 'app' } }, allow: { to: { element: [{ type: 'mocks' }, ...MODULE_INDEX(['feature', 'shared'])] } } },
            { from: { element: { type: 'mocks' } }, allow: { to: { element: MODULE_INDEX(['feature', 'shared']) } } },
            { from: { element: { type: 'switcher' } }, allow: { to: { element: MODULE_INDEX(['feature', 'shared']) } } },
            // 기능 → mocks 는 개발 서버의 목업 사용자(account 의 auth)뿐 — 운영 빌드에서는 쓰지 않는다
            { from: { element: { type: 'feature' } }, allow: { to: { element: [{ type: 'mocks' }, ...MODULE_INDEX(['feature', 'shared'])] } } },
            { from: { element: { type: 'shared' } }, allow: { to: { element: MODULE_INDEX(['shared']) } } },
          ],
        },
      ],
    },
  },
)
