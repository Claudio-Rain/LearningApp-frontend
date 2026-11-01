<template>
  <div class="header-top">
    <div class="header-center">
      <div class="study-subtitle">
        <div class="counter-nav">
          <button class="counter-nav-btn" :disabled="currentIndex === 0" title="Previous card" @click="emit('prev')">&#8249;</button>
          <input
            v-model="jumpInput"
            type="number"
            class="counter-input"
            :min="1"
            :max="total"
            @keydown.enter="submitJump"
            @blur="submitJump"
          />
          <span class="counter-sep">/</span>
          <span class="counter-total">{{ total }}</span>
          <button class="counter-nav-btn" :disabled="total === 0" title="Next card" @click="emit('next')">&#8250;</button>
        </div>
        <span class="stat-badge new-badge" :class="{ glowing: isCurrentNew }">New: {{ newCount }}</span>
        <span class="stat-badge revised-badge" :class="{ glowing: !isCurrentNew }">Revised: {{ revisedCount }}</span>
        <span v-if="strength !== 'new'" class="strength-badge" :class="`strength-${strength}`">
          {{ STRENGTH_TIER_META[strength].label }}
        </span>
      </div>
    </div>
    <div class="header-actions">
      <v-btn v-if="editing" variant="tonal" color="primary" size="small" @click="emit('done')">Done</v-btn>
      <template v-else>
        <v-btn class="header-edit-btn" icon="mdi-plus" variant="text" title="Add question" @click="emit('add')" />
        <template v-if="hasItem">
          <v-btn
            class="header-edit-btn"
            :class="{ 'toggle-active': chatOpen }"
            icon="mdi-chat-question-outline"
            variant="text"
            title="Ask AI about this card"
            @click="emit('toggle-chat')"
          />
        </template>
        <v-btn
          class="header-edit-btn"
          :class="{ 'toggle-active': codeOpen }"
          icon="mdi-code-braces"
          variant="text"
          title="Code scratchpad (K)"
          @click="emit('toggle-code')"
        />
        <template v-if="hasItem">
          <v-btn class="header-edit-btn" icon="mdi-pencil-outline" variant="text" @click="emit('edit')" />
          <v-btn class="header-edit-btn" icon="mdi-delete-outline" variant="text" color="error" @click="emit('delete')" />
          <v-btn class="header-edit-btn" icon="mdi-eye-off-outline" variant="text" color="warning" @click="emit('exclude')" />
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { STRENGTH_TIER_META, type StrengthTier } from '@/utils/strength'

const props = defineProps<{
  currentIndex: number
  total: number
  newCount: number
  revisedCount: number
  isCurrentNew: boolean
  strength: StrengthTier
  editing: boolean
  hasItem: boolean
  chatOpen: boolean
  codeOpen: boolean
}>()

const emit = defineEmits<{
  prev: []
  next: []
  /** Zero-based index of the card to jump to. */
  jump: [index: number]
  add: []
  'toggle-chat': []
  'toggle-code': []
  edit: []
  done: []
  delete: []
  exclude: []
}>()

// The counter doubles as a "jump to card" field: it shows the current position
// and, on Enter or blur, jumps to whatever number was typed.
const jumpInput = ref('1')
watch(() => props.currentIndex, index => {
  jumpInput.value = String(index + 1)
}, { immediate: true })

const submitJump = (e: Event) => {
  const target = Number(jumpInput.value)
  if (!Number.isInteger(target) || props.total === 0) {
    jumpInput.value = String(props.currentIndex + 1)
    return
  }
  const index = Math.min(Math.max(target, 1), props.total) - 1
  jumpInput.value = String(index + 1)
  emit('jump', index)
  if (e.type === 'keydown') (e.target as HTMLInputElement).blur()
}
</script>

<style scoped>
.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.header-center {
  min-width: 0;
  flex: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.toggle-active {
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.12);
}

.study-subtitle {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.counter-nav {
  display: flex;
  align-items: center;
  gap: 3px;
}

.counter-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.58);
  cursor: pointer;
  font-size: 26px;
  font-weight: 300;
  line-height: 1;
  transition: background 0.2s, color 0.2s;
  font-family: inherit;
}

.counter-nav-btn:hover:not(:disabled) {
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.78);
}

.counter-nav-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.counter-input {
  width: 36px;
  border: 1px solid transparent;
  border-radius: 4px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-variant-numeric: tabular-nums;
  background: transparent;
  padding: 1px 2px;
  font-family: inherit;
  appearance: textfield;
  -moz-appearance: textfield;
}

.counter-input::-webkit-outer-spin-button,
.counter-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.counter-input:hover,
.counter-input:focus {
  border-color: rgba(var(--v-theme-on-surface), 0.18);
  outline: none;
  background: rgb(var(--v-theme-surface));
}

.counter-sep,
.counter-total {
  font-size: 13px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-variant-numeric: tabular-nums;
}

.stat-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.new-badge {
  background-color: rgba(var(--v-theme-masteryNew), 0.15);
  color: rgb(var(--v-theme-masteryNew));
}

.revised-badge {
  background-color: rgba(var(--v-theme-masteryGood), 0.15);
  color: rgb(var(--v-theme-masteryGood));
}

.stat-badge.glowing {
  box-shadow: inset 0 0 0 2px currentColor;
  font-weight: 700;
}

.strength-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-left: 6px;
  vertical-align: middle;
}

.strength-weak {
  background: rgba(var(--v-theme-masteryWeak), 0.15);
  color: rgb(var(--v-theme-masteryWeak));
}

.strength-fair {
  background: rgba(var(--v-theme-masteryFair), 0.15);
  color: rgb(var(--v-theme-masteryFair));
}

.strength-good {
  background: rgba(var(--v-theme-masteryGood), 0.15);
  color: rgb(var(--v-theme-masteryGood));
}

.strength-mastered {
  background: rgba(var(--v-theme-masteryMastered), 0.15);
  color: rgb(var(--v-theme-masteryMastered));
}

@media (max-width: 600px) {
  .study-subtitle {
    font-size: 0.7rem;
  }

  .stat-badge {
    font-size: 0.6rem;
    padding: 2px 6px;
  }

  /* The mobile menu takes over these actions. */
  .header-edit-btn {
    display: none;
  }
}
</style>
