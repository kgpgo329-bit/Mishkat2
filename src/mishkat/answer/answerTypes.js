/**
 * Mishkat Phase 7: Grounded Answer Types & Constants
 * 
 * Strict architectural contracts:
 * - Answer Status: ANSWERED, PARTIAL, INSUFFICIENT, NEEDS_CLARIFICATION, REFER_TO_AUTHORITY, SERVICE_ERROR
 * - Grounding Status: GROUNDED, PARTIALLY_GROUNDED, UNGROUNDED
 * - Verification State: VERIFIED, PARTIALLY_VERIFIED, UNVERIFIED, FAILED
 * - Max regeneration retry limit: 2 (strictly bounded to prevent infinite loops)
 */

export const ANSWER_STATUS = Object.freeze({
  ANSWERED: 'ANSWERED',
  PARTIAL: 'PARTIAL',
  INSUFFICIENT: 'INSUFFICIENT',
  NEEDS_CLARIFICATION: 'NEEDS_CLARIFICATION',
  REFER_TO_AUTHORITY: 'REFER_TO_AUTHORITY',
  SERVICE_ERROR: 'SERVICE_ERROR'
});

export const GROUNDING_STATUS = Object.freeze({
  GROUNDED: 'GROUNDED',
  PARTIALLY_GROUNDED: 'PARTIALLY_GROUNDED',
  UNGROUNDED: 'UNGROUNDED'
});

export const GROUNDING_VERIFICATION_STATE = Object.freeze({
  VERIFIED: 'VERIFIED',
  PARTIALLY_VERIFIED: 'PARTIALLY_VERIFIED',
  UNVERIFIED: 'UNVERIFIED',
  FAILED: 'FAILED'
});

export const MAX_REGENERATION_ATTEMPTS = 2;

/**
 * Validates an answer status value
 */
export function isValidAnswerStatus(status) {
  return Object.values(ANSWER_STATUS).includes(status);
}

/**
 * Validates a grounding status value
 */
export function isValidGroundingStatus(status) {
  return Object.values(GROUNDING_STATUS).includes(status);
}

/**
 * Validates a grounding verification state value
 */
export function isValidGroundingVerificationState(state) {
  return Object.values(GROUNDING_VERIFICATION_STATE).includes(state);
}
