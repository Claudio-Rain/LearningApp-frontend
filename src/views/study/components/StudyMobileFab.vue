<template>
  <!-- Phone-width stand-in for the header actions, which are hidden there. -->
  <div class="mobile-fab">
    <div class="mobile-fab-container">
      <div v-if="open" class="fab-actions">
        <v-btn icon="mdi-plus" color="success" size="small" elevation="2" @click="pick('add')" />
        <v-btn icon="mdi-pencil-outline" color="primary" size="small" elevation="2" @click="pick('edit')" />
        <v-btn icon="mdi-delete-outline" color="error" size="small" elevation="2" @click="pick('delete')" />
      </div>
      <v-btn color="surface" elevation="4" icon @click="open = !open">
        <v-icon size="24">{{ open ? 'mdi-close' : 'mdi-cog' }}</v-icon>
      </v-btn>
    </div>
    <div v-if="open" class="fab-overlay" @click="open = false" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

type Action = 'add' | 'edit' | 'delete'

const emit = defineEmits<{
  add: []
  edit: []
  delete: []
}>()

const open = ref(false)

const pick = (action: Action) => {
  open.value = false
  if (action === 'add') emit('add')
  else if (action === 'edit') emit('edit')
  else emit('delete')
}
</script>

<style scoped>
.mobile-fab {
  display: none;
}

@media (max-width: 600px) {
  .mobile-fab {
    display: block;
  }

  .mobile-fab-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    position: fixed;
    bottom: 24px;
    right: 16px;
    z-index: 100;
  }

  .fab-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .fab-overlay {
    position: fixed;
    inset: 0;
    z-index: 99;
  }
}
</style>
