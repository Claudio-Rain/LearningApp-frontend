import { createLowlight } from 'lowlight'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import sql from 'highlight.js/lib/languages/sql'
import json from 'highlight.js/lib/languages/json'
import csharp from 'highlight.js/lib/languages/csharp'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import bash from 'highlight.js/lib/languages/bash'

export type CodeLanguage =
  | 'javascript' | 'typescript' | 'jsx' | 'tsx' | 'vue'
  | 'python' | 'html' | 'css' | 'sql' | 'json'
  | 'csharp' | 'java' | 'cpp' | 'go' | 'rust' | 'bash'

export const CODE_LANGUAGES: { id: CodeLanguage; label: string }[] = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'jsx', label: 'React (JSX)' },
  { id: 'tsx', label: 'React (TSX)' },
  { id: 'vue', label: 'Vue SFC' },
  { id: 'python', label: 'Python' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'sql', label: 'SQL' },
  { id: 'json', label: 'JSON' },
  { id: 'csharp', label: 'C#' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'bash', label: 'Shell' },
]

export const CODE_LANGUAGE_LABELS: Record<CodeLanguage, string> = Object.fromEntries(
  CODE_LANGUAGES.map(l => [l.id, l.label])
) as Record<CodeLanguage, string>

// Registered as a private instance holding only the languages the scratchpad
// can actually switch to, so a detection never names one we can't honour.
const lowlight = createLowlight({
  javascript, typescript, python, xml, css, sql, json,
  csharp, java, cpp, go, rust, bash,
})

const HLJS_TO_LANGUAGE: Record<string, CodeLanguage> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  xml: 'html',
  css: 'css',
  sql: 'sql',
  json: 'json',
  csharp: 'csharp',
  java: 'java',
  cpp: 'cpp',
  go: 'go',
  rust: 'rust',
  bash: 'bash',
}

// highlight.js has no Vue mode and reads an SFC as XML, and it consistently
// mistakes Java for TypeScript — they share too much surface. Both are
// unambiguous from a single marker, so they are settled before scoring.
const SFC_PATTERN = /<template[\s>][\s\S]*<script[\s>]/i
const JAVA_PATTERN = /\b(public|private)\s+(static\s+)?(class|void|int|String)\b|\bSystem\.out\./

// A tag written in PascalCase or a self-closing component is JSX and not
// markup, which is the only thing separating it from plain JS or TS.
const JSX_PATTERN = /<[A-Z][\w.]*[\s/>]|<>|\/>/

// Anything shorter than this, or scoring below the threshold, is a fragment
// that highlight.js will happily misread — a bare `x` reads as CSS. Real code
// scores 3+ once a statement or two is on screen; noise sits at 1.
const MIN_LENGTH = 12
const MIN_RELEVANCE = 3

export const detectCodeLanguage = (text: string): CodeLanguage | null => {
  if (text.trim().length < MIN_LENGTH) return null
  if (SFC_PATTERN.test(text)) return 'vue'
  if (JAVA_PATTERN.test(text)) return 'java'

  const { language, relevance } = lowlight.highlightAuto(text).data ?? {}
  if (!language || (relevance ?? 0) < MIN_RELEVANCE) return null

  const detected = HLJS_TO_LANGUAGE[language]
  if (!detected) return null
  if (detected === 'javascript' && JSX_PATTERN.test(text)) return 'jsx'
  if (detected === 'typescript' && JSX_PATTERN.test(text)) return 'tsx'
  return detected
}
