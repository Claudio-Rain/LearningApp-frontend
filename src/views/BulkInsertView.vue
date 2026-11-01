<template>
  <div class="bulk-insert pa-4">
    <h2 class="text-h6 mb-4">Bulk Insert Learning Items</h2>

    <v-btn-toggle v-model="inputMode" mandatory density="comfortable" variant="outlined" color="primary" class="mb-4">
      <v-btn value="standard" prepend-icon="mdi-format-list-bulleted">Standard</v-btn>
      <v-btn value="fulltext" prepend-icon="mdi-text-box-outline">Full text mode</v-btn>
    </v-btn-toggle>

    <template v-if="inputMode === 'standard'">
      <TargetCollectionCard
        v-model:mode="collectionMode"
        v-model:selected-id="selectedCollectionId"
        v-model:new-title="newCollectionTitle"
        v-model:category="standardCategory"
        :collections="collections"
        :categories="categories"
      />
      <StandardItemsCard v-model:text="rawInput" v-model:answer-with-a-i="answerWithAI" :items="parsedItems" />
    </template>

    <FullTextCard
      v-else
      v-model:text="fullText"
      v-model:answer-with-a-i="answerWithAI"
      :collections="parsedCollections"
      :valid-count="fullTextValidCount"
    />

    <div class="d-flex gap-3 align-center">
      <v-btn
        color="primary"
        :disabled="!canInsert"
        :loading="inserting"
        prepend-icon="mdi-database-import"
        @click="handleBulkInsert"
      >
        Insert {{ totalValidCount }} Item{{ totalValidCount !== 1 ? 's' : '' }}
      </v-btn>
      <v-btn variant="text" @click="reset">Clear</v-btn>
      <v-spacer />
      <span v-if="aiProgress" class="text-caption text-medium-emphasis">
        <v-progress-circular indeterminate size="14" width="2" class="mr-1" />
        {{ aiProgress }}
      </span>
      <span v-if="lastResult" class="text-caption text-success">
        <v-icon size="small" color="success">mdi-check</v-icon>
        {{ lastResult }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ensureApiKey } from '@/utils/claude'
import TargetCollectionCard from './bulkInsert/components/TargetCollectionCard.vue'
import StandardItemsCard from './bulkInsert/components/StandardItemsCard.vue'
import FullTextCard from './bulkInsert/components/FullTextCard.vue'
import { useBulkInsert } from './bulkInsert/composables/useBulkInsert'
import { countValid, parseFullText, parseItemBlocks, pluralize } from './bulkInsert/parse'

const { collections, categories, load, insertIntoOne, insertMany } = useBulkInsert()

const inputMode = ref<'standard' | 'fulltext'>('standard')
const answerWithAI = ref(false)

// Standard mode
const collectionMode = ref<'existing' | 'new'>('existing')
const selectedCollectionId = ref<string | null>(null)
const newCollectionTitle = ref('')
const standardCategory = ref<string | null>(null)
const rawInput = ref('')

// Full text mode
const fullText = ref('')

const inserting = ref(false)
const lastResult = ref('')
const aiProgress = ref('')

const parsedItems = computed(() => parseItemBlocks(rawInput.value, !answerWithAI.value))

const parsedCollections = computed(() => {
  const existingTitles = new Set(collections.value.map(c => c.title.trim().toLowerCase()))
  return parseFullText(fullText.value, existingTitles, !answerWithAI.value)
})

const fullTextValidCount = computed(() =>
  parsedCollections.value.reduce((n, c) => n + countValid(c.items), 0)
)

const totalValidCount = computed(() =>
  inputMode.value === 'standard' ? countValid(parsedItems.value) : fullTextValidCount.value
)

const canInsert = computed(() => {
  if (totalValidCount.value === 0) return false
  if (inputMode.value === 'fulltext') return true
  if (collectionMode.value === 'existing') return !!selectedCollectionId.value
  return newCollectionTitle.value.trim().length > 0
})

const handleBulkInsert = async () => {
  if (!canInsert.value) return
  // Make sure there's an API key before inserting anything.
  if (answerWithAI.value && !(await ensureApiKey())) return

  inserting.value = true
  lastResult.value = ''
  aiProgress.value = ''

  const options = {
    answerWithAI: answerWithAI.value,
    onProgress: (done: number, total: number) => {
      aiProgress.value = `Answering ${done} of ${total}…`
    }
  }

  try {
    if (inputMode.value === 'standard') {
      const target = collectionMode.value === 'new'
        ? { kind: 'new' as const, title: newCollectionTitle.value }
        : { kind: 'existing' as const, id: selectedCollectionId.value! }
      await insertIntoOne(target, standardCategory.value, parsedItems.value, options)
    } else {
      await insertMany(parsedCollections.value, options)
    }
    lastResult.value = `${pluralize(totalValidCount.value, 'item')} inserted successfully`
    reset()
  } finally {
    inserting.value = false
    aiProgress.value = ''
  }
}

const reset = () => {
  rawInput.value = ''
  fullText.value = ''
  newCollectionTitle.value = ''
  standardCategory.value = null
}

onMounted(load)
</script>
