import { describe, it, expect } from 'vitest'
import { detectCodeLanguage, CODE_LANGUAGES } from '@/utils/detectCodeLanguage'

describe('detectCodeLanguage', () => {
  it.each([
    ['javascript', 'const doubled = [1, 2, 3].map(n => n * 2)\nconsole.log(doubled)'],
    ['typescript', 'interface User { id: number; name: string }\nconst u: User = { id: 1, name: "a" }'],
    ['python', 'def squares(n):\n    return [i * i for i in range(n)]'],
    ['sql', 'SELECT id, name FROM users WHERE age > 30 ORDER BY name;'],
    ['css', '.card { display: flex; color: red; padding: 4px; }'],
    ['html', '<div class="card"><span>hello</span></div>'],
    ['json', '{"a": 1, "b": [true, null], "c": "x"}'],
    ['csharp', 'var items = new List<int>();\nitems.Add(1);\nforeach (var i in items) Console.WriteLine(i);'],
    ['cpp', '#include <iostream>\nint main() { std::cout << 1 << std::endl; return 0; }'],
    ['go', 'package main\n\nimport "fmt"\n\nfunc main() { fmt.Println("hi") }'],
    ['rust', 'fn main() {\n    let v: Vec<i32> = vec![1, 2, 3];\n    println!("{:?}", v);\n}'],
    ['bash', 'for f in *.txt; do\n  echo "$f"\ndone'],
  ])('detects %s', (expected, source) => {
    expect(detectCodeLanguage(source)).toBe(expected)
  })

  it('reads a Vue SFC as vue rather than as markup', () => {
    const sfc = '<template>\n  <div class="a">{{ msg }}</div>\n</template>\n\n<script setup>\nconst msg = ref(1)\n</script>'
    expect(detectCodeLanguage(sfc)).toBe('vue')
  })

  it('reads Java as java rather than as typescript', () => {
    const source = 'public class Main {\n    public static void main(String[] args) {\n        System.out.println(1);\n    }\n}'
    expect(detectCodeLanguage(source)).toBe('java')
  })

  it('separates JSX from plain javascript', () => {
    const plain = 'const total = items.reduce((a, b) => a + b, 0)\nconsole.log(total)'
    const jsx = 'export default function App() {\n  const [n, setN] = useState(0)\n  return <Counter value={n} onClick={() => setN(n + 1)} />\n}'
    expect(detectCodeLanguage(plain)).toBe('javascript')
    expect(detectCodeLanguage(jsx)).toBe('jsx')
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
    const supported = CODE_LANGUAGES.map(l => l.id)
    const samples = [
      'defmodule Foo do\n  def bar(x), do: x * 2\nend',
      'SELECT * FROM t;',
      '(defn foo [x] (* x 2))',
      'body { margin: 0 auto; font-size: 12px; }',
    ]
    for (const sample of samples) {
      const result = detectCodeLanguage(sample)
      expect(result === null || supported.includes(result)).toBe(true)
    }
  })
})
