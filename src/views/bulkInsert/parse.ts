// Parsers for the two bulk-insert text formats.
//
// Standard: "question:" / "answer:" blocks separated by blank lines, all going
// into one collection.
//
// Full text: the same items, grouped under "- Collection name" lines, with
// optional "# Category name" lines that apply to every collection below them.
//
// `answerRequired` is false when Claude will write the answers; then a
// question alone makes a valid item.

export interface ParsedItem {
  question: string
  answer: string
  valid: boolean
}

export interface ParsedCollection {
  title: string
  isNew: boolean
  // null when no "# Category" header is in effect for this collection.
  categoryTitle: string | null
  items: ParsedItem[]
}

const QUESTION = /^question:\s*(.*)/i
const ANSWER = /^answer:\s*(.*)/i

const isValid = (item: Pick<ParsedItem, 'question' | 'answer'>, answerRequired: boolean) =>
  item.question.length > 0 && (!answerRequired || item.answer.length > 0)

/** Parse one "question:/answer:" block. Lines after "answer:" continue the answer. */
export const parseBlock = (block: string, answerRequired: boolean): ParsedItem => {
  let question = ''
  let answer = ''
  let capturingAnswer = false

  for (const line of block.split('\n')) {
    const q = line.match(QUESTION)
    const a = line.match(ANSWER)
    if (q?.[1] !== undefined) {
      question = q[1].trim()
      capturingAnswer = false
    } else if (a?.[1] !== undefined) {
      answer = a[1].trim()
      capturingAnswer = true
    } else if (capturingAnswer && line.trim()) {
      answer += ' ' + line.trim()
    }
  }

  return { question, answer, valid: isValid({ question, answer }, answerRequired) }
}

/** Standard mode: one item per blank-line-separated block. */
export const parseItemBlocks = (text: string, answerRequired: boolean): ParsedItem[] => {
  if (!text.trim()) return []
  return text
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean)
    .map(b => parseBlock(b, answerRequired))
}

type FullTextLine =
  | { kind: 'skip' }
  | { kind: 'category'; title: string | null }
  | { kind: 'collection'; title: string }
  | { kind: 'question'; text: string }
  | { kind: 'answer'; text: string }
  | { kind: 'continuation'; text: string }

/** Classify one trimmed line of the full-text input. */
export const classifyLine = (line: string): FullTextLine => {
  // Blank, or a divider like "----" / "---- JUNIOR ----" (two or more dashes).
  if (!line || /^-{2,}/.test(line)) return { kind: 'skip' }

  // Category header: "# Name". A bare "#" clears the current category.
  const cat = line.match(/^#+\s*(.*)/)
  if (cat?.[1] !== undefined) return { kind: 'category', title: cat[1].trim() || null }

  // Collection header: a single leading dash followed by a title.
  const col = line.match(/^-\s+(.+)/)
  if (col?.[1] !== undefined) return { kind: 'collection', title: col[1].trim() }

  const q = line.match(QUESTION)
  if (q?.[1] !== undefined) return { kind: 'question', text: q[1].trim() }

  const a = line.match(ANSWER)
  if (a?.[1] !== undefined) return { kind: 'answer', text: a[1].trim() }

  return { kind: 'continuation', text: line }
}

/**
 * Full text mode. `existingTitles` holds the lowercased titles of collections
 * that already exist, so each parsed collection can say whether it is new.
 * Items before the first "- Title" line have no collection and are dropped.
 */
export const parseFullText = (
  text: string,
  existingTitles: Set<string>,
  answerRequired: boolean
): ParsedCollection[] => {
  if (!text.trim()) return []

  const result: ParsedCollection[] = []
  // Initialized with the full type, not narrowed to null: some TypeScript
  // versions don't see the reassignment inside the loop and infer `never` below.
  let current = null as ParsedCollection | null
  let currentCategory: string | null = null
  let capturingAnswer = false

  for (const rawLine of text.split('\n')) {
    const line = classifyLine(rawLine.trim())
    const lastItem = current?.items[current.items.length - 1]

    switch (line.kind) {
      case 'category':
        currentCategory = line.title
        capturingAnswer = false
        break
      case 'collection':
        current = {
          title: line.title,
          isNew: !existingTitles.has(line.title.toLowerCase()),
          categoryTitle: currentCategory,
          items: []
        }
        result.push(current)
        capturingAnswer = false
        break
      case 'question':
        current?.items.push({ question: line.text, answer: '', valid: false })
        capturingAnswer = false
        break
      case 'answer':
        if (lastItem) lastItem.answer = line.text
        capturingAnswer = true
        break
      case 'continuation':
        // Continuation of a multi-line answer.
        if (capturingAnswer && lastItem) lastItem.answer += ' ' + line.text
        break
      default:
        capturingAnswer = false
    }
  }

  // Validity is set once multi-line answers are fully assembled.
  for (const col of result) {
    for (const item of col.items) item.valid = isValid(item, answerRequired)
  }
  return result
}

export const countValid = (items: ParsedItem[]): number => items.filter(i => i.valid).length

export const pluralize = (count: number, word: string): string => `${count} ${word}${count !== 1 ? 's' : ''}`
