// LaTeX source fixes that need no renderer (markdown.ts uses this in the
// service worker; mathText.ts and MathNode.vue before rendering).

/**
 * Repair LaTeX that came through a JSON-escaping layer: Claude sometimes
 * writes a ✓ as the escape "✓" inside math, and to LaTeX "\u" is an
 * accent, so it renders as "ǔ2713". Turn such escapes back into characters
 * (a check mark into \checkmark, which KaTeX draws with its own fonts).
 * A real \u accent always takes a braced or single-letter argument, never
 * four hex digits, so this can't eat one.
 */
export const repairLatex = (latex: string): string =>
  latex.replace(/\\u([0-9a-fA-F]{4})(?![0-9a-fA-F])/g, (_, hex: string) => {
    const code = parseInt(hex, 16)
    if (code === 0x2713 || code === 0x2714) return '\\checkmark '
    return String.fromCodePoint(code)
  })
