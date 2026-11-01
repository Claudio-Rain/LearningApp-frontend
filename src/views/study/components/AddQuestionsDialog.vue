<template>
  <v-dialog v-model="open" max-width="400">
    <v-card>
      <v-card-title>New questions</v-card-title>
      <v-card-text>
        <div v-for="(_, i) in titleList" :key="i" class="add-question-row">
          <v-text-field
            :ref="el => setFieldRef(el, i)"
            v-model="titleList[i]"
            :label="titleList.length > 1 ? `Question ${i + 1}` : 'What do you want to learn?'"
            variant="outlined"
            density="compact"
            :autofocus="i === 0"
            hide-details
            @keydown.enter.prevent="addField(i)"
          />
          <v-btn
            v-if="titleList.length > 1"
            icon="mdi-close"
            variant="text"
            size="x-small"
            title="Remove question"
            @click="removeField(i)"
          />
        </div>
        <v-btn
          variant="text"
          color="primary"
          size="small"
          prepend-icon="mdi-plus"
          class="mb-2"
          @click="addField(titleList.length - 1)"
        >
          Add another question
        </v-btn>
        <v-select
          v-model="collectionId"
          :items="collections"
          item-title="title"
          item-value="id"
          label="Collection"
          variant="outlined"
          density="compact"
          hide-details="auto"
          class="mb-3"
        />
        <v-checkbox
          v-model="autoAnswer"
          label="Auto-answer with Claude in the background"
          density="compact"
          hide-details
        />
        <div v-if="error" class="add-error">{{ error }}</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="open = false">Cancel</v-btn>
        <v-btn color="primary" variant="tonal" :loading="creating" @click="submit">
          {{ titles.length > 1 ? `Create ${titles.length}` : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
// "New question" dialog — mirrors the content widget's add panel: create the
// items right away, let Claude fill in the answers in the background.
import { ref, computed, watch, nextTick } from 'vue'
import { getCollections } from '@/database'
import type { Collection } from '@/database/types'
import { ensureApiKey } from '@/utils/claude'
import type { CardFactory } from '../composables/useCardFactory'
import type { StudyItem } from '../types'

const open = defineModel<boolean>({ required: true })

const props = defineProps<{
  cards: CardFactory
  /** Collection to preselect, typically the one of the card being studied. */
  preferredCollectionId: string | null
}>()

const emit = defineEmits<{
  notify: [message: string, error?: boolean]
}>()

const titleList = ref<string[]>([''])
const collectionId = ref<string | null>(null)
const autoAnswer = ref(true)
const error = ref('')
const creating = ref(false)
const collections = ref<Collection[]>([])

// One question per non-empty box.
const titles = computed(() => titleList.value.map(t => t.trim()).filter(Boolean))

// Track the field components so a newly added box can be focused.
type Focusable = { focus?: () => void } | null
const fieldRefs = ref<Focusable[]>([])
const setFieldRef = (el: unknown, i: number) => {
  fieldRefs.value[i] = el as Focusable
}

// Insert a new box after index `i` and focus it (Enter key / "Add another").
const addField = async (i: number) => {
  titleList.value.splice(i + 1, 0, '')
  await nextTick()
  fieldRefs.value[i + 1]?.focus?.()
}

const removeField = (i: number) => {
  titleList.value.splice(i, 1)
  fieldRefs.value.splice(i, 1)
}

// Every opening starts from a blank form.
watch(open, async isOpen => {
  if (!isOpen) return
  titleList.value = ['']
  fieldRefs.value = []
  error.value = ''
  autoAnswer.value = true
  collections.value = (await getCollections()).filter(c => c.id)
  const preferred = props.preferredCollectionId
  collectionId.value = collections.value.some(c => c.id === preferred)
    ? preferred
    : collections.value[0]?.id ?? null
})

// Answers the batch and reports back with one toast for all of it.
const answerInBackground = async (created: StudyItem[]) => {
  const failed = await props.cards.autoAnswerAll(created)
  const count = created.length
  if (failed === 0) {
    emit('notify', count === 1 ? `Claude answered "${created[0]!.title}"` : `Claude answered ${count} questions`)
  } else {
    emit('notify', `Auto-answer failed for ${failed} of ${count} question${count > 1 ? 's' : ''}`, true)
  }
}

const submit = async () => {
  const entries = titles.value
  const target = collectionId.value
  if (!entries.length) { error.value = 'Please enter at least one question.'; return }
  if (!target) { error.value = 'Please pick a collection.'; return }
  error.value = ''

  // Declining the API-key prompt just skips the answers; the items are still created.
  const useAutoAnswer = autoAnswer.value && (await ensureApiKey())

  creating.value = true
  try {
    const created = await props.cards.createCards(target, entries.map(title => ({ title })))
    open.value = false
    // The cards already exist; answer them without blocking the UI.
    if (useAutoAnswer) answerInBackground(created)
  } catch (err) {
    console.error('Error creating items:', err)
    error.value = 'Failed to create items.'
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.add-question-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.add-question-row .v-text-field {
  flex: 1;
}

.add-error {
  margin-top: 8px;
  font-size: 0.8rem;
  color: rgb(var(--v-theme-error));
  min-height: 1em;
}
</style>
