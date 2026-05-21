// Session timing
export const SESSION_CHECK_INTERVAL_MINUTES = 1;

// Notifications
export const NOTIFICATION_TIMEOUT_MS = 30000;
export const NOTIFICATION_PRIORITY = 2;

// Default study settings — overridden by values saved from StudyOptionsView
export const DEFAULT_NOTIFICATION_INTERVAL_SECONDS = 30;
export const DEFAULT_SESSION_START_HOUR = 9;
export const DEFAULT_SESSION_END_HOUR = 23;
export const DEFAULT_NOTIFICATION_COLLECTION_ID = "8366d809-1495-4b6c-a184-330158ad1da0";
export const DEFAULT_CONTENT_COLLECTION_ID = null;

// Button labels and ease scores
export const BUTTON_LABELS = ["Review Later", "Answered Correctly"];
export const EASE_SCORES = {
  "Review Later": -0.1,
  "Answered Correctly": 0.15
};
