import { ref, watch, type Ref } from 'vue'
import { setLearningItemLabels } from '@/database'
import type { ItemLabelPatch, LearningItem } from '@/database/types'
import { toLabelPatch, type ItemLabelKind } from '@/utils/itemLabels'

/**
 * Edit one item's priority/difficulty labels.
 *
 * The write is optimistic — the picker reflects the new level immediately and
 * reverts if the save throws — because labeling is a rapid-fire action and a
 * round-trip of latency per click would make the control feel broken.
 *
 * Both the UI here and any future automated labeler share `setLearningItemLabels`
 * and `toLabelPatch`, so validation and syncing can't drift between them.
 */
export function useItemLabels(
  item: Ref<LearningItem>,
  onSaved?: (id: string, patch: ItemLabelPatch, lastModified: string) => void
) {
  const priority = ref<number | null>(item.value.priority ?? null)
  const difficulty = ref<number | null>(item.value.difficulty ?? null)
  const saving = ref(false)

  const values = { priority, difficulty }

  // Following the item rather than its id: a label written elsewhere (a pull, a
  // future assistant run) lands on the same object this panel is showing.
  watch(
    () => [item.value.id, item.value.priority, item.value.difficulty],
    () => {
      priority.value = item.value.priority ?? null
      difficulty.value = item.value.difficulty ?? null
    }
  )

  const set = async (kind: ItemLabelKind, value: number | null) => {
    const id = item.value.id
    if (!id) return

    const patch = toLabelPatch({ [kind]: value })
    if (!(kind in patch)) return

    const previous = values[kind].value
    values[kind].value = patch[kind] ?? null
    saving.value = true
    try {
      const lastModified = await setLearningItemLabels(id, patch)
      onSaved?.(id, patch, lastModified)
    } catch (error) {
      console.error(`Failed to save ${kind}:`, error)
      values[kind].value = previous
    } finally {
      saving.value = false
    }
  }

  return { priority, difficulty, saving, set }
}
