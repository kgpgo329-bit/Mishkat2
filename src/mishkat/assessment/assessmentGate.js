/**
 * Mishkat Phase 10: Assessment Activation Gate
 *
 * Enforces that assessment generation is allowed ONLY when:
 * 1. journeyState.assessmentEligible === true
 * 2. journeyState.uniqueVerifiedCount >= 20
 *
 * Otherwise returns NOT_ELIGIBLE.
 */

import { ASSESSMENT_CONFIG } from './assessmentTypes.js';

/**
 * Checks whether an assessment can be generated for the given journey state.
 *
 * @param {Object} journeyState  Current Knowledge Journey state
 * @returns {{ eligible: boolean, reason: string }}
 */
export function checkAssessmentEligibility(journeyState) {
  if (!journeyState || typeof journeyState !== 'object') {
    return {
      eligible: false,
      reason: 'NOT_ELIGIBLE: Journey state is missing or invalid.'
    };
  }

  const { assessmentEligible, uniqueVerifiedCount = 0 } = journeyState;

  if (assessmentEligible !== true) {
    return {
      eligible: false,
      reason: `NOT_ELIGIBLE: Journey assessmentEligible flag is false (uniqueVerifiedCount: ${uniqueVerifiedCount}).`
    };
  }

  if (uniqueVerifiedCount < ASSESSMENT_CONFIG.MIN_JOURNEY_RECORDS) {
    return {
      eligible: false,
      reason: `NOT_ELIGIBLE: Milestone requires at least ${ASSESSMENT_CONFIG.MIN_JOURNEY_RECORDS} unique verified records (got ${uniqueVerifiedCount}).`
    };
  }

  return {
    eligible: true,
    reason: 'ELIGIBLE: Milestone reached with >= 20 unique verified records.'
  };
}
