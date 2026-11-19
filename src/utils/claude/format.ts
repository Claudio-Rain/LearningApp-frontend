// Formatting conventions the app can render, told to Claude wherever its
// markdown ends up on a card (see utils/markdown.ts for the parsing side).

export const RICH_FORMAT_GUIDE =
  `Formatting: write math in LaTeX, $...$ inline and $$...$$ for display equations. ` +
  `When a graph would genuinely help (functions, limits, derivatives, integrals, sequences), you may ` +
  `add an interactive plot as a fenced block with the language "plot", one setting per line:\n` +
  `- a function of x per line, e.g. "y = x^2 - 3x" or "sin(x)/x" (use * or implicit multiplication, ` +
  `parentheses on every function call, e, pi, ln, sqrt; a constant like "y = 1.5" is a horizontal ` +
  `curve). A SEQUENCE is written in n instead of x, e.g. "(-1)^n/n": it is drawn as dots at whole n ` +
  `— never fake a sequence with a continuous curve like cos(pi*x)/x. Name each curve with a quoted ` +
  `LaTeX label at the end, shown in the legend: y = 1/x "$b_n = 1/n$".\n` +
  `- "title: ..." for a caption above the plot ($...$ math allowed).\n` +
  `- "point: 1, 1 \\"(a, L)\\"" to mark and label a point; "vline: 0.7 \\"a − δ\\"" and ` +
  `"hline: 1.5 \\"L + ε\\"" for labelled vertical/horizontal guide lines. These labels are drawn ` +
  `inside the plot as plain text: keep them short and use Unicode (ε δ ² ₙ), not LaTeX.\n` +
  `- "x: a, b" and "y: c, d" for the visible ranges (pi multiples like -2pi allowed).\n` +
  `- "tangent" for a tangent line on the first function; "area: a, b" to shade the area under ` +
  `the first function between a and b.\n` +
  `ALWAYS give both x and y ranges, framed tightly around what the explanation is about (a point ` +
  `and its neighbourhood, not the default -5..5 where a parabola reaches 25 and flattens everything ` +
  `else). Keep it to what the reader must see: at most 3 curves and a few labelled marks. Use at ` +
  `most one plot and only when it adds understanding.`
