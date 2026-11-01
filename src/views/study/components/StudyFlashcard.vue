<template>
  <div class="flashcard-wrapper">
    <div class="flashcard" :class="{ flipped }" @click="emit('flip')">
      <!-- Front (question) -->
      <div class="card-side front">
        <div class="card-content">
          <TiptapDisplay
            v-if="item.titleContent"
            class="title-display title-display--rich"
            :content="item.titleContent"
          />
          <h2 v-else class="title-display">{{ item.title }}</h2>
        </div>
      </div>

      <!-- Back (answer) -->
      <div class="card-side back">
        <div v-if="flipped" class="card-content">
          <TiptapDisplay :content="item.content || EMPTY_DOC" />
        </div>
      </div>
    </div>

    <template v-if="flipped">
      <div class="rating-buttons">
        <v-btn
          v-for="r in RATING_BUTTONS"
          :key="r.label"
          :color="r.color"
          variant="tonal"
          size="large"
          @click="emit('rate', r.ease)"
        >
          <v-icon start>{{ r.icon }}</v-icon>
          {{ r.label }}
        </v-btn>
      </div>

      <!-- Shortcuts that move a card all the way in one rating, instead of
           nudging it 0.10-0.15 at a time. -->
      <div class="jump-row">
        <v-btn color="grey-darken-1" variant="text" size="small" title="Reset strength to 0 (press 0)" @click="emit('rate', EASE.reset)">
          <v-icon start size="18">mdi-restart</v-icon>
          Start over
        </v-btn>
        <v-btn color="success" variant="text" size="small" title="Mark as fully mastered (press 9)" @click="emit('rate', EASE.learned)">
          <v-icon start size="18">mdi-check-all</v-icon>
          Learned
        </v-btn>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import TiptapDisplay from '@/shared/components/TiptapDisplay.vue'
import { EASE, RATING_BUTTONS } from '../ratings'
import type { StudyItem } from '../types'

defineProps<{
  item: StudyItem
  flipped: boolean
}>()

const emit = defineEmits<{
  flip: []
  rate: [ease: number]
}>()

const EMPTY_DOC = { type: 'doc', content: [] }
</script>

<style scoped>
.flashcard-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 800px;
  gap: 8px;
  flex: 1;
  min-height: 0;
  padding: 4px 16px;
}

.flashcard {
  width: 100%;
  flex: 1;
  background: rgb(var(--v-theme-surface));
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  min-height: 120px;
}

.card-side {
  position: absolute;
  width: 100%;
  height: 100%;
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}

.front {
  z-index: 2;
}

.back {
  color: inherit;
  opacity: 0;
  z-index: 1;
}

.flashcard.flipped .front {
  opacity: 0;
  z-index: 1;
}

.flashcard.flipped .back {
  opacity: 1;
  z-index: 2;
}

.card-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  font-size: 1.2rem;
  line-height: 1.4;
}

.title-display {
  margin: auto;
  font-size: clamp(1.1rem, 3vw, 2rem);
  font-weight: 600;
  line-height: 1.3;
  color: rgba(var(--v-theme-on-surface), 0.87);
  text-align: center;
  word-break: break-word;
}

/* A rich title keeps the heading type scale for its prose, but a code block or
   an image inside it reads as content and gets its own size and alignment. */
.title-display--rich {
  width: 100%;
}

.title-display--rich :deep(p) {
  font-size: inherit;
  font-weight: inherit;
  margin: 0.25rem 0;
}

.title-display--rich :deep(pre) {
  font-size: 0.85rem;
  font-weight: 400;
  text-align: left;
  margin: 0.75rem 0;
}

.title-display--rich :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0.5rem auto;
  border-radius: 6px;
}

.rating-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  width: 100%;
}

@media (min-width: 700px) {
  .rating-buttons {
    grid-template-columns: repeat(4, 1fr);
  }
}

.jump-row {
  display: flex;
  justify-content: center;
  gap: 12px;
  width: 100%;
}

.jump-row .v-btn {
  text-transform: none;
  letter-spacing: normal;
}

@media (max-width: 600px) {
  .flashcard-wrapper {
    padding: 8px 12px;
  }

  .title-display {
    font-size: 1.3rem;
  }

  .rating-buttons {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  .rating-buttons .v-btn {
    font-size: 0.75rem;
  }
}
</style>
