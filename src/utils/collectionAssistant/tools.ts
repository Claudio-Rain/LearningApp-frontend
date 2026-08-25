import type Anthropic from '@anthropic-ai/sdk'
import { ITEM_LABEL_DEFS, ITEM_LABEL_KINDS, LABEL_LEVELS } from '../itemLabels'

/** Wording the model may use for "no label", alongside the level names. */
export const CLEAR_LABEL_VALUE = 'none'

// The level names are an enum rather than raw 1-5 integers on purpose: naming
// the rungs is what keeps the model's judgement calibrated (and stops
// everything drifting to a middling 3), and it can't invent a level that isn't
// on the ladder. Generated from `@/utils/itemLabels`, so renaming a level there
// updates the tool the model sees.
const labelProperty = (kind: (typeof ITEM_LABEL_KINDS)[number]) => {
  const def = ITEM_LABEL_DEFS[kind]
  const names = LABEL_LEVELS.map((level) => def.levels[level].label)
  return {
    type: 'string' as const,
    enum: [...names, CLEAR_LABEL_VALUE],
    description:
      `${def.description} Lowest to highest: ${names.join(' < ')}. ` +
      `Use "${CLEAR_LABEL_VALUE}" to remove the label. Omit this field to leave it unchanged.`,
  }
}

// Tool surface, split so we can hand the model only what it needs. Reads
// (`list_items`, `read_item`) execute and feed results back to the model, and
// are only offered when the collection is too large to embed in the prompt.
// Writes (`propose_*`) never touch the DB here — they raise a proposal for the
// user and return an acknowledgement so the model can wrap up — and are always
// available.
export const READ_TOOLS: Anthropic.Tool[] = [
  {
    name: 'list_items',
    description:
      'List every learning item in this collection with its id, title, and a short content preview. Call this first whenever you need to reason about the collection as a whole — finding the hardest / best / least-relevant items, counting, or summarizing.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'read_item',
    description:
      'Read the full title and content of one learning item by id. Use when the short preview from list_items is not enough.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'The learning item id.' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
]

export const WRITE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'propose_create_items',
    description:
      'Propose one or more NEW learning items to add. This does NOT create them — it shows the user an approval card they confirm first. Each item is a flashcard: `title` is the question/front, `content` is the answer/explanation as markdown.',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'The items to propose adding.',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'The question / front of the card.' },
              content: { type: 'string', description: 'The answer / back, in markdown.' },
            },
            required: ['title', 'content'],
            additionalProperties: false,
          },
        },
      },
      required: ['items'],
      additionalProperties: false,
    },
  },
  {
    name: 'propose_delete_items',
    description:
      'Propose learning items to DELETE. This does NOT delete anything — it shows the user a checklist they approve per-item or all at once. Give each item a short `reason` so the user can judge.',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'The items to propose deleting.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'The learning item id to delete.' },
              reason: { type: 'string', description: 'Why this item is a deletion candidate.' },
            },
            required: ['id'],
            additionalProperties: false,
          },
        },
      },
      required: ['items'],
      additionalProperties: false,
    },
  },
  {
    name: 'propose_update_items',
    description:
      "Propose edits to one or more existing items' titles and/or content. This does NOT save — it shows the user ONE approval card listing every edit, which they confirm together. Put all the edits you are making in a single call rather than calling this repeatedly, so the user approves them in one go. Provide `content` as markdown when changing the body.",
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'The edits to propose.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'The learning item id to edit.' },
              title: { type: 'string', description: 'New title, if changing it.' },
              content: { type: 'string', description: 'New content as markdown, if changing it.' },
            },
            required: ['id'],
            additionalProperties: false,
          },
        },
      },
      required: ['items'],
      additionalProperties: false,
    },
  },
  {
    name: 'propose_label_items',
    description:
      "Propose priority and/or difficulty labels for existing items. This does NOT save — it shows the user ONE approval card listing every item's current label next to the proposed one, which they confirm together. Use this instead of propose_update_items whenever you are only labeling: it leaves the card's title and content untouched. Labels are cheap to propose, so cover every item you mean to label in a single call.",
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'The items to label.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'The learning item id to label.' },
              priority: labelProperty('priority'),
              difficulty: labelProperty('difficulty'),
              reason: {
                type: 'string',
                description: 'Briefly, why these levels — shown to the user so they can judge.',
              },
            },
            required: ['id'],
            additionalProperties: false,
          },
        },
      },
      required: ['items'],
      additionalProperties: false,
    },
  },
]
