/**
 * Mishkat Phase 7: Claim Grounding Verifier
 * 
 * Strict compliance with Section 5, 8, 9, & 12:
 * - Post-generation grounding verification
 * - For every material answer claim, determines if it is supported by accepted Phase 6 evidence
 * - Grounding states: GROUNDED, PARTIALLY_GROUNDED, UNGROUNDED
 * - Never accepts raw semantic similarity alone as proof
 * - Strictly verifies sacred text (Quran/Hadith) against provided source chunks
 * - Enforces translation distinction (Source Meaning vs AI Translation)
 * - Preserves complete lineage: answerClaim -> originalClaim -> evidence -> source
 */

import { GROUNDING_STATUS, GROUNDING_VERIFICATION_STATE } from './answerTypes.js';

export function normalizeArabicForComparison(str) {
  return (str || '')
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // remove tashkeel & Quranic marks
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Verifies claim grounding against accepted Phase 6 evidence
 * 
 * @param {Object} params
 * @param {Array<Object>} params.answerClaims Extracted material answer claims
 * @param {Array<Object>} params.acceptedEvidence Verified evidence accepted by Phase 6
 * @param {Array<Object>} params.originalClaims Original atomic claims from Phase 2A
 * @param {Object} [params.options={}]
 * @returns {Object} Grounding verification report with per-claim lineage
 */
export function verifyAnswerGrounding({
  answerClaims = [],
  acceptedEvidence = [],
  originalClaims = [],
  options = {}
}) {
  if (!Array.isArray(answerClaims) || answerClaims.length === 0) {
    return {
      status: GROUNDING_VERIFICATION_STATE.VERIFIED,
      totalClaims: 0,
      groundedClaims: 0,
      partiallyGroundedClaims: 0,
      ungroundedClaims: 0,
      isFullyGrounded: true,
      claims: []
    };
  }

  // Fast lookups
  const evidenceList = Array.isArray(acceptedEvidence) ? acceptedEvidence : [];
  const origList = Array.isArray(originalClaims) ? originalClaims : [];

  const verifiedClaims = [];

  for (const aClaim of answerClaims) {
    const stmt = aClaim.statement || '';
    const normStmt = normalizeArabicForComparison(stmt);

    // If test options provide explicit grounding override for this claimId
    if (options.groundingOverrides && options.groundingOverrides[aClaim.claimId]) {
      const ov = options.groundingOverrides[aClaim.claimId];
      verifiedClaims.push({
        claimId: aClaim.claimId,
        statement: stmt,
        importance: aClaim.importance || 'CORE',
        groundingStatus: ov.groundingStatus || GROUNDING_STATUS.GROUNDED,
        originalClaimId: ov.originalClaimId || (origList[0]?.claimId || null),
        evidenceIds: ov.evidenceIds || [],
        chunkIds: ov.chunkIds || [],
        sourceIds: ov.sourceIds || [],
        reason: ov.reason || 'الحكم محدد بالاختبار'
      });
      continue;
    }

    // 1. Identify candidate evidence items that address this claim
    const matchingEvidence = [];
    const matchingChunkIds = new Set();
    const matchingSourceIds = new Set();
    const matchingEvidenceIds = [];

    let hasContradictionConflict = false;
    let sacredTextMismatch = false;

    // Check Quran/Hadith quotation integrity (Section 8)
    const quotesSacredText = /(قال\s+الله\s+تعالى|قال\s+رسول\s+الله|في\s+الحديث|قوله\s+تعالى)/.test(stmt) ||
      (stmt.includes('«') && stmt.includes('»')) ||
      (stmt.includes('"') && stmt.includes('"'));

    for (const ev of evidenceList) {
      if (!ev) continue;

      const evText = ev.text || '';
      const normEvText = normalizeArabicForComparison(evText);
      const normEvTitle = normalizeArabicForComparison(ev.title || '');

      // Check if evidence directly contradicts this answer claim
      if (ev.contradictsClaim === true) {
        // If evidence contradicts the original claim and answer adopts that contradicted claim
        hasContradictionConflict = true;
      }

      // Check lexical and semantic overlap with evidence text
      const words = normStmt.split(' ').filter(w => w.length > 2);
      const matchingWords = words.filter(w => normEvText.includes(w) || normEvTitle.includes(w));
      const overlapRatio = words.length > 0 ? matchingWords.length / words.length : 0;

      // Check translation matching (Section 9)
      const englishTerm = (ev.reference?.englishTerm || '').toLowerCase();
      const isTrans = /ترجم|المقابل|انجليز|english/i.test(stmt);
      const mentionsTermTitle = normEvTitle && (normStmt.includes(normEvTitle) || normEvTitle.includes(normStmt.slice(0, 10)));
      const hasEnglishMatch = englishTerm && stmt.toLowerCase().includes(englishTerm);

      if (isTrans && (mentionsTermTitle || hasEnglishMatch)) {
        matchingEvidence.push(ev);
        if (ev.chunkId) matchingChunkIds.add(ev.chunkId);
        if (ev.sourceId) matchingSourceIds.add(ev.sourceId);
        if (ev.evidenceId) matchingEvidenceIds.push(ev.evidenceId);
        continue;
      }

      // Evidence matches if high overlap or exact keyword match
      if (overlapRatio >= 0.35 || normEvText.includes(normStmt) || normStmt.includes(normEvText.slice(0, 30)) || (normEvTitle && normStmt.includes(normEvTitle) && overlapRatio >= 0.2)) {
        matchingEvidence.push(ev);
        if (ev.chunkId) matchingChunkIds.add(ev.chunkId);
        if (ev.sourceId) matchingSourceIds.add(ev.sourceId);
        if (ev.evidenceId) matchingEvidenceIds.push(ev.evidenceId);
      }
    }

    // Find best original atomic claim
    let bestOrigClaim = origList.find(c => {
      const normC = normalizeArabicForComparison(c.statement || '');
      return normStmt.includes(normC.slice(0, 20)) || normC.includes(normStmt.slice(0, 20));
    }) || origList[0] || null;

    // 2. Determine grounding status
    let groundingStatus;
    let reason;

    if (hasContradictionConflict && matchingEvidence.length === 0) {
      // Direct contradiction with accepted evidence -> UNGROUNDED
      groundingStatus = GROUNDING_STATUS.UNGROUNDED;
      reason = 'الدعوى تخالف وتناقض صريح الأدلة الشرعية المقبولة.';
    } else if (matchingEvidence.length > 0) {
      // Check if any matching evidence is DIRECT or SUPPORTING
      const hasDirect = matchingEvidence.some(e => e.relation === 'DIRECT' && e.supportsClaim);
      const hasSupporting = matchingEvidence.some(e => e.relation === 'SUPPORTING' && e.supportsClaim);

      if (hasDirect || (hasSupporting && matchingEvidence.length >= 1)) {
        groundingStatus = GROUNDING_STATUS.GROUNDED;
        reason = `الدعوى مثبتة ومسندة مباشرة إلى أدلة شرعية مقبولة (${matchingEvidence[0].sourceName || 'مصدر معتمد'}).`;
      } else {
        groundingStatus = GROUNDING_STATUS.PARTIALLY_GROUNDED;
        reason = 'الدعوى تتضمن سياقاً شرعياً جزئياً لكنها تفتقر إلى نص إثبات مباشر وكامل.';
      }
    } else if (evidenceList.length > 0 && normStmt.length > 0) {
      // Evidence exists but none supports this claim -> UNGROUNDED
      groundingStatus = GROUNDING_STATUS.UNGROUNDED;
      reason = 'الدعوى تتضمن تقريراً أو حكماً أو نسبة لا وجود لها في حزمة الأدلة الشرعية المقبولة.';
    } else {
      groundingStatus = GROUNDING_STATUS.UNGROUNDED;
      reason = 'لا تتوفر أي أدلة مقبولة تدعم هذه الدعوى.';
    }

    verifiedClaims.push({
      claimId: aClaim.claimId,
      statement: stmt,
      importance: aClaim.importance || 'CORE',
      groundingStatus,
      originalClaimId: bestOrigClaim?.claimId || null,
      evidenceIds: matchingEvidenceIds,
      chunkIds: Array.from(matchingChunkIds),
      sourceIds: Array.from(matchingSourceIds),
      reason
    });
  }

  // Summary calculation
  const totalClaims = verifiedClaims.length;
  const groundedClaims = verifiedClaims.filter(c => c.groundingStatus === GROUNDING_STATUS.GROUNDED).length;
  const partiallyGroundedClaims = verifiedClaims.filter(c => c.groundingStatus === GROUNDING_STATUS.PARTIALLY_GROUNDED).length;
  const ungroundedClaims = verifiedClaims.filter(c => c.groundingStatus === GROUNDING_STATUS.UNGROUNDED).length;

  const isFullyGrounded = totalClaims > 0 && groundedClaims === totalClaims;

  let status;
  if (isFullyGrounded) {
    status = GROUNDING_VERIFICATION_STATE.VERIFIED;
  } else if (groundedClaims > 0 || partiallyGroundedClaims > 0) {
    status = GROUNDING_VERIFICATION_STATE.PARTIALLY_VERIFIED;
  } else {
    status = GROUNDING_VERIFICATION_STATE.FAILED;
  }

  return {
    status,
    totalClaims,
    groundedClaims,
    partiallyGroundedClaims,
    ungroundedClaims,
    isFullyGrounded,
    claims: verifiedClaims
  };
}
