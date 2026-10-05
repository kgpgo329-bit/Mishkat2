/**
 * Mishkat Phase 9: Journey Eligibility Gate
 *
 * An interaction may enter the Knowledge Journey ONLY when ALL conditions pass:
 *
 *  1. Phase 6 overallSufficiency === 'SUFFICIENT'
 *  2. Phase 6 routing === 'ANSWERED'
 *  3. Phase 7 answerStatus === 'ANSWERED'
 *  4. Phase 7 groundingVerification.status === 'VERIFIED'
 *     AND groundingVerification.isFullyGrounded === true
 *  5. No CORE answerClaim with groundingStatus === 'UNGROUNDED'
 *
 * The following are EXPLICITLY BLOCKED:
 *  - PARTIAL, INSUFFICIENT, NEEDS_CLARIFICATION, REFER_TO_AUTHORITY, SERVICE_ERROR
 *  - Failed or partial grounding verification
 *  - Unresolved ungrounded CORE claims
 *  - Unselected Deep Learning suggestions (never reach this gate)
 */

/**
 * @param {Object} params
 * @param {Object} params.sufficiencyResult  Phase 6 output
 * @param {Object} params.answerResult       Phase 7 output
 * @returns {{ eligible: boolean, reason: string }}
 */
export function checkJourneyEligibility({ sufficiencyResult, answerResult }) {
  if (!sufficiencyResult || typeof sufficiencyResult !== 'object') {
    return { eligible: false, reason: 'GATED_MISSING_SUFFICIENCY' };
  }
  if (!answerResult || typeof answerResult !== 'object') {
    return { eligible: false, reason: 'GATED_MISSING_ANSWER' };
  }

  // 1. Sufficiency
  if (sufficiencyResult.overallSufficiency !== 'SUFFICIENT') {
    return {
      eligible: false,
      reason: `GATED_SUFFICIENCY: got '${sufficiencyResult.overallSufficiency}'`
    };
  }

  // 2. Routing
  if (sufficiencyResult.routing !== 'ANSWERED') {
    return {
      eligible: false,
      reason: `GATED_ROUTING: got '${sufficiencyResult.routing}'`
    };
  }

  // 3. Answer status
  if (answerResult.answerStatus !== 'ANSWERED') {
    return {
      eligible: false,
      reason: `GATED_ANSWER_STATUS: got '${answerResult.answerStatus}'`
    };
  }

  // 4. Grounding verification
  const gv = answerResult.groundingVerification;
  if (!gv || gv.status !== 'VERIFIED' || gv.isFullyGrounded !== true) {
    return {
      eligible: false,
      reason: 'GATED_GROUNDING_NOT_VERIFIED'
    };
  }

  // 5. No ungrounded CORE claims
  if (Array.isArray(answerResult.answerClaims)) {
    const ungroundedCore = answerResult.answerClaims.filter(
      c => c.importance === 'CORE' && c.groundingStatus === 'UNGROUNDED'
    );
    if (ungroundedCore.length > 0) {
      return {
        eligible: false,
        reason: 'GATED_UNGROUNDED_CORE_CLAIMS'
      };
    }
  }

  return {
    eligible: true,
    reason: 'ELIGIBLE: All journey preconditions satisfied.'
  };
}
