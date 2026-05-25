import { formatISO } from 'date-fns';
import {
  createAttemptLog,
  createCardProgress,
  updateCardProgress,
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

export async function recordContentRating(itemId, easeScore) {
  const now = formatISO(new Date());

  console.log('[background] recordContentRating: easeScore =', easeScore);

  try {
    console.log('[background] recordContentRating: creating attempt log');
    await createAttemptLog({
      learning_item_id: itemId,
      ease_score: easeScore,
      is_correct: easeScore > 0.3,
      created_at: now
    });
    console.log('[background] recordContentRating: attempt log created, syncing');
    await syncAttemptLogs();
    console.log('[background] recordContentRating: attempt logs synced');

    const allProgress = await getAllCardProgress();
    console.log('[background] recordContentRating: allProgress count =', allProgress?.length ?? 0);
    const progress = allProgress.find(p => p.learning_item_id === itemId);

    if (progress) {
      const totalAttempts = progress.total_attempts + 1;
      const newStrength = Math.max(0, Math.min(1, progress.strength_score + easeScore));
      console.log('[background] recordContentRating: updating card progress, newStrength =', newStrength);

      await updateCardProgress({
        ...progress,
        strength_score: newStrength,
        last_reviewed_at: now,
        total_attempts: totalAttempts,
        weighted_attempts: progress.weighted_attempts + easeScore
      });
      console.log('[background] recordContentRating: card progress updated');
    } else {
      console.log('[background] recordContentRating: no existing progress, creating new card progress');
      await createCardProgress({
        learning_item_id: itemId,
        strength_score: Math.max(0, easeScore),
        last_reviewed_at: now,
        total_attempts: 1,
        weighted_attempts: easeScore
      });
      console.log('[background] recordContentRating: card progress created');
    }

    console.log('[background] recordContentRating: syncing card progress');
    await syncCardProgress();
    console.log('[background] recordContentRating: card progress synced');
  } catch (error) {
    console.error('[background] recordContentRating: error recording rating:', error);
    throw error;
  }
}
