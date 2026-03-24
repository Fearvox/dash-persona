/**
 * Barrel export for the heuristic learning engine.
 *
 * @module learning
 */

export {
  type TrackingEvent,
  type LearningStore,
  createLearningStore,
  resetStoreCache,
} from './store';

export {
  trackClick,
  trackExpand,
  trackDismiss,
  trackView,
} from './tracker';

export {
  type UserPreferences,
  derivePreferences,
} from './preferences';
