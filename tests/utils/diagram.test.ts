import { describe, it, expect } from 'vitest'
import { markdownToTiptap } from '@/utils/markdown'
import { extractText } from '@/utils/claude/text'
import { titleDocFromMarkdown } from '@/utils/itemTitle'
import { diagramThemeVariables, mixHex } from '@/shared/tiptap/diagramTheme'

const SOURCE = 'flowchart LR\n  A[Seed] --> B[Plant]\n  B -->|light| C[Flower]'

describe('diagrams in markdown', () => {
  it('turn a ```mermaid block into a diagram node', () => {
    const doc = markdownToTiptap(`Intro\n\n\`\`\`mermaid\n${SOURCE}\n\`\`\``)
    expect(doc.content?.[1]).toEqual({ type: 'diagram', attrs: { source: SOURCE } })
  })

  it('leave an empty mermaid block as code', () => {
    expect(markdownToTiptap('```mermaid\n```').content?.[0]?.type).toBe('codeBlock')
  })

  it('go back to Claude as the same fenced block', () => {
    const doc = markdownToTiptap(`\`\`\`mermaid\n${SOURCE}\n\`\`\``)
    expect(extractText(doc)).toContain(`\`\`\`mermaid\n${SOURCE}\n\`\`\``)
  })

  it('are flattened out of titles', () => {
    const doc = titleDocFromMarkdown('```mermaid\npie\n  "A" : 1\n```')
    expect(doc.content?.every(n => n.type === 'paragraph')).toBe(true)
  })
})

describe('diagram theme', () => {
  it('mixes colours', () => {
    expect(mixHex('#ffffff', '#000000', 0.5)).toBe('#808080')
    expect(mixHex('#1565C0', '#ffffff', 0)).toBe('#ffffff')
  })

  it('builds valid hex colours from the palette', () => {
    const vars = diagramThemeVariables(
      { surface: '#1E1E1E', 'on-surface': '#FFFFFF', inkBlue: '#90CAF9', primary: '#BB86FC' },
      true,
      'Roboto'
    )
    expect(vars.primaryBorderColor).toBe('#90CAF9')
    expect(vars.primaryColor).toMatch(/^#[0-9a-f]{6}$/)
    expect(vars.darkMode).toBe(true)
  })
})
