/**
 * Mishkat Phase 6: Evidence Sufficiency Types & Constants
 * 
 * Strict architectural contracts:
 * - Claim sufficiency levels: SUPPORTED, PARTIAL, UNSUPPORTED
 * - Overall sufficiency levels: SUFFICIENT, PARTIAL, INSUFFICIENT
 * - Sufficiency routing targets:
 *     ANSWERED, PARTIAL, INSUFFICIENT,
 *     NEEDS_CLARIFICATION, REFER_TO_AUTHORITY, SERVICE_ERROR
 */

export const CLAIM_SUFFICIENCY_STATUS = Object.freeze({
  SUPPORTED: 'SUPPORTED',
  PARTIAL: 'PARTIAL',
  UNSUPPORTED: 'UNSUPPORTED'
});

export const OVERALL_SUFFICIENCY = Object.freeze({
  SUFFICIENT: 'SUFFICIENT',
  PARTIAL: 'PARTIAL',
  INSUFFICIENT: 'INSUFFICIENT'
});

export const SUFFICIENCY_ROUTING = Object.freeze({
  ANSWERED: 'ANSWERED',
  PARTIAL: 'PARTIAL',
  INSUFFICIENT: 'INSUFFICIENT',
  NEEDS_CLARIFICATION: 'NEEDS_CLARIFICATION',
  REFER_TO_AUTHORITY: 'REFER_TO_AUTHORITY',
  SERVICE_ERROR: 'SERVICE_ERROR'
});

export const EVIDENCE_POLARITY = Object.freeze({
  SUPPORTING: 'SUPPORTING',
  CONTRADICTING: 'CONTRADICTING',
  NEUTRAL: 'NEUTRAL'
});

export const CLAIM_IMPORTANCE = Object.freeze({
  CORE: 'CORE',
  SECONDARY: 'SECONDARY'
});

/**
 * Validates a claim sufficiency status value
 */
export function isValidClaimSufficiency(status) {
  return Object.values(CLAIM_SUFFICIENCY_STATUS).includes(status);
}

/**
 * Validates an overall sufficiency status value
 */
export function isValidOverallSufficiency(status) {
  return Object.values(OVERALL_SUFFICIENCY).includes(status);
}

/**
 * Validates a sufficiency routing target value
 */
export function isValidSufficiencyRouting(routing) {
  return Object.values(SUFFICIENCY_ROUTING).includes(routing);
}
