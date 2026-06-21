export type { Category, Collection, LearningItem, CardProgress, AttemptLog, ExcludedItem, ContentWidgetSettings } from './types'
export {
  startSyncEngine,
  syncAll,
  pullAllLearningItems,
  syncCategories,
  syncCollections,
  syncLearningItems,
  syncCardProgress,
  syncAttemptLogs
} from './sync/syncEngine'
export {
  pullCategories,
  createCategory,
  editCategory,
  removeCategory,
  pullCollections,
  pullLearningItems,
  pullCardProgress,
  pullAttemptLogs,
  pullExcludedItems,
  createCollection,
  editCollection,
  removeCollection,
  createLearningItem,
  editLearningItem,
  removeLearningItem,
  createCardProgress,
  updateCardProgress,
  deleteCardProgress,
  createAttemptLog,
  updateAttemptLog,
  deleteAttemptLog,
  createExcludedItem,
  removeExcludedItem,
  pushExcludedItems,
  syncExcludedItems,
  pullContentWidget,
  saveContentWidget,
  pushContentWidget,
  syncContentWidget
} from './operations'
export {
  getCategories,
  updateCategory,
  getCollections,
  getLearningItems,
  updateCollection,
  updateLearningItem,
  updateLearningItemTitle,
  getCardProgress,
  getAllCardProgress,
  getAttemptLogs,
  getAllAttemptLogs,
  getAllExcludedItems,
  getLocalContentWidget,
  // Local-only progress write (no inline remote round-trip); callers that want a
  // snappy UI write this and let a background syncCardProgress() push to Firebase.
  updateCardProgress as updateLocalCardProgress
} from './local'