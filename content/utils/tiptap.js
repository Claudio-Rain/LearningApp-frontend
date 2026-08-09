export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Inline marks, applied in order to the escaped text of a `text` node.
const MARK_RENDERERS = {
  bold: (text) => `<strong>${text}</strong>`,
  italic: (text) => `<em>${text}</em>`,
  underline: (text) => `<u>${text}</u>`,
  code: (text) => `<code>${text}</code>`,
  highlight: (text) => `<mark>${text}</mark>`,
  textStyle: (text, mark) =>
    mark.attrs?.color ? `<span style="color: ${mark.attrs.color}">${text}</span>` : text,
};

// Block nodes that are just a tag wrapped around their rendered children.
const BLOCK_TAGS = {
  paragraph: 'p',
  bulletList: 'ul',
  orderedList: 'ol',
  listItem: 'li',
  blockquote: 'blockquote',
  table: 'table',
  tableRow: 'tr',
  tableHeader: 'th',
  tableCell: 'td',
};

// Block nodes whose markup depends on the node's own attributes.
const NODE_RENDERERS = {
  heading: (node, content) => {
    const level = node.attrs?.level || 1;
    return `<h${level}>${content}</h${level}>`;
  },
  codeBlock: (_node, content) => `<pre><code>${content}</code></pre>`,
  horizontalRule: () => '<hr/>',
  hardBreak: () => '<br/>',
  image: (node) =>
    `<img src="${escapeHtml(node.attrs?.src || '')}" alt="${escapeHtml(node.attrs?.alt || '')}" style="max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0;">`,
};

function renderTextNode(node) {
  let text = escapeHtml(node.text || '');
  for (const mark of node.marks || []) {
    text = MARK_RENDERERS[mark.type]?.(text, mark) ?? text;
  }
  return text;
}

// Simple Tiptap JSON to HTML renderer
export function renderTiptapContent(node) {
  if (!node) return '';
  if (typeof node === 'string') return escapeHtml(node);
  if (node.type === 'text') return renderTextNode(node);

  const content = node.content ? node.content.map(renderTiptapContent).join('') : '';

  const tag = BLOCK_TAGS[node.type];
  if (tag) return `<${tag}>${content}</${tag}>`;

  // Unknown types (including `doc`) render as just their children.
  return NODE_RENDERERS[node.type]?.(node, content) ?? content;
}

const PLAIN_TEXT_BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'listItem',
  'bulletList',
  'orderedList',
  'codeBlock',
]);

// Función para extraer texto plano (igual que en background.js)
export function extractPlainText(node, separator = '\n') {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  if (!node.content?.length) return '';

  const parts = node.content.map((child) => extractPlainText(child, separator));
  return PLAIN_TEXT_BLOCK_TYPES.has(node.type) ? parts.join('').trim() : parts.join(separator);
}