/**
 * Mishkat Phase 7: Citation Manager
 * 
 * Strict compliance with Section 7:
 * - Citations shown to the user must come ONLY from evidence actually used in the final answer
 * - Do NOT cite every retrieved or accepted source automatically
 * - Rejects fabricated source/citation attempts
 * - Deduplicates citations using:
 *     1. chunkId where available
 *     2. otherwise sourceId + deterministic normalized text/provenance identity
 * - Preserves all provenance:
 *     sourceId, sourceName, sourceUrl, chunkId, recordId, reference, attribution
 */

import crypto from 'node:crypto';

/**
 * Builds a deterministic key for citation deduplication
 * 
 * @param {Object} citation
 * @returns {string} Unique deduplication key
 */
export function getCitationKey(citation) {
  if (!citation || typeof citation !== 'object') {
    return `invalid_cit_${Math.random()}`;
  }

  if (typeof citation.chunkId === 'string' && citation.chunkId.trim().length > 0) {
    return `chunk:${citation.chunkId.trim()}`;
  }

  const sourceId = citation.sourceId || '';
  const text = citation.text || citation.title || '';
  const hash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
  return `src:${sourceId}:${hash}`;
}

/**
 * Validates proposed citations against accepted evidence and deduplicates them
 * 
 * @param {Object} params
 * @param {Array<Object>} params.acceptedEvidence Verified evidence accepted by Phase 6
 * @param {Array<string>} [params.usedChunkIds=[]] List of chunkIds actually referenced/grounded in answer claims
 * @param {Array<Object>} [params.proposedCitations=[]] Optional explicit citations proposed by generator
 * @param {Map<string, Array<string>>} [params.chunkToAnswerClaimsMap=new Map()] Mapping from chunkId to answer claimIds
 * @returns {Object} { citations: Array, sources: Array, rejectedCitations: Array }
 */
export function buildValidatedCitations({
  acceptedEvidence = [],
  usedChunkIds = [],
  proposedCitations = [],
  chunkToAnswerClaimsMap = new Map()
}) {
  const acceptedChunkMap = new Map();
  const acceptedSourceMap = new Map();

  // Index all accepted evidence items
  for (const ev of acceptedEvidence) {
    if (ev && ev.chunkId) {
      acceptedChunkMap.set(ev.chunkId, ev);
    }
  }

  const usedSet = new Set(usedChunkIds.filter(Boolean));
  const rejectedCitations = [];
  const validCitationMap = new Map();

  // 1. If explicit proposed citations are provided, validate every one against accepted evidence
  if (Array.isArray(proposedCitations) && proposedCitations.length > 0) {
    for (const prop of proposedCitations) {
      const chunkId = prop.chunkId;
      const matchedEvidence = chunkId ? acceptedChunkMap.get(chunkId) : null;

      if (!matchedEvidence) {
        // Fabricated or unaccepted source! Reject it strictly (Section 7 & Test 9)
        rejectedCitations.push({
          ...prop,
          reason: 'REJECTED_FABRICATION: Citation does not match any accepted evidence chunk in the Phase 6 packet.'
        });
        continue;
      }

      const key = getCitationKey(matchedEvidence);
      if (!validCitationMap.has(key)) {
        const supportedClaims = chunkToAnswerClaimsMap.get(matchedEvidence.chunkId) || [];
        validCitationMap.set(key, createCitationRecord(matchedEvidence, supportedClaims));
      }
    }
  }

  // 2. Add citations for any accepted chunks actually used in grounding
  for (const chunkId of usedSet) {
    const matchedEvidence = acceptedChunkMap.get(chunkId);
    if (matchedEvidence) {
      const key = getCitationKey(matchedEvidence);
      if (!validCitationMap.has(key)) {
        const supportedClaims = chunkToAnswerClaimsMap.get(chunkId) || [];
        validCitationMap.set(key, createCitationRecord(matchedEvidence, supportedClaims));
      }
    }
  }

  const citations = Array.from(validCitationMap.values());

  // 3. Aggregate unique sources with chunk counts
  const sourceAggregate = new Map();
  for (const cit of citations) {
    const srcId = cit.sourceId || 'src_unknown';
    if (!sourceAggregate.has(srcId)) {
      sourceAggregate.set(srcId, {
        sourceId: srcId,
        sourceName: cit.sourceName || '',
        sourceUrl: cit.sourceUrl || null,
        chunkCount: 0
      });
    }
    sourceAggregate.get(srcId).chunkCount++;
  }

  const sources = Array.from(sourceAggregate.values());

  return {
    citations,
    sources,
    rejectedCitations
  };
}

/**
 * Creates a normalized citation record preserving complete provenance
 */
function createCitationRecord(ev, supportedAnswerClaims = []) {
  return {
    citationId: `cit_${crypto.randomBytes(5).toString('hex')}`,
    chunkId: ev.chunkId,
    recordId: ev.recordId || null,
    sourceId: ev.sourceId,
    sourceName: ev.sourceName || '',
    sourceUrl: ev.sourceUrl || null,
    domain: ev.domain || 'GENERAL',
    title: ev.title || '',
    section: ev.section || '',
    text: ev.text || '',
    reference: ev.reference ? { ...ev.reference } : {},
    attribution: ev.attribution ? { ...ev.attribution } : {},
    supportedAnswerClaims: Array.from(new Set(supportedAnswerClaims))
  };
}
