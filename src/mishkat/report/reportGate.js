/**
 * Mishkat Phase 11: Report Activation Gate
 *
 * Verifies that a Journey Report is generated ONLY when:
 * 1. Journey milestone reached (uniqueVerifiedCount >= 20)
 * 2. assessmentEligible === true
 * 3. A valid completed assessment result exists with valid scoring metrics
 */

export function checkReportEligibility({ journeyState, assessmentResult }) {
  if (!journeyState || typeof journeyState !== 'object') {
    return {
      eligible: false,
      reason: 'REPORT_NOT_ELIGIBLE: Missing or invalid journeyState.'
    };
  }

  const { uniqueVerifiedCount = 0, assessmentEligible } = journeyState;

  if (uniqueVerifiedCount < 20) {
    return {
      eligible: false,
      reason: `REPORT_NOT_ELIGIBLE: Journey milestone requires >= 20 unique verified records (got ${uniqueVerifiedCount}).`
    };
  }

  if (assessmentEligible !== true) {
    return {
      eligible: false,
      reason: 'REPORT_NOT_ELIGIBLE: Journey assessmentEligible flag must be true.'
    };
  }

  if (!assessmentResult || typeof assessmentResult !== 'object') {
    return {
      eligible: false,
      reason: 'REPORT_NOT_ELIGIBLE: No completed assessment result provided.'
    };
  }

  if (typeof assessmentResult.scorePercentage !== 'number' || !assessmentResult.assessmentId) {
    return {
      eligible: false,
      reason: 'REPORT_NOT_ELIGIBLE: Assessment result is incomplete or unscored.'
    };
  }

  return {
    eligible: true,
    reason: 'ELIGIBLE: Milestone reached and valid completed assessment provided.'
  };
}
