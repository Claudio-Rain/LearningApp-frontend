import { createLowlight } from 'lowlight'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import sql from 'highlight.js/lib/languages/sql'
import json from 'highlight.js/lib/languages/json'

export type CodeLanguage = 'javascript' | 'typescript' | 'python' | 'html' | 'css' | 'sql' | 'json'

export const CODE_LANGUAGES: { id: CodeLanguage; label: string }[] = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'sql', label: 'SQL' },
  { id: 'json', label: 'JSON' },
]

// Registered as a private instance holding only the languages the scratchpad
// can actually switch to, so a detection never names one we can't honour.
const lowlight = createLowlight({ javascript, typescript, python, xml, css, sql, json })

const HLJS_TO_LANGUAGE: Record<string, CodeLanguage> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  xml: 'html',
  css: 'css',
  sql: 'sql',
  json: 'json',
}

// Anything shorter than this, or scoring below the threshold, is a fragment
// that highlight.js will happily misread — a bare `x` reads as CSS. Real code
// scores 3+ once a statement or two is on screen; noise sits at 1.
const MIN_LENGTH = 12
const MIN_RELEVANCE = 3

export const detectCodeLanguage = (text: string): CodeLanguage | null => {
  if (text.trim().length < MIN_LENGTH) return null
  const { language, relevance } = lowlight.highlightAuto(text).data ?? {}
  if (!language || (relevance ?? 0) < MIN_RELEVANCE) return null
  return HLJS_TO_LANGUAGE[language] ?? null
}
