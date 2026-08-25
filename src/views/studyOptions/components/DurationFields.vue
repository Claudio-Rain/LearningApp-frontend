<template>
  <div class="d-flex duration-row">
    <v-text-field
      v-model.number="minutes"
      type="number"
      min="0"
      label="Minutes"
      suffix="min"
      variant="outlined"
      density="comfortable"
      :loading="loading"
      :disabled="disabled"
      hide-details
    />
    <v-text-field
      v-model.number="seconds"
      type="number"
      min="0"
      max="59"
      label="Seconds"
      suffix="sec"
      variant="outlined"
      density="comfortable"
      :loading="loading"
      :disabled="disabled"
      hide-details
    />
  </div>
</template>

<script setup lang="ts">
// A minutes + seconds pair of number inputs, paired with useDurationFields().
// The `.number` modifiers let a partially-cleared field stay empty while the
// user retypes; useDurationFields() coerces to a number when totalling.
const minutes = defineModel<number>('minutes', { required: true })
const seconds = defineModel<number>('seconds', { required: true })

withDefaults(
  defineProps<{
    loading?: boolean
    disabled?: boolean
  }>(),
  { loading: false, disabled: false }
)
</script>

<style scoped>
.duration-row {
  gap: 12px;
}

@media (max-width: 400px) {
  .duration-row {
    flex-direction: column !important;
    gap: 0 !important;
  }
}
</style>
