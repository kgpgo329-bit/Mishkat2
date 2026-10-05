/**
 * Mishkat Evidence Validator — Phase 5
 * 
 * Strict deterministic validation of evidence verification verdicts.
 * Ensures:
 * 1. Strict adherence to canonical schema.
 * 2. Logical consistency (e.g. supportsClaim and contradictsClaim cannot both be true).
 * 3. Enforces DIRECT criteria (answersExactClaim, preservesQuestionIntent).
 * 4. Bounds confidence between 0.0 and 1.0.
 */

import { EVIDENCE_RELATIONS } from './evidenceTypes.js';

export function validateEvidenceVerdict(verdict, options = {}) {
  const errors = [];

  if (!verdict || typeof verdict !== 'object') {
    return {
      valid: false,
      errors: ['VERDICT_NOT_OBJECT: Expected verdict to be a non-null object.'],
      normalizedVerdict: null
    };
  }

  // 1. chunkId
  if (!verdict.chunkId || typeof verdict.chunkId !== 'string' || verdict.chunkId.trim() === '') {
    errors.push('INVALID_CHUNK_ID: chunkId must be a non-empty string.');
  }

  // 2. relation
  const allowedRelations = Object.values(EVIDENCE_RELATIONS);
  if (!allowedRelations.includes(verdict.relation)) {
    errors.push(`INVALID_RELATION: relation must be one of [${allowedRelations.join(', ')}], got "${verdict.relation}".`);
  }

  // 3. booleans
  const boolFields = [
    'answersExactClaim',
    'supportsClaim',
    'contradictsClaim',
    'preservesQuestionIntent',
    'scopeMatches',
    'requiresExternalInference',
    'evidenceTypeMatches'
  ];
  for (const field of boolFields) {
    if (verdict[field] !== undefined && typeof verdict[field] !== 'boolean') {
      errors.push(`INVALID_BOOLEAN: ${field} must be a boolean, got ${typeof verdict[field]}.`);
    }
  }

  // 3b. materialClaimCoverage enum
  const allowedCoverages = ['COMPLETE', 'PARTIAL', 'NONE'];
  if (verdict.materialClaimCoverage !== undefined && !allowedCoverages.includes(verdict.materialClaimCoverage)) {
    errors.push(`INVALID_COVERAGE: materialClaimCoverage must be one of [${allowedCoverages.join(', ')}], got "${verdict.materialClaimCoverage}".`);
  }

  // 4. logical contradiction rule: cannot both support AND contradict the same proposition
  if (verdict.supportsClaim === true && verdict.contradictsClaim === true) {
    errors.push('LOGICAL_CONFLICT: supportsClaim and contradictsClaim cannot both be true simultaneously.');
  }

  // 5. Strict DIRECT Gate (Sections 4, 5, 16, & 18):
  // DIRECT is strictly invalid if:
  // - answersExactClaim !== true
  // - preservesQuestionIntent !== true
  // - scopeMatches === false
  // - requiresExternalInference === true
  // - materialClaimCoverage !== 'COMPLETE'
  // - evidenceTypeMatches === false
  // - (!supportsClaim && !contradictsClaim)
  let finalRelation = verdict.relation;
  let reasonNote = '';
  if (finalRelation === EVIDENCE_RELATIONS.DIRECT) {
    const directGateViolations = [];
    if (!verdict.answersExactClaim) directGateViolations.push('answersExactClaim is false');
    if (!verdict.preservesQuestionIntent) directGateViolations.push('preservesQuestionIntent is false');
    if (verdict.scopeMatches === false) directGateViolations.push('scopeMatches is false');
    if (verdict.requiresExternalInference === true) directGateViolations.push('requiresExternalInference is true');
    if (verdict.materialClaimCoverage && verdict.materialClaimCoverage !== 'COMPLETE') directGateViolations.push(`materialClaimCoverage is ${verdict.materialClaimCoverage}`);
    if (verdict.evidenceTypeMatches === false) directGateViolations.push('evidenceTypeMatches is false');
    if (!verdict.supportsClaim && !verdict.contradictsClaim) directGateViolations.push('neither supports nor contradicts claim');

    if (directGateViolations.length > 0) {
      if (options.enforceDirectStrictness !== false) {
        // Enforce safety bias: demote invalid DIRECT to SUPPORTING
        finalRelation = EVIDENCE_RELATIONS.SUPPORTING;
        reasonNote = ` [تم خفض الرتبة من DIRECT إلى SUPPORTING عبر بوابة الأمان الصارمة: ${directGateViolations.join(', ')}]`;
      }
    }
  }

  // 5b. Contradiction Polarity Separation (Phase 5C Section 3 & 4):
  // If an evidence directly and explicitly disproves/contradicts the exact claim with complete coverage,
  // it must not be misclassified as UNRELATED or INCIDENTAL merely because it opposes the proposition.
  if (verdict.contradictsClaim === true && verdict.answersExactClaim === true) {
    if (finalRelation === EVIDENCE_RELATIONS.UNRELATED || finalRelation === EVIDENCE_RELATIONS.INCIDENTAL) {
      if (verdict.materialClaimCoverage === 'COMPLETE' && verdict.scopeMatches !== false && verdict.requiresExternalInference !== true && verdict.evidenceTypeMatches !== false) {
        finalRelation = EVIDENCE_RELATIONS.DIRECT;
        reasonNote += ' [تصحيح دلالي: الدليل ينقض عين الدعوى مباشرة وبشكل كامل، فرتبته البرهانية DIRECT ناقض وليست UNRELATED]';
      } else {
        finalRelation = EVIDENCE_RELATIONS.SUPPORTING;
        reasonNote += ' [تصحيح دلالي: الدليل ينقض الدعوى جزئياً، فرتبته البرهانية SUPPORTING وليست UNRELATED]';
      }
    }
  }

  // 6. confidence
  let confidence = typeof verdict.confidence === 'number' ? verdict.confidence : 0.5;
  if (isNaN(confidence) || confidence < 0.0 || confidence > 1.0) {
    confidence = Math.max(0.0, Math.min(1.0, isNaN(confidence) ? 0.5 : confidence));
  }

  // 7. reason
  const baseReason = typeof verdict.reason === 'string' && verdict.reason.trim() !== ''
    ? verdict.reason.trim()
    : 'تم التحقق الدلالي من العلاقة البرهانية.';
  const reason = `${baseReason}${reasonNote}`;

  const normalizedVerdict = {
    chunkId: verdict.chunkId,
    relation: finalRelation,
    answersExactClaim: Boolean(verdict.answersExactClaim),
    supportsClaim: Boolean(verdict.supportsClaim),
    contradictsClaim: Boolean(verdict.contradictsClaim),
    preservesQuestionIntent: Boolean(verdict.preservesQuestionIntent),
    scopeMatches: Boolean(verdict.scopeMatches),
    requiresExternalInference: Boolean(verdict.requiresExternalInference),
    materialClaimCoverage: verdict.materialClaimCoverage || (finalRelation === EVIDENCE_RELATIONS.DIRECT ? 'COMPLETE' : 'PARTIAL'),
    evidenceTypeMatches: verdict.evidenceTypeMatches !== false,
    confidence: Number(confidence.toFixed(3)),
    reason
  };

  return {
    valid: errors.length === 0,
    errors,
    normalizedVerdict
  };
}

export function validateBatchVerdicts(verdicts, expectedChunkIds = []) {
  if (!Array.isArray(verdicts)) {
    return {
      valid: false,
      errors: ['BATCH_NOT_ARRAY: Expected verdicts to be an array.'],
      normalizedVerdicts: []
    };
  }

  const allErrors = [];
  const normalizedVerdicts = [];
  const verdictChunkMap = new Map();

  for (let i = 0; i < verdicts.length; i++) {
    const res = validateEvidenceVerdict(verdicts[i]);
    if (!res.valid) {
      allErrors.push(`Item ${i} [${verdicts[i]?.chunkId || 'unknown'}]: ${res.errors.join('; ')}`);
    }
    if (res.normalizedVerdict) {
      normalizedVerdicts.push(res.normalizedVerdict);
      verdictChunkMap.set(res.normalizedVerdict.chunkId, res.normalizedVerdict);
    }
  }

  // Check coverage if expectedChunkIds provided
  if (Array.isArray(expectedChunkIds) && expectedChunkIds.length > 0) {
    for (const expectedId of expectedChunkIds) {
      if (!verdictChunkMap.has(expectedId)) {
        allErrors.push(`MISSING_VERDICT: Missing verdict for candidate chunk "${expectedId}".`);
      }
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    normalizedVerdicts
  };
}
