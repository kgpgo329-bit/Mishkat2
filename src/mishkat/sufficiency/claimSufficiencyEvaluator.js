/**
 * Mishkat Phase 6: Claim Sufficiency Evaluator
 * 
 * Strict compliance with Rules 1, 2, 3, 4, 5, 6, 7, 8, 14, 15, 16, & 17:
 * - Evaluates sufficiency independently for an atomic claim
 * - Separates relation from polarity (DIRECT support vs DIRECT contradiction)
 * - CONTEXTUAL, INCIDENTAL, and UNRELATED evidence can NEVER establish SUPPORTED
 * - Valid SUPPORTING evidence can aggregate (>= 2 distinct pieces -> SUPPORTED)
 * - Identifies conflicts (DIRECT support + DIRECT contradiction -> conflicted, not SUPPORTED)
 * - Flags operational failures (VERIFICATION_ERROR) without falsifying them as UNSUPPORTED
 * - Preserves complete upstream provenance and identifiers
 */

import {
  CLAIM_SUFFICIENCY_STATUS,
  EVIDENCE_POLARITY,
  CLAIM_IMPORTANCE
} from './sufficiencyTypes.js';
import { deduplicateEvidence } from './evidenceDeduplicator.js';

/**
 * Evaluates evidence sufficiency for a single atomic claim
 * 
 * @param {Object} params
 * @param {Object} params.claim The claim object from Phase 2A interpretation
 * @param {Array<Object>} params.evidence List of verified evidence items from Phase 5
 * @param {Object} [params.options={}]
 * @returns {Object} Claim sufficiency evaluation result
 */
export function evaluateClaimSufficiency({ claim, evidence = [], options = {} }) {
  if (!claim || typeof claim !== 'object') {
    throw new Error('INVALID_CLAIM: evaluateClaimSufficiency requires a valid claim object.');
  }

  const claimId = claim.claimId || 'claim_unknown';
  const statement = claim.statement || '';
  const importance = claim.importance === CLAIM_IMPORTANCE.SECONDARY
    ? CLAIM_IMPORTANCE.SECONDARY
    : CLAIM_IMPORTANCE.CORE;

  // 1. Deduplicate evidence before aggregation (Rule 15)
  const dedup = deduplicateEvidence(evidence);
  const items = dedup.items;

  // 2. Classify evidence by relation, polarity, and status (Rules 6 & 16)
  const directSupporting = [];
  const supporting = [];
  const contextual = [];
  const directContradictions = [];
  const supportingContradictions = [];
  const incidental = [];
  const unrelated = [];
  const verificationErrors = [];

  for (const item of items) {
    // Check for operational/verification errors first (Rule 14)
    if (item.verificationStatus === 'VERIFICATION_ERROR' || item.relation === null || item.relation === undefined) {
      verificationErrors.push(item);
      continue;
    }

    const rel = (item.relation || '').toUpperCase();
    const isSupport = item.supportsClaim === true;
    const isContra = item.contradictsClaim === true;

    // Direct contradiction
    if (rel === 'DIRECT' && isContra) {
      directContradictions.push(item);
      continue;
    }

    // Supporting/Contextual contradiction
    if ((rel === 'SUPPORTING' || rel === 'CONTEXTUAL') && isContra) {
      supportingContradictions.push(item);
      continue;
    }

    // Direct affirmative support
    if (rel === 'DIRECT' && isSupport && !isContra) {
      directSupporting.push(item);
      continue;
    }

    // Supporting affirmative
    if (rel === 'SUPPORTING' && isSupport && !isContra) {
      supporting.push(item);
      continue;
    }

    // Contextual affirmative
    if (rel === 'CONTEXTUAL' && isSupport && !isContra) {
      contextual.push(item);
      continue;
    }

    // Incidental mention (Rule 5)
    if (rel === 'INCIDENTAL') {
      incidental.push(item);
      continue;
    }

    // Unrelated text (Rule 5)
    if (rel === 'UNRELATED') {
      unrelated.push(item);
      continue;
    }

    // Neutral / unspecified fallback
    unrelated.push(item);
  }

  // 3. Evaluate Contradictions & Conflicts (Rules 7 & 8)
  const hasDirectSupport = directSupporting.length > 0;
  const hasDirectContradiction = directContradictions.length > 0;
  const hasSupportingContradiction = supportingContradictions.length > 0;
  const hasContradiction = hasDirectContradiction || hasSupportingContradiction;
  const hasConflict = hasDirectSupport && hasDirectContradiction;

  // Operational error check (Rule 14)
  const hasVerificationError = verificationErrors.length > 0;
  // If there are errors and not enough valid affirmative evidence to otherwise support the claim
  const isBlockedByServiceError = hasVerificationError && !hasDirectSupport && supporting.length < 2;

  // 4. Determine Claim Sufficiency Status (Rules 2, 3, 4, 5, 8, 14)
  let status;
  let reason;

  if (isBlockedByServiceError) {
    // Operational failure on this claim's verification
    status = CLAIM_SUFFICIENCY_STATUS.UNSUPPORTED;
    reason = `تعذر التحقق الدلالي للأدلة المطلوبة لهذا الادعاء بسبب خطأ تشغيلي في خدمة التحقق (${verificationErrors.length} أخطاء).`;
  } else if (hasConflict) {
    // Rule 8: Strong/material DIRECT support together with DIRECT contradiction
    // -> Claim is unresolved/conflicted and must NOT be SUFFICIENT
    status = CLAIM_SUFFICIENCY_STATUS.PARTIAL;
    reason = 'يوجد تعارض مباشر بين أدلة قطعية الدلالة تثبت الادعاء وأدلة قطعية تنفيه؛ الادعاء محل خلاف وتعارض ولا يصح اعتباره تام الثبوت.';
  } else if (hasDirectContradiction) {
    // Rule 6 & 7: Direct contradiction disproves claim
    status = CLAIM_SUFFICIENCY_STATUS.UNSUPPORTED;
    reason = 'الأدلة الشرعية المباشرة تدحض وتناقض هذا الادعاء صراحة وبشكل قاطع.';
  } else if (hasDirectSupport) {
    // Rule 2: DIRECT evidence establishes support
    status = CLAIM_SUFFICIENCY_STATUS.SUPPORTED;
    reason = `الادعاء مثبت مباشرة بنص شرعي قطعي الدلالة (${directSupporting[0].sourceName || 'مصدر معتمد'}).`;
  } else if (supporting.length >= 2 && !hasSupportingContradiction) {
    // Rule 3: Multiple distinct supporting pieces aggregate to SUPPORTED
    status = CLAIM_SUFFICIENCY_STATUS.SUPPORTED;
    reason = `تم إثبات الادعاء بتظافر ${supporting.length} أدلة شرعية مساندة مستقلة وموثوقة.`;
  } else if (supporting.length === 1 && !hasSupportingContradiction) {
    // Single supporting piece -> PARTIAL
    status = CLAIM_SUFFICIENCY_STATUS.PARTIAL;
    reason = 'الادعاء مدعوم جزئياً بدليل مساند واحد، ويفتقر إلى دليل قطعي مباشر أو شواهد معضدة كافية.';
  } else if (contextual.length > 0 && !hasSupportingContradiction) {
    // Rule 4: CONTEXTUAL evidence alone must NEVER make a claim SUPPORTED -> PARTIAL
    status = CLAIM_SUFFICIENCY_STATUS.PARTIAL;
    reason = 'تتوفر أدلة سياقية عامة ذات صلة بالمسألة، لكنها لا تنهض وحدها لإثبات الدعوى المحددة.';
  } else if (hasSupportingContradiction) {
    status = CLAIM_SUFFICIENCY_STATUS.UNSUPPORTED;
    reason = 'توجد أدلة شرعية مساندة تعارض هذا الادعاء ولا تسانده.';
  } else if (incidental.length > 0 && items.length === incidental.length) {
    // Rule 5: INCIDENTAL-only -> UNSUPPORTED
    status = CLAIM_SUFFICIENCY_STATUS.UNSUPPORTED;
    reason = 'الأدلة المسترجعة تذكر المفردة عرضاً دون أن تفيد في إثبات الدعوى أو بحث مسألتها.';
  } else if (unrelated.length > 0 && items.length === unrelated.length) {
    // Rule 5: UNRELATED-only -> UNSUPPORTED
    status = CLAIM_SUFFICIENCY_STATUS.UNSUPPORTED;
    reason = 'الأدلة المسترجعة لا صلة لها بموضوع الادعاء أو السؤال.';
  } else {
    // No evidence at all
    status = CLAIM_SUFFICIENCY_STATUS.UNSUPPORTED;
    reason = 'لم يتم العثور على أدلة شرعية كافية لإثبات هذا الادعاء.';
  }

  return {
    claimId,
    claimText: statement,
    importance,
    status,
    hasConflict,
    hasContradiction,
    hasVerificationError,
    isBlockedByServiceError,
    reason,
    metrics: {
      totalEvidence: dedup.totalCount,
      deduplicatedEvidence: dedup.uniqueCount,
      duplicateCount: dedup.duplicateCount,
      directSupportCount: directSupporting.length,
      supportingCount: supporting.length,
      contextualCount: contextual.length,
      incidentalCount: incidental.length,
      unrelatedCount: unrelated.length,
      directContradictionCount: directContradictions.length,
      supportingContradictionCount: supportingContradictions.length,
      verificationErrorCount: verificationErrors.length
    },
    supportingEvidence: [...directSupporting, ...supporting],
    contextualEvidence: contextual,
    contradictingEvidence: [...directContradictions, ...supportingContradictions],
    discardedOrUnrelated: [...incidental, ...unrelated],
    verificationErrors
  };
}
