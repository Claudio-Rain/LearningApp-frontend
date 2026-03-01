import vue from 'eslint-plugin-vue'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'

export default [
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser, // this handles <script lang="ts">
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      vue,
      '@typescript-eslint': tseslint
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error'
    }
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser
    }
  }
]