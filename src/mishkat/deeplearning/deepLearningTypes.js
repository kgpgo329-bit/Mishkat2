/**
 * Mishkat Phase 8: Deep Learning & Follow-Up Discovery Types & Constants
 * 
 * Strict architectural contracts:
 * - Status: SUCCESS, GATED, EMPTY
 * - Follow-up origin: DEEP_LEARNING
 * - Target question count: 3 to 5 (quality over quantity)
 */

export const DEEP_LEARNING_STATUS = Object.freeze({
  SUCCESS: 'SUCCESS',
  GATED: 'GATED',
  EMPTY: 'EMPTY'
});

export const FOLLOW_UP_ORIGIN = 'DEEP_LEARNING';

export const DEEP_LEARNING_CONFIG = Object.freeze({
  MIN_SUGGESTIONS: 1,
  TARGET_SUGGESTIONS: 3,
  MAX_SUGGESTIONS: 5
});

/**
 * Validates a Deep Learning status value
 */
export function isValidDeepLearningStatus(status) {
  return Object.values(DEEP_LEARNING_STATUS).includes(status);
}
