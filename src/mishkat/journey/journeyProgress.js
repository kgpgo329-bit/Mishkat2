/**
 * Mishkat Phase 9: Journey Progress Calculator
 *
 * Computes the canonical JourneyState from the current unique-verified count.
 *
 * Rules:
 * - uniqueVerifiedCount is the count of unique verified records in storage.
 * - Progress is capped at targetCount for percentage/milestone calculation.
 * - milestoneReached becomes true when uniqueVerifiedCount >= JOURNEY_TARGET.
 * - assessmentEligible = milestoneReached.
 * - No fake percentages. No Assessment logic.
 */

import { JOURNEY_TARGET } from './journeyTypes.js';

/**
 * Computes a canonical JourneyState snapshot.
 *
 * @param {Object} params
 * @param {string}   params.sessionId
 * @param {Object[]} params.verifiedRecords   All verified records in this session
 * @param {number}   params.uniqueVerifiedCount  Global unique verified count
 * @returns {Object} JourneyState
 */
export function computeJourneyState({ sessionId, verifiedRecords, uniqueVerifiedCount }) {
  const capped = Math.min(uniqueVerifiedCount, JOURNEY_TARGET);
  const remaining = Math.max(JOURNEY_TARGET - uniqueVerifiedCount, 0);
  const progressPercentage = Math.round((capped / JOURNEY_TARGET) * 100);
  const milestoneReached = uniqueVerifiedCount >= JOURNEY_TARGET;

  return {
    sessionId: sessionId || null,
    verifiedRecords: verifiedRecords || [],
    uniqueVerifiedCount,
    targetCount: JOURNEY_TARGET,
    remainingCount: remaining,
    progressPercentage,
    milestoneReached,
    assessmentEligible: milestoneReached,
    updatedAt: new Date().toISOString()
  };
}
