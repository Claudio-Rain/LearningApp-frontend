<template>
  <v-dialog v-model="open" max-width="340">
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text>
        <slot />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="open = false">Cancel</v-btn>
        <v-btn :color="color" variant="tonal" :loading="loading" @click="emit('confirm')">{{ confirmLabel }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
/** A small yes/cancel dialog for actions on the current card. */
const open = defineModel<boolean>({ required: true })

defineProps<{
  title: string
  confirmLabel: string
  color: string
  loading?: boolean
}>()

const emit = defineEmits<{ confirm: [] }>()
</script>
