import js from '@eslint/js'
import globals from 'globals'
import vue from 'eslint-plugin-vue'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import sonarjs from 'eslint-plugin-sonarjs'
import prettierConfig from 'eslint-config-prettier'

export default [
  { ignores: ['dist', '.firebase', 'node_modules'] },

  js.configs.recommended,
  ...tseslint.configs['flat/recommended'],
  ...vue.configs['flat/recommended'],

  // <script lang="ts"> support in SFCs (the vue preset already sets vue-eslint-parser)
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    }
  },

  // Extension code runs in the browser with chrome.* APIs
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions
      }
    }
  },

  // Node-side files
  {
    files: ['**/*.mjs', 'scripts/**/*.{js,ts}', 'vite.config.ts'],
    languageOptions: {
      globals: { ...globals.node }
    }
  },

  {
    files: ['**/*.{ts,vue}'],
    rules: {
      // TypeScript itself catches these; the core rules false-positive on TS syntax
      'no-undef': 'off',
      'no-unused-vars': 'off'
    }
  },

  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ],
      // Plenty of pre-existing `any`s; flag them without failing the build
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  },

  // Complexity signals only (not the full SonarJS preset) — warnings, never build-breaking
  {
    plugins: { sonarjs },
    rules: {
      'sonarjs/cognitive-complexity': ['warn', 15],
      complexity: ['warn', 15]
    }
  },

  // Type shims intentionally use loose types
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },

  // Vuetify uses dotted slot names like #item.actions
  {
    files: ['**/*.vue'],
    rules: {
      'vue/valid-v-slot': ['error', { allowModifiers: true }]
    }
  },

  // Disable formatting rules that would fight Prettier
  prettierConfig
]
