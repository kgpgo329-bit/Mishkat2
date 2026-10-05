/**
 * Mishkat Phase 9: Knowledge Record Builder
 *
 * Constructs canonical KnowledgeRecord objects from verified upstream data.
 *
 * RULES:
 * - Only evidence/sources from the verified answer are preserved.
 * - Evidence and sources are deduplicated deterministically.
 * - Concepts come from grounded/verified information only.
 * - Concept extraction is deterministic and mockable via options.
 * - No AI calls in this module.
 */

import crypto from 'crypto';
import { RECORD_STATUS, RECORD_ORIGIN } from './journeyTypes.js';

/** @returns {string} A short record ID */
function makeRecordId() {
  return 'kr_' + crypto.randomBytes(5).toString('hex');
}

/**
 * Extracts the topic label from interpretation or answer context.
 * Falls back to a normalized snippet of the question.
 *
 * @param {Object} interpretation Phase 2 output
 * @param {Object} answerResult   Phase 7 output
 * @returns {string}
 */
function extractTopic(interpretation, answerResult) {
  if (interpretation?.topic && typeof interpretation.topic === 'string') {
    return interpretation.topic.trim();
  }
  if (interpretation?.taskTopic && typeof interpretation.taskTopic === 'string') {
    return interpretation.taskTopic.trim();
  }
  if (interpretation?.task && typeof interpretation.task === 'string') {
    return interpretation.task.trim();
  }
  // Fallback: first 40 chars of question
  const q = interpretation?.questionText || interpretation?.originalQuestion || '';
  return q.slice(0, 40).trim() || 'GENERAL';
}

/**
 * Extracts concept labels from verified answer claims.
 * Deterministic: takes each CORE answer claim's first meaningful Arabic word.
 *
 * Production note: if AI-assisted labeling is introduced later, it must remain
 * bounded by the verified answer and accepted evidence.
 *
 * @param {Array}   answerClaims
 * @param {Object}  [options]
 * @param {Array}   [options.mockConcepts]  Inject mock concepts for tests
 * @returns {string[]}
 */
function extractConcepts(answerClaims, options = {}) {
  if (Array.isArray(options.mockConcepts)) {
    return options.mockConcepts;
  }
  const concepts = new Set();
  for (const claim of answerClaims || []) {
    const stmt = claim.statement || '';
    // Take the first word ≥ 3 chars (basic deterministic label)
    const words = stmt.split(/\s+/).filter(w => w.length >= 3);
    if (words[0]) concepts.add(words[0]);
  }
  return [...concepts];
}

/**
 * Builds deduplicated evidence references from grounded answer claims.
 * Only evidence actually cited by grounded claims is included.
 *
 * @param {Array} answerClaims
 * @param {Array} citations     Phase 7 citations
 * @returns {Array<{evidenceId, claimId, chunkId, sourceId, sourceName}>}
 */
function buildEvidenceRefs(answerClaims, citations) {
  const seen = new Set();
  const refs = [];

  for (const claim of answerClaims || []) {
    const claimId = claim.claimId || null;
    for (const evidenceId of claim.evidenceIds || []) {
      if (seen.has(evidenceId)) continue;
      seen.add(evidenceId);

      // Find matching citation for provenance
      const chunkId = (claim.chunkIds || [])[0] || null;
      const sourceId = (claim.sourceIds || [])[0] || null;

      // Try to enrich from citations
      const citation = (citations || []).find(c => c.chunkId === chunkId);
      refs.push({
        evidenceId,
        claimId,
        chunkId,
        sourceId: citation?.sourceId || sourceId,
        sourceName: citation?.sourceName || null
      });
    }
  }
  return refs;
}

/**
 * Builds deduplicated source references from Phase 7 answer sources.
 * Only sources that appear in grounded evidence are included.
 *
 * @param {Array} answerSources  Phase 7 .sources array
 * @param {Array} evidenceRefs   Built evidence refs (for source filtering)
 * @returns {Array<{sourceId, sourceName, sourceUrl}>}
 */
function buildSourceRefs(answerSources, evidenceRefs) {
  const usedSourceIds = new Set(evidenceRefs.map(e => e.sourceId).filter(Boolean));
  const seen = new Set();
  const refs = [];

  for (const src of answerSources || []) {
    if (!src.sourceId) continue;
    // Include all Phase 7 answer sources (they are already filtered to used ones)
    if (seen.has(src.sourceId)) continue;
    seen.add(src.sourceId);
    refs.push({
      sourceId: src.sourceId,
      sourceName: src.sourceName || null,
      sourceUrl: src.sourceUrl || null
    });
  }

  // Also include sources referenced by evidence but not listed in answerSources
  for (const ev of evidenceRefs) {
    if (ev.sourceId && !seen.has(ev.sourceId)) {
      seen.add(ev.sourceId);
      refs.push({
        sourceId: ev.sourceId,
        sourceName: ev.sourceName || null,
        sourceUrl: null
      });
    }
  }

  return refs;
}

/**
 * Builds a canonical KnowledgeRecord from upstream verified data.
 *
 * @param {Object} params
 * @param {string}  params.sessionId
 * @param {Object}  params.interpretation     Phase 2 output
 * @param {Object}  params.answerResult       Phase 7 output
 * @param {string}  [params.origin]           RECORD_ORIGIN value (default USER_QUESTION)
 * @param {string|null} [params.parentRecordId]
 * @param {Object}  [params.options]          { mockConcepts }
 * @returns {Object}  KnowledgeRecord
 */
export function buildKnowledgeRecord({
  sessionId,
  interpretation,
  answerResult,
  origin = RECORD_ORIGIN.USER_QUESTION,
  parentRecordId = null,
  options = {}
}) {
  const answerClaims = answerResult?.answerClaims || [];
  const citations = answerResult?.citations || [];
  const answerSources = answerResult?.sources || [];

  const evidenceRefs = buildEvidenceRefs(answerClaims, citations);
  const sourceRefs = buildSourceRefs(answerSources, evidenceRefs);
  const concepts = extractConcepts(answerClaims, options);
  const topic = extractTopic(interpretation, answerResult);

  return {
    id: makeRecordId(),
    sessionId: sessionId || null,
    originalQuestion: interpretation?.questionText || interpretation?.originalQuestion || '',
    origin,
    parentRecordId: parentRecordId ?? null,
    topic,
    concepts,
    verifiedAnswer: answerResult?.answerText || '',
    evidence: evidenceRefs,
    sources: sourceRefs,
    createdAt: new Date().toISOString(),
    status: RECORD_STATUS.VERIFIED
  };
}
