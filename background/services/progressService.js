import { formatISO } from 'date-fns';
import {
  createAttemptLog,
  createCardProgress,
  updateCardProgress,
  updateLocalCardProgress,
  syncCardProgress,
  syncAttemptLogs,
  getAllCardProgress
} from '../../src/database/index.ts';
import { BUTTON_LABELS, EASE_SCORES } from '../constants.js';

export async function recordAttempt(itemId, buttonIndex) {
  const now = formatISO(new Date());
  const buttonLabel = BUTTON_LABELS[buttonIndex];
  const easeScore = EASE_SCORES[buttonLabel] ?? 0.0;

  console.log('[background] recordAttempt: button =', buttonLabel, '| easeScore =', easeScore);

  try {
    console.log('[background] recordAttempt: creating attempt log');
    await createAttemptLog({
      learning_item_id: itemId,
      ease_score: easeScore,
      is_correct: easeScore > 0.3,
      created_at: now
    });
    console.log('[background] recordAttempt: attempt log created, syncing');
    await syncAttemptLogs();
    console.log('[background] recordAttempt: attempt logs synced');

    const allProgress = await getAllCardProgress();
    console.log('[background] recordAttempt: allProgress count =', allProgress?.length ?? 0);
    const progress = allProgress.find(p => p.learning_item_id === itemId);

    if (progress) {
      const totalAttempts = progress.total_attempts + 1;
      const newStrength = Math.max(0, Math.min(1, progress.strength_score + easeScore));
      console.log('[background] recordAttempt: updating card progress, newStrength =', newStrength);

      await updateCardProgress({
        ...progress,
        strength_score: newStrength,
        last_reviewed_at: now,
        total_attempts: totalAttempts,
        weighted_attempts: progress.weighted_attempts + easeScore
      });
      console.log('[background] recordAttempt: card progress updated');
    } else {
      console.log('[background] recordAttempt: no existing progress, creating new card progress');
      await createCardProgress({
        learning_item_id: itemId,
        strength_score: Math.max(0, easeScore),
        last_reviewed_at: now,
        total_attempts: 1,
        weighted_attempts: easeScore
      });
      console.log('[background] recordAttempt: card progress created');
    }

    console.log('[background] recordAttempt: syncing card progress');
    await syncCardProgress();
    console.log('[background] recordAttempt: card progress synced');
  } catch (error) {
    console.error('[background] recordAttempt: error recording attempt:', error);
    throw error;
  }
}

// Records a rating from the content widget. Only the *local* writes are awaited
// so the widget can advance to the next card immediately; the Firebase push runs
// in the background (the next-card lookup reads local data, not the remote).
export async function recordContentRating(itemId, easeScore) {
  const now = formatISO(new Date());

  console.log('[background] recordContentRating: easeScore =', easeScore);

  try {
    await createAttemptLog({
      learning_item_id: itemId,
      ease_score: easeScore,
      is_correct: easeScore > 0.3,
      created_at: now
    });

    const allProgress = await getAllCardProgress();
    const progress = allProgress.find(p => p.learning_item_id === itemId);

    if (progress) {
      const totalAttempts = progress.total_attempts + 1;
      const newStrength = Math.max(0, Math.min(1, progress.strength_score + easeScore));
      // Local-only write (no inline remote round-trip) — kept fast for the UI.
      await updateLocalCardProgress({
        ...progress,
        strength_score: newStrength,
        last_reviewed_at: now,
        total_attempts: totalAttempts,
        weighted_attempts: progress.weighted_attempts + easeScore,
        syncStatus: 'pending'
      });
    } else {
      await createCardProgress({
        learning_item_id: itemId,
        strength_score: Math.max(0, easeScore),
        last_reviewed_at: now,
        total_attempts: 1,
        weighted_attempts: easeScore
      });
    }

    // Push to Firebase without blocking the next-card render.
    syncCardProgress().catch(err =>
      console.warn('[background] recordContentRating: background card progress sync failed:', err));
    syncAttemptLogs().catch(err =>
      console.warn('[background] recordContentRating: background attempt log sync failed:', err));
  } catch (error) {
    console.error('[background] recordContentRating: error recording rating:', error);
    throw error;
  }
}
