// Formatting conventions the app can render, told to Claude wherever its
// markdown ends up on a card (see utils/markdown.ts for the parsing side).

const MATH_GUIDE =
  `Math: LaTeX, $...$ inline and $$...$$ for display equations. Inside math you may use ` +
  `\\boxed{...} for the final answer and \\color{blue}{...} to mark the step that changes (only blue, green, red, orange, purple or ` +
  `teal, which follow the light/dark theme). Write ` +
  `symbols directly (✓, →) or as LaTeX commands (\\checkmark); never as escapes like \\u2713.`

const EMPHASIS_GUIDE =
  `Emphasis beyond bold: ==text== highlights (yellow); ==text=={.green} picks the highlighter colour ` +
  `(yellow, green, blue, pink, purple, orange); [text]{.blue} colours text (blue, green, red, orange, ` +
  `purple, teal). Use them sparingly and consistently — e.g. one colour for what's given and another ` +
  `for what's found — so they carry meaning instead of decoration.`

const CALLOUT_GUIDE =
  `Callout boxes: a blockquote whose first line is "[!TYPE] optional title", e.g.\n` +
  `> [!THEOREM] Integration by parts\n` +
  `> $$\\int u\\,dv = uv - \\int v\\,du$$\n` +
  `Types: DEFINITION, THEOREM (key result/formula to remember), TIP (intuition, the idea behind it), ` +
  `WARNING (common mistake), EXAMPLE (worked example), SUMMARY, NOTE. A box may hold text, lists, ` +
  `math and plots. Use a few per answer where they structure it — the key formula, the classic ` +
  `mistake — not around every paragraph.`

const PLOT_GUIDE =
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
  `- "slider: a = 1, -3..3 \\"amplitude\\"" adds a slider the reader drags to change a parameter ` +
  `live (start value, then range); use the name in the functions, e.g. y = a*sin(b*x). Up to 4. ` +
  `Use sliders when the point is how a parameter shapes the curve (amplitude, slope, growth ` +
  `rate, a in a·x² + b, the n of a Taylor polynomial…), not for a fixed picture.\n` +
  `ALWAYS give both x and y ranges, framed tightly around what the explanation is about (a point ` +
  `and its neighbourhood, not the default -5..5 where a parabola reaches 25 and flattens everything ` +
  `else). Keep it to what the reader must see: at most 3 curves and a few labelled marks. Use at ` +
  `most one plot and only when it adds understanding.`

const DIAGRAM_GUIDE =
  `When a picture of structure would make the idea click — steps of a process or algorithm, cause ` +
  `and effect, how parts relate, who does what in what order, a hierarchy or classification, a ` +
  `timeline, states and transitions, proportions — you may add a diagram as a fenced block with the ` +
  `language "mermaid" holding Mermaid syntax (flowchart, sequenceDiagram, mindmap, timeline, ` +
  `stateDiagram-v2, classDiagram, erDiagram, pie, quadrantChart…). Pick the type that fits the ` +
  `subject. Keep it small and readable: about 12 nodes at most, short labels, labels with ` +
  `punctuation in double quotes (A["Step 1: f(x)"]). Don't set colours, themes or %%{init}%% ` +
  `directives — the app styles it. Graphs of functions go in a plot, not a diagram. Use at most one ` +
  `or two per answer and only when they add understanding; never draw diagrams as ASCII art.`

export const RICH_FORMAT_GUIDE =
  `Formatting — the app renders all of this:\n` +
  `- ${MATH_GUIDE}\n` +
  `- ${EMPHASIS_GUIDE}\n` +
  `- ${CALLOUT_GUIDE}\n` +
  `- ${PLOT_GUIDE}\n` +
  `- ${DIAGRAM_GUIDE}`
