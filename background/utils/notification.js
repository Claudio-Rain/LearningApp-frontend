export function extractPlainText(node, separator = '\n') {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  if (!node.content?.length) return '';

  const blockTypes = new Set(['paragraph', 'heading', 'blockquote', 'listItem', 'bulletList', 'orderedList', 'codeBlock']);
  const parts = node.content.map(child => extractPlainText(child, separator));
  return blockTypes.has(node.type)
    ? parts.join('').trim()
    : parts.join(separator);
}

export function formatNotificationMessage(content, maxLength = 100) {
  const text = extractPlainText(content).replace(/\n+/g, ' • ').trim();
  return text.length > maxLength ? text.slice(0, maxLength - 1) + '…' : text;
}

export function formatNotificationTitle(title, maxLength = 50) {
  return title.length > maxLength ? title.slice(0, maxLength - 1) + '…' : title;
}
