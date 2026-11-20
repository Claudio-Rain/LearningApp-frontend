<!-- FunctionPlotNode.vue -->
<!--
  Node view for `functionPlot` (shared/tiptap/plot.ts). Draws the plot with
  function-plot (see shared/tiptap/plotDraw.ts) and lets you explore it: the
  plot sits behind a shield until clicked, so scrolling a card or swiping on a
  phone never gets trapped by the chart's own pan/zoom. Even then a plain mouse
  wheel keeps scrolling the page; zooming takes Ctrl/⌘ + wheel or a trackpad
  pinch. Named curves get a legend; the title and legend render $...$ math.
  In an editable editor, "Edit" opens a small form whose changes preview live
  and are saved with Done.
-->
<template>
  <node-view-wrapper
    class="fplot"
    :class="{ 'fplot--selected': selected, 'fplot--active': active }"
  >
    <!-- eslint-disable-next-line vue/no-v-html -- richTextHtml escapes text and KaTeX escapes math -->
    <div v-if="shown.title" class="fplot__title" contenteditable="false" v-html="richTextHtml(shown.title)" />

    <!-- Clicks stay here: a flashcard flips on any click, and exploring the
         plot on the back of a card shouldn't turn it over. -->
    <div
      ref="frame"
      class="fplot__frame"
      contenteditable="false"
      @click.stop
      @wheel.capture="onWheel"
    >
      <div ref="target" class="fplot__target" />

      <div v-if="error" class="fplot__message fplot__message--error">Couldn't plot {{ error }}</div>
      <div v-else-if="!shown.functions.length" class="fplot__message">Empty plot</div>

      <button
        v-if="!active && !error && shown.functions.length"
        type="button"
        class="fplot__shield"
        @click="activate"
      >
        <span class="fplot__hint">Click to explore · drag to move · Ctrl + scroll to zoom</span>
      </button>

      <div class="fplot__tools">
        <!-- Shown whenever the view was moved, even after leaving explore mode,
             so a stray zoom can always be undone. -->
        <button v-if="viewMoved" type="button" class="fplot__tool fplot__tool--text" title="Back to the original view" @click="draw">
          <v-icon size="16">mdi-restore</v-icon>
          <span>Reset view</span>
        </button>
        <button v-if="editable && !editing" type="button" class="fplot__tool" title="Edit plot" @click="startEdit">
          <v-icon size="16">mdi-pencil</v-icon>
        </button>
      </div>
    </div>

    <div v-if="legend.length" class="fplot__legend" contenteditable="false">
      <span v-for="item in legend" :key="item.index" class="fplot__legend-item">
        <i class="fplot__swatch" :class="{ 'fplot__swatch--dot': item.dot }" :style="{ background: item.color }" />
        <!-- eslint-disable-next-line vue/no-v-html -- see the title above -->
        <span v-html="richTextHtml(item.label)" />
      </span>
    </div>

    <!-- Drag a slider and the curves redraw with that value. Clicks stay here
         too (a flashcard flips on any click). Not saved: every viewer starts
         from the values the plot was written with. -->
    <div v-if="params.length" class="fplot__sliders" contenteditable="false" @click.stop>
      <label v-for="p in params" :key="p.name" class="fplot__slider">
        <span class="fplot__slider-name">
          <!-- eslint-disable-next-line vue/no-v-html -- see the title above -->
          <span v-if="p.label" class="fplot__slider-label" v-html="richTextHtml(p.label)" />
          <code>{{ p.name }} = {{ formatValue(valueOf(p), p) }}</code>
        </span>
        <input
          type="range"
          :min="p.min"
          :max="p.max"
          :step="stepOf(p)"
          :value="valueOf(p)"
          @input="setValue(p.name, $event)"
        />
      </label>
      <button
        v-if="slidersMoved"
        type="button"
        class="fplot__tool fplot__tool--text fplot__slider-reset"
        title="Back to the starting values"
        @click="resetValues"
      >
        <v-icon size="16">mdi-restore</v-icon>
        <span>Reset</span>
      </button>
    </div>

    <div v-if="editing" class="fplot__form" contenteditable="false" @keydown.esc.prevent="cancel">
      <label class="fplot__field fplot__field--wide">
        <span>Title (optional, $…$ for math)</span>
        <input v-model="draft.title" placeholder="ε-δ definition for $f(x) = x^2$" spellcheck="false" />
      </label>
      <label class="fplot__field fplot__field--wide">
        <span>Functions of x, one per line — a "name" in quotes labels the curve</span>
        <textarea
          ref="firstField"
          v-model="draft.functions"
          rows="2"
          spellcheck="false"
          placeholder="x^2 &quot;f(x)&quot;&#10;1.5 &quot;L + ε&quot;"
        />
      </label>
      <label class="fplot__field fplot__field--wide">
        <span>Points, guide lines and sliders (optional), one per line</span>
        <textarea
          v-model="draft.marks"
          rows="3"
          spellcheck="false"
          placeholder="point: 1, 1 &quot;(a, L)&quot;&#10;hline: 1.5 &quot;L + ε&quot;&#10;slider: a = 1, -3..3 &quot;amplitude&quot;"
        />
      </label>
      <div class="fplot__row">
        <label class="fplot__field">
          <span>x from</span><input v-model="draft.xFrom" placeholder="-5" spellcheck="false" />
        </label>
        <label class="fplot__field">
          <span>x to</span><input v-model="draft.xTo" placeholder="5" spellcheck="false" />
        </label>
        <label class="fplot__field">
          <span>y from</span><input v-model="draft.yFrom" placeholder="auto" spellcheck="false" />
        </label>
        <label class="fplot__field">
          <span>y to</span><input v-model="draft.yTo" placeholder="auto" spellcheck="false" />
        </label>
      </div>
      <div class="fplot__row">
        <label class="fplot__check">
          <input v-model="draft.tangent" type="checkbox" />
          <span>Tangent line (follows the pointer)</span>
        </label>
        <label class="fplot__field">
          <span>Area from</span><input v-model="draft.areaFrom" placeholder="—" spellcheck="false" />
        </label>
        <label class="fplot__field">
          <span>Area to</span><input v-model="draft.areaTo" placeholder="—" spellcheck="false" />
        </label>
      </div>
      <p class="fplot__help">
        Write <code>x^2</code>, <code>3x</code>, <code>sqrt(x)</code>, <code>sin(x)</code>, <code>ln(x)</code>,
        <code>e^x</code>, <code>pi</code> — always with parentheses: <code>sin(x)</code>, not <code>sin x</code>.
        Numbers accept <code>-2pi</code> or <code>pi/2</code>. Tangent and area apply to the first function.
        <code>vline</code> is vertical (x = …), <code>hline</code> horizontal (y = …).
        Write a sequence in <code>n</code> (e.g. <code>(-1)^n/n</code>) to draw it as dots at whole n.
        <code>slider: a = 1, -3..3</code> adds a slider for <code>a</code>, to use in the functions
        (<code>a*sin(x)</code>).
      </p>
      <div class="fplot__actions">
        <button type="button" class="fplot__btn fplot__btn--danger" @click="deleteNode()">Delete</button>
        <span class="fplot__spacer" />
        <button type="button" class="fplot__btn" @click="cancel">Cancel</button>
        <button type="button" class="fplot__btn fplot__btn--primary" @click="commit">Done</button>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import functionPlot, { type Chart } from 'function-plot'
import 'katex/dist/katex.min.css'
import {
  formatNumber,
  isSequence,
  markLines,
  parseNumber,
  parsePlotSpec,
  sliderLines,
  type PlotParam,
  type PlotSpec,
} from '@/utils/plotSpec'
import { COLORS, buildPlot, richTextHtml } from '../tiptap/plotDraw'

const props = defineProps(nodeViewProps)

const frame = ref<HTMLElement | null>(null)
const target = ref<HTMLElement | null>(null)
const firstField = ref<HTMLTextAreaElement | null>(null)
const error = ref('')
const active = ref(false)
const editing = ref(false)
const width = ref(0)
/** True once the user has panned or zoomed away from the saved view. */
const viewMoved = ref(false)

const editable = computed(() => props.editor.isEditable)

const saved = computed<PlotSpec>(() => {
  const a = props.node.attrs
  return {
    functions: a.functions ?? [],
    labels: a.labels ?? undefined,
    title: a.title ?? undefined,
    points: a.points ?? undefined,
    lines: a.lines ?? undefined,
    xDomain: a.xDomain ?? null,
    yDomain: a.yDomain ?? null,
    tangent: !!a.tangent,
    area: a.area ?? null,
    params: a.params ?? undefined,
  }
})

// --- editing ---------------------------------------------------------------

const draft = reactive({
  title: '',
  functions: '',
  marks: '',
  xFrom: '',
  xTo: '',
  yFrom: '',
  yTo: '',
  tangent: false,
  areaFrom: '',
  areaTo: '',
})

const fmt = (n: number | undefined) => (n === undefined ? '' : formatNumber(n))

const rangeFrom = (from: string, to: string): [number, number] | null => {
  const lo = parseNumber(from)
  const hi = parseNumber(to)
  if (lo === null || hi === null || lo === hi) return null
  return lo < hi ? [lo, hi] : [hi, lo]
}

// The two textareas use the ```plot text syntax, so one parser serves both
// Claude's blocks and the form.
const draftSpec = computed<PlotSpec>(() => {
  const parsed = parsePlotSpec(`${draft.functions}\n${draft.marks}`)
  return {
    functions: parsed?.functions ?? [],
    labels: parsed?.labels,
    title: draft.title.trim() || undefined,
    points: parsed?.points,
    lines: parsed?.lines,
    xDomain: rangeFrom(draft.xFrom, draft.xTo),
    yDomain: rangeFrom(draft.yFrom, draft.yTo),
    tangent: draft.tangent,
    area: rangeFrom(draft.areaFrom, draft.areaTo),
    params: parsed?.params,
  }
})

/** What's on screen: the live draft while editing, the saved attrs otherwise. */
const shown = computed(() => (editing.value ? draftSpec.value : saved.value))

const legend = computed(() =>
  shown.value.functions
    .map((fn, i) => ({
      index: i,
      label: shown.value.labels?.[i] ?? '',
      color: COLORS[i % COLORS.length],
      dot: isSequence(fn),
    }))
    .filter(item => item.label)
)

function startEdit() {
  const s = saved.value
  Object.assign(draft, {
    title: s.title ?? '',
    functions: s.functions.length
      ? s.functions.map((fn, i) => (s.labels?.[i] ? `${fn} "${s.labels[i]}"` : fn)).join('\n')
      : 'x^2',
    marks: [...markLines(s), ...sliderLines(s)].join('\n'),
    xFrom: fmt(s.xDomain?.[0]),
    xTo: fmt(s.xDomain?.[1]),
    yFrom: fmt(s.yDomain?.[0]),
    yTo: fmt(s.yDomain?.[1]),
    tangent: !!s.tangent,
    areaFrom: fmt(s.area?.[0]),
    areaTo: fmt(s.area?.[1]),
  })
  editing.value = true
  nextTick(() => firstField.value?.focus())
}

function commit() {
  const s = draftSpec.value
  if (!s.functions.length) {
    props.deleteNode()
    return
  }
  editing.value = false
  // Every attr explicitly: updateAttributes merges, so a field left out would
  // keep its old value instead of being cleared.
  props.updateAttributes({
    functions: s.functions,
    labels: s.labels ?? null,
    title: s.title ?? null,
    points: s.points ?? null,
    lines: s.lines ?? null,
    xDomain: s.xDomain ?? null,
    yDomain: s.yDomain ?? null,
    tangent: !!s.tangent,
    area: s.area ?? null,
    params: s.params ?? null,
  })
}

function cancel() {
  editing.value = false
  // A plot that was never filled in has nothing to go back to.
  if (!saved.value.functions.length) props.deleteNode()
}

// --- sliders -----------------------------------------------------------------

const params = computed<PlotParam[]>(() => shown.value.params ?? [])

// Where each slider sits now; a name missing here is at its starting value.
const values = reactive<Record<string, number>>({})

const valueOf = (p: PlotParam) => values[p.name] ?? p.value

// About 200 positions across the range, on a round number.
const stepOf = (p: PlotParam) => {
  const raw = (p.max - p.min) / 200
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  return [1, 2, 5, 10].map(k => k * magnitude).find(s => s >= raw) ?? raw
}

const formatValue = (v: number, p: PlotParam) => {
  const decimals = Math.max(0, -Math.floor(Math.log10(stepOf(p))))
  return v.toFixed(Math.min(decimals, 4))
}

function setValue(name: string, event: Event) {
  values[name] = Number((event.target as HTMLInputElement).value)
}

const slidersMoved = computed(() => params.value.some(p => valueOf(p) !== p.value))

function resetValues() {
  for (const key of Object.keys(values)) delete values[key]
}

// A changed set of sliders (an edit, or another card) starts from its own values.
watch(() => JSON.stringify(params.value), resetValues)

// --- drawing ---------------------------------------------------------------

let chart: Chart | null = null

// function-plot's left margin is a fixed 40px, too narrow for 13px numbers
// like "-0.25"; this much extra room (matching .fplot__target's padding)
// keeps them from being clipped.
const AXIS_GUTTER = 14

const clear = () => {
  chart?.removeAllListeners()
  chart = null
  if (target.value) target.value.innerHTML = ''
}

// How far the view can go from where the plot was drawn: 3× out, 50× in, and
// panned at most one plot-width/height past any edge. Without limits one
// flick of the wheel threw the curve off into the thousands, nowhere in sight.
const MIN_ZOOM = 1 / 3
const MAX_ZOOM = 50

// d3-zoom's own wheel step, minus its ×10 boost for Ctrl — and Ctrl is what
// we ask for to zoom, so every notch was a huge jump. A trackpad pinch (also
// sent as Ctrl + wheel) gives small deltas, so those get a gentler boost.
const wheelDelta = (event: WheelEvent) => {
  const unit = event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002
  const pinch = Math.abs(event.deltaY) < 40 ? 4 : 1
  return -event.deltaY * unit * pinch
}

interface ZoomBehavior {
  scaleExtent(extent: [number, number]): ZoomBehavior
  translateExtent(extent: [[number, number], [number, number]]): ZoomBehavior
  wheelDelta(delta: (event: WheelEvent) => number): ZoomBehavior
}

function tameZoom(c: Chart, w: number, h: number) {
  const zoom = (c as unknown as { meta?: { zoomBehavior?: ZoomBehavior } }).meta?.zoomBehavior
  zoom
    ?.scaleExtent([MIN_ZOOM, MAX_ZOOM])
    .translateExtent([
      [-w, -h],
      [2 * w, 2 * h],
    ])
    .wheelDelta(wheelDelta)
}

function draw() {
  clear()
  error.value = ''
  viewMoved.value = false
  const el = target.value
  const spec = shown.value
  if (!el || !width.value || !spec.functions.length) return

  // The frame is capped in CSS, so this keeps a readable ~8:5 shape.
  const plotWidth = width.value - AXIS_GUTTER
  const height = Math.round(Math.min(460, Math.max(220, width.value * 0.62)))
  const built = buildPlot(spec, plotWidth, height, { ...values })
  if ('error' in built) {
    error.value = built.error
    return
  }
  try {
    chart = functionPlot({ ...built.options, target: el, width: plotWidth, height })
    tameZoom(chart, plotWidth, height)
    chart.on('zoom', () => {
      viewMoved.value = true
    })
  } catch (e) {
    clear()
    error.value = e instanceof Error ? e.message : String(e)
  }
}

// Redraw at most once per frame, whatever triggered it.
let pending = 0
const scheduleDraw = () => {
  cancelAnimationFrame(pending)
  pending = requestAnimationFrame(draw)
}

watch(shown, scheduleDraw, { deep: true })
watch(values, scheduleDraw)

let observer: ResizeObserver | null = null

// --- explore mode ----------------------------------------------------------

function activate() {
  active.value = true
}

// A plain wheel scrolls the page, never the plot: stopping it here, on the
// way down, keeps it from reaching the chart's zoom handler. Ctrl/⌘ + wheel
// (which is also what a trackpad pinch sends) still zooms.
function onWheel(event: WheelEvent) {
  if (!event.ctrlKey && !event.metaKey) event.stopPropagation()
}

// Any press outside the plot puts the shield back.
const onPointerDown = (event: PointerEvent) => {
  if (active.value && frame.value && !frame.value.contains(event.target as Node)) active.value = false
}

onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    const w = Math.floor(entry!.contentRect.width)
    if (w && w !== width.value) {
      width.value = w
      scheduleDraw()
    }
  })
  if (frame.value) observer.observe(frame.value)
  document.addEventListener('pointerdown', onPointerDown, true)

  // A freshly inserted plot has no functions yet: open the form straight away.
  if (editable.value && !saved.value.functions.length) startEdit()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(pending)
  observer?.disconnect()
  document.removeEventListener('pointerdown', onPointerDown, true)
  clear()
})
</script>

<style lang="scss">
.fplot {
  margin: 1rem 0;

  &__title {
    max-width: 760px;
    margin: 0 auto 6px;
    font-weight: 600;
    text-align: center;
  }

  &__frame {
    position: relative;
    // Past this a plot gets so wide it reads as a flat line, and
    // function-plot scales its text with the width.
    max-width: 760px;
    margin: 0 auto;
    min-height: 60px;
    border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
    border-radius: 10px;
    overflow: hidden;
    color: rgba(var(--v-theme-on-surface), 0.75);
    background: rgb(var(--v-theme-surface));
  }

  &--selected &__frame {
    outline: 2px solid rgba(var(--v-theme-primary), 0.5);
  }

  &--active &__frame {
    border-color: rgba(var(--v-theme-primary), 0.6);
  }

  &__target {
    // Room for wide y-axis numbers; see AXIS_GUTTER.
    padding-left: 14px;

    // function-plot draws with hard-coded black in places; follow the theme.
    svg {
      overflow: visible;
      display: block;
      font-family: inherit;
    }

    // The library sets font-size = width / 50 on the root svg; CSS wins over
    // that attribute and keeps the pointer readout a normal size.
    svg.function-plot {
      font-size: 13px;
    }

    // d3-axis hard-codes 10px tick numbers on the axis group; far too small
    // to read at a glance.
    .axis {
      font-size: 13px;
    }

    .tick text {
      font-size: 13px;
      fill: currentColor;
    }

    .origin {
      stroke: currentColor;
      opacity: 0.35;
    }

    .tick line {
      stroke: currentColor;
      opacity: 0.12;
    }

    .domain {
      stroke: currentColor;
      opacity: 0.4;
    }

    .tip-x-line,
    .tip-y-line {
      stroke: currentColor;
    }

    .annotations path {
      stroke: currentColor;
      stroke-dasharray: 4 3;
      opacity: 0.55;
    }

    // Curves at 1px look scratchy; 2px reads as a drawn line. The tangent is
    // a helper, so it stays thinner and dashed.
    .graph path.line {
      stroke-width: 2.25px;
    }

    .derivative path.line {
      stroke-width: 1.5px;
      stroke-dasharray: 6 4;
    }

    .fplot-point {
      stroke: rgb(var(--v-theme-surface));
      stroke-width: 1.5px;
    }

    // Curve and point names: a halo in the background colour keeps them
    // readable where they cross grid lines or other curves.
    .fn-text {
      paint-order: stroke;
      stroke: rgb(var(--v-theme-surface));
      stroke-width: 3px;
    }
  }

  &__legend {
    max-width: 760px;
    margin: 6px auto 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px 16px;
    font-size: 0.85rem;
  }

  &__legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  &__sliders {
    max-width: 760px;
    margin: 10px auto 0;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 10px 24px;
  }

  &__slider {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1 1 200px;
    min-width: 0;
    font-size: 0.85rem;

    input[type='range'] {
      width: 100%;
      accent-color: rgb(var(--v-theme-primary));
      cursor: pointer;
    }
  }

  &__slider-name {
    display: flex;
    align-items: baseline;
    gap: 8px;

    code {
      font-size: 0.9em;
      font-variant-numeric: tabular-nums;
      color: rgba(var(--v-theme-on-surface), 0.75);
    }
  }

  &__slider-label {
    color: rgba(var(--v-theme-on-surface), 0.85);
  }

  &__slider-reset {
    flex: 0 0 auto;
  }

  &__swatch {
    display: inline-block;
    width: 16px;
    height: 3px;
    border-radius: 2px;

    &--dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
  }

  &__message {
    padding: 1rem;
    font-size: 0.85rem;
    color: rgba(var(--v-theme-on-surface), 0.55);

    &--error {
      color: rgb(var(--v-theme-error));
      font-family: 'JetBrainsMono', monospace;
    }
  }

  &__shield {
    position: absolute;
    inset: 0;
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: flex-end;
    justify-content: center;

    &:hover .fplot__hint,
    &:focus-visible .fplot__hint {
      opacity: 1;
    }
  }

  &__hint {
    margin-bottom: 10px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.75rem;
    background: rgba(var(--v-theme-on-surface), 0.75);
    color: rgb(var(--v-theme-surface));
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  &__tools {
    position: absolute;
    top: 6px;
    right: 6px;
    display: flex;
    gap: 4px;
  }

  &__tool {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
    background: rgb(var(--v-theme-surface));
    color: rgba(var(--v-theme-on-surface), 0.7);
    cursor: pointer;

    &:hover {
      background: rgba(var(--v-theme-on-surface), 0.06);
    }

    &--text {
      width: auto;
      gap: 4px;
      padding: 0 8px;
      font-size: 0.75rem;
    }
  }

  &__form {
    max-width: 760px;
    margin: 8px auto 0;
    padding: 10px 12px;
    border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 0.85rem;
  }

  &__row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: flex-end;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1 1 70px;
    min-width: 0;

    &--wide {
      flex-basis: 100%;
    }

    span {
      font-size: 0.75rem;
      color: rgba(var(--v-theme-on-surface), 0.6);
    }

    input,
    textarea {
      border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
      border-radius: 6px;
      padding: 4px 8px;
      background: rgba(var(--v-theme-on-surface), 0.03);
      color: inherit;
      font-family: 'JetBrainsMono', monospace;
      font-size: 0.85rem;
      outline: none;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;

      &:focus {
        border-color: rgb(var(--v-theme-primary));
      }
    }

    textarea {
      resize: vertical;
    }
  }

  &__check {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 2 1 220px;
    padding-bottom: 6px;
  }

  &__help {
    margin: 0;
    font-size: 0.75rem;
    color: rgba(var(--v-theme-on-surface), 0.6);

    code {
      font-size: 0.95em;
    }
  }

  &__actions {
    display: flex;
    gap: 6px;
  }

  &__spacer {
    flex: 1;
  }

  &__btn {
    padding: 4px 12px;
    border-radius: 6px;
    border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
    background: transparent;
    color: inherit;
    cursor: pointer;

    &:hover {
      background: rgba(var(--v-theme-on-surface), 0.06);
    }

    &--primary {
      background: rgb(var(--v-theme-primary));
      border-color: rgb(var(--v-theme-primary));
      color: rgb(var(--v-theme-on-primary));

      &:hover {
        background: rgba(var(--v-theme-primary), 0.85);
      }
    }

    &--danger {
      color: rgb(var(--v-theme-error));
    }
  }
}
</style>
