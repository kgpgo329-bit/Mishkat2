/**
 * Mishkat Phase 8: Strict Activation Gate
 * 
 * Strict compliance with Section 1:
 * Deep Learning may run ONLY when:
 * 1. Phase 6 sufficiency is SUFFICIENT
 * 2. Phase 7 final answer status is ANSWERED
 * 3. Phase 7 grounding verification PASSED (status === 'VERIFIED' && isFullyGrounded === true)
 * 4. Final answer contains NO unresolved central ungrounded claim
 * 
 * Never activates on PARTIAL, INSUFFICIENT, NEEDS_CLARIFICATION, REFER_TO_AUTHORITY,
 * SERVICE_ERROR, or failed grounding verification.
 */

/**
 * Checks whether Deep Learning follow-up discovery is eligible to run
 * 
 * @param {Object} params
 * @param {Object} params.sufficiencyResult Phase 6 sufficiency output
 * @param {Object} params.answerResult Phase 7 grounded answer output
 * @returns {Object} { eligible: boolean, reason: string }
 */
export function checkDeepLearningActivation({ sufficiencyResult, answerResult }) {
  if (!sufficiencyResult || typeof sufficiencyResult !== 'object') {
    return {
      eligible: false,
      reason: 'GATED_MISSING_SUFFICIENCY: Phase 6 sufficiencyResult is missing or invalid.'
    };
  }

  if (!answerResult || typeof answerResult !== 'object') {
    return {
      eligible: false,
      reason: 'GATED_MISSING_ANSWER: Phase 7 answerResult is missing or invalid.'
    };
  }

  const sufficiencyStatus = sufficiencyResult.overallSufficiency;
  const routing = sufficiencyResult.routing;
  const answerStatus = answerResult.answerStatus;
  const groundingVerif = answerResult.groundingVerification;

  // 1. Phase 6 overall sufficiency must be strictly SUFFICIENT
  if (sufficiencyStatus !== 'SUFFICIENT') {
    return {
      eligible: false,
      reason: `GATED_INSUFFICIENT_EVIDENCE: Deep Learning requires overall sufficiency to be SUFFICIENT (got '${sufficiencyStatus}').`
    };
  }

  // 2. Phase 6 routing must be strictly ANSWERED
  if (routing !== 'ANSWERED') {
    return {
      eligible: false,
      reason: `GATED_ROUTING_NOT_ANSWERED: Deep Learning requires routing to be ANSWERED (got '${routing}').`
    };
  }

  // 3. Phase 7 answerStatus must be strictly ANSWERED
  if (answerStatus !== 'ANSWERED') {
    return {
      eligible: false,
      reason: `GATED_ANSWER_NOT_ANSWERED: Deep Learning requires answerStatus to be ANSWERED (got '${answerStatus}').`
    };
  }

  // 4. Grounding verification must have PASSED completely
  if (!groundingVerif || groundingVerif.status !== 'VERIFIED' || groundingVerif.isFullyGrounded !== true) {
    return {
      eligible: false,
      reason: 'GATED_GROUNDING_NOT_VERIFIED: Deep Learning requires grounding verification status to be VERIFIED with isFullyGrounded = true.'
    };
  }

  // 5. Must contain zero ungrounded central/material claims
  if (Array.isArray(answerResult.answerClaims)) {
    const ungroundedCore = answerResult.answerClaims.filter(
      c => c.importance === 'CORE' && c.groundingStatus === 'UNGROUNDED'
    );
    if (ungroundedCore.length > 0) {
      return {
        eligible: false,
        reason: 'GATED_UNGROUNDED_CORE_CLAIMS: Answer contains unresolved ungrounded central claims.'
      };
    }
  }

  return {
    eligible: true,
    reason: 'ACTIVATION_PASSED: Verified grounded answer qualifies for Deep Learning follow-up discovery.'
  };
}
