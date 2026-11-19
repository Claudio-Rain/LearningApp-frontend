import { describe, it, expect } from 'vitest'
import { isSequence, normalizeExpression, parseNumber, parsePlotSpec, plainLabel, plotSpecToText } from '@/utils/plotSpec'
import { markdownToTiptap } from '@/utils/markdown'
import { extractText } from '@/utils/claude/text'

describe('normalizeExpression', () => {
  it.each([
    ['y = x^2', 'x^2'],
    ['f(x) = 3x - 1', '3x - 1'],
    ['ln(x) + arcsin(x)', 'log(x) + asin(x)'],
    ['sen(x)', 'sin(x)'],
    ['2π·x − x²', '2pi*x - x^2'],
    ['√(x)', 'sqrt(x)'],
    ['e^(-x^2)', 'e^(-x^2)'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeExpression(input)).toBe(expected)
  })

  it('leaves words that merely contain an alias alone', () => {
    expect(normalizeExpression('sinh(x) + tan(x)')).toBe('sinh(x) + tan(x)')
  })
})

describe('isSequence', () => {
  it.each([
    ['(-1)^n/n', true],
    ['y = 1/n', true],
    ['2n + 1', true],
    ['1/x', false],
    ['x^n', false],
    ['sin(x)', false],
    ['ln(x)', false],
  ])('%s -> %s', (fn, expected) => {
    expect(isSequence(fn)).toBe(expected)
  })
})

describe('parseNumber', () => {
  it.each([
    ['3', 3],
    ['-2.5', -2.5],
    ['.5', 0.5],
    ['pi', Math.PI],
    ['-pi', -Math.PI],
    ['2pi', 2 * Math.PI],
    ['-2pi', -2 * Math.PI],
    ['pi/2', Math.PI / 2],
    ['3pi/4', (3 * Math.PI) / 4],
    ['π', Math.PI],
  ])('%s', (input, expected) => {
    expect(parseNumber(input)).toBeCloseTo(expected)
  })

  it.each(['', '-', 'abc', '2x', 'auto'])('rejects %j', input => {
    expect(parseNumber(input)).toBeNull()
  })
})

describe('parsePlotSpec', () => {
  it('reads functions and every setting', () => {
    expect(
      parsePlotSpec('y = x^2 - 3x\nsin(x)/x\nx: -2pi, 2pi\ny: -2, 4\ntangent\narea: 0, 3')
    ).toEqual({
      functions: ['x^2 - 3x', 'sin(x)/x'],
      xDomain: [-2 * Math.PI, 2 * Math.PI],
      yDomain: [-2, 4],
      tangent: true,
      area: [0, 3],
    })
  })

  it('accepts Spanish keywords and range separators', () => {
    expect(parsePlotSpec('f(x) = x^3\nx: [-3 .. 3]\ntangente\nárea: 0 a 2')).toEqual({
      functions: ['x^3'],
      xDomain: [-3, 3],
      tangent: true,
      area: [0, 2],
    })
  })

  it('treats "y: <expression>" as a function, not a range', () => {
    expect(parsePlotSpec('y: 2x + 1')?.functions).toEqual(['2x + 1'])
  })

  it('orders reversed ranges and ignores comments', () => {
    expect(parsePlotSpec('# parabola\nx^2\nx: 5, -5')?.xDomain).toEqual([-5, 5])
  })

  it('reads labels, title, points and guide lines', () => {
    expect(
      parsePlotSpec(
        'title: ε-δ for $f(x)=x^2$\n' +
          'y = x^2 "f(x)"\n' +
          '1.5\n' +
          'y = 0.5 “L − ε”\n' +
          'point: 1, 1 "(a, L)"\n' +
          'punto: -pi, 0\n' +
          'vline: 0.71 "a − δ"\n' +
          'hline: 1.5'
      )
    ).toEqual({
      title: 'ε-δ for $f(x)=x^2$',
      functions: ['x^2', '1.5', '0.5'],
      labels: ['f(x)', '', 'L − ε'],
      points: [{ x: 1, y: 1, label: '(a, L)' }, { x: -Math.PI, y: 0 }],
      lines: [{ axis: 'x', at: 0.71, label: 'a − δ' }, { axis: 'y', at: 1.5 }],
    })
  })

  it('leaves labels out entirely when no curve is named', () => {
    expect(parsePlotSpec('x^2\nsin(x)')).toEqual({ functions: ['x^2', 'sin(x)'] })
  })

  it('round-trips labels, title and marks', () => {
    const text = 'title: Limit\ny = x^2 "f(x)"\ny = 1\npoint: 1, 1 "(a, L)"\nvline: pi/2 "a"\nx: 0, 2\ny: 0, 2'
    const spec = parsePlotSpec(text)!
    expect(plotSpecToText(spec)).toBe(text)
    expect(parsePlotSpec(plotSpecToText(spec))).toEqual(spec)
  })

  it('returns null without any function', () => {
    expect(parsePlotSpec('x: -1, 1\ntangent')).toBeNull()
  })

  it('round-trips through plotSpecToText', () => {
    const spec = parsePlotSpec('x^2\n1/x\nx: -pi/2, 3pi/2\narea: 0.5, 2\ntangent')!
    expect(parsePlotSpec(plotSpecToText(spec))).toEqual(spec)
    expect(plotSpecToText(spec)).toContain('x: -pi/2, 3pi/2')
  })
})

describe('plainLabel', () => {
  it.each([
    ['$L+\\varepsilon$', 'L+ε'],
    ['$a-\\delta$', 'a-δ'],
    ['$f(x)=x^2$', 'f(x)=x²'],
    ['$x^{-1}$', 'x⁻¹'],
    ['(a, L)', '(a, L)'],
    ['$\\frac{1}{x}$', '1/x'],
    ['$\\sqrt{x}$', '√x'],
    ['y = x^(3/2)', 'y = x³ᐟ²'],
    ['x^10 + x^n', 'x¹⁰ + xⁿ'],
    ['e^(x+y)', 'e^(x+y)'],
    ['-b_n', '-bₙ'],
    ['a_{n+1}', 'aₙ₊₁'],
  ])('%s -> %s', (input, expected) => {
    expect(plainLabel(input)).toBe(expected)
  })
})

describe('```plot blocks', () => {
  it('become functionPlot nodes', () => {
    const doc = markdownToTiptap('Look:\n\n```plot\ny = sin(x)/x\nx: -10, 10\n```\n')
    expect(doc.content?.[1]).toEqual({
      type: 'functionPlot',
      attrs: { functions: ['sin(x)/x'], xDomain: [-10, 10] },
    })
  })

  it('stay a code block when they hold no function', () => {
    const doc = markdownToTiptap('```plot\nx: -1, 1\n```')
    expect(doc.content?.[0]?.type).toBe('codeBlock')
  })

  it('go back to Claude as the same ```plot text', () => {
    const doc = markdownToTiptap('```plot\ny = x^2\ntangent\n```')
    expect(extractText(doc).trim()).toBe('```plot\ny = x^2\ntangent\n```')
  })
})
