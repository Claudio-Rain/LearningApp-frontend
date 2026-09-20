import { describe, it, expect } from 'vitest'
import { detectCodeLanguage } from '@/utils/detectCodeLanguage'

describe('detectCodeLanguage', () => {
  it.each([
    ['javascript', 'const doubled = [1, 2, 3].map(n => n * 2)\nconsole.log(doubled)'],
    ['typescript', 'interface User { id: number; name: string }\nconst u: User = { id: 1, name: "a" }'],
    ['python', 'def squares(n):\n    return [i * i for i in range(n)]'],
    ['sql', 'SELECT id, name FROM users WHERE age > 30 ORDER BY name;'],
    ['css', '.card { display: flex; color: red; padding: 4px; }'],
    ['html', '<div class="card"><span>hello</span></div>'],
    ['json', '{"a": 1, "b": [true, null], "c": "x"}'],
  ])('detects %s', (expected, source) => {
    expect(detectCodeLanguage(source)).toBe(expected)
  })

  it('returns null for an empty pad', () => {
    expect(detectCodeLanguage('')).toBeNull()
    expect(detectCodeLanguage('   \n  ')).toBeNull()
  })

  it('returns null for fragments too short to judge', () => {
    expect(detectCodeLanguage('x')).toBeNull()
    expect(detectCodeLanguage('const a = 1')).toBeNull()
  })

  it('returns null for prose rather than guessing a language', () => {
    expect(detectCodeLanguage('hello there this is just some words')).toBeNull()
  })

  it('only ever names a language the scratchpad can switch to', () => {
    const supported = ['javascript', 'typescript', 'python', 'html', 'css', 'sql', 'json']
    const samples = [
      'package main\n\nfunc main() { println("hi") }',
      '#include <stdio.h>\nint main(void) { return 0; }',
      'SELECT * FROM t;',
      'body { margin: 0 auto; font-size: 12px; }',
    ]
    for (const sample of samples) {
      const result = detectCodeLanguage(sample)
      expect(result === null || supported.includes(result)).toBe(true)
    }
  })
})
