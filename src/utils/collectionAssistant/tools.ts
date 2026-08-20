import type Anthropic from '@anthropic-ai/sdk'

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
]
