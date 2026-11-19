<!-- CalloutNode.vue -->
<!--
  Node view for `callout` (shared/tiptap/richFormat.ts): a tinted box with an
  icon and title over any blocks. In an editable editor the header becomes a
  type picker, a title field and an "unwrap" button that keeps the content.
-->
<template>
  <node-view-wrapper class="callout" :class="`callout--${variant}`" :data-tone="def.tone">
    <div class="callout__header" contenteditable="false">
      <template v-if="editable">
        <v-menu location="bottom start">
          <template #activator="{ props: menuProps }">
            <button v-bind="menuProps" type="button" class="callout__type" title="Change box type">
              <v-icon size="18">{{ def.icon }}</v-icon>
              <v-icon size="14" class="callout__caret">mdi-chevron-down</v-icon>
            </button>
          </template>
          <v-list density="compact" class="callout__menu">
            <v-list-item
              v-for="v in CALLOUT_VARIANTS"
              :key="v"
              :active="v === variant"
              :prepend-icon="CALLOUTS[v].icon"
              :title="CALLOUTS[v].label"
              :class="`callout-tone--${CALLOUTS[v].tone}`"
              @click="updateAttributes({ variant: v })"
            />
          </v-list>
        </v-menu>
        <input
          class="callout__title-input"
          :value="title"
          :placeholder="def.label"
          spellcheck="false"
          @change="onTitle"
          @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
        />
        <button type="button" class="callout__unwrap" title="Remove the box, keep the text" @click="unwrap">
          <v-icon size="16">mdi-close</v-icon>
        </button>
      </template>
      <template v-else>
        <v-icon size="18">{{ def.icon }}</v-icon>
        <MathText class="callout__title" :text="title || def.label" />
      </template>
    </div>
    <node-view-content class="callout__body" />
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import MathText from './MathText.vue'
import { CALLOUTS, CALLOUT_VARIANTS, isCalloutVariant } from '@/utils/richFormat'

const props = defineProps(nodeViewProps)

const variant = computed(() => (isCalloutVariant(props.node.attrs.variant) ? props.node.attrs.variant : 'note'))
const def = computed(() => CALLOUTS[variant.value])
const title = computed<string>(() => props.node.attrs.title ?? '')
const editable = computed(() => props.editor.isEditable)

function onTitle(event: Event) {
  props.updateAttributes({ title: (event.target as HTMLInputElement).value.trim() })
}

// Replace the box with its own blocks.
function unwrap() {
  const pos = props.getPos()
  if (typeof pos !== 'number') return
  const { state, view } = props.editor
  view.dispatch(state.tr.replaceWith(pos, pos + props.node.nodeSize, props.node.content))
  view.focus()
}
</script>
