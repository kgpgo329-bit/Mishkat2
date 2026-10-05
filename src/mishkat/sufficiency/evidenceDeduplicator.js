/**
 * Mishkat Phase 6: Evidence Deduplicator
 * 
 * Strict compliance with Rule 15 & 16:
 * - Deduplicates evidence items prior to sufficiency evaluation and aggregation
 * - Priority key resolution:
 *     1. evidenceId (if provided and non-empty)
 *     2. chunkId (if provided and non-empty)
 *     3. Safe deterministic fallback based on recordId + sourceId + text hash
 * - Preserves all upstream fields and complete provenance
 * - Guarantees duplicate evidence never inflates sufficiency metrics
 */

import crypto from 'node:crypto';

/**
 * Derives a deterministic unique key for an evidence item
 * 
 * @param {Object} item Evidence item from Phase 5 verification output
 * @returns {string} Unique deduplication key
 */
export function getEvidenceKey(item) {
  if (!item || typeof item !== 'object') {
    return `invalid_${Math.random()}`;
  }

  // 1. Primary: evidenceId
  if (typeof item.evidenceId === 'string' && item.evidenceId.trim().length > 0) {
    return `ev:${item.evidenceId.trim()}`;
  }

  // 2. Secondary: chunkId
  if (typeof item.chunkId === 'string' && item.chunkId.trim().length > 0) {
    return `chk:${item.chunkId.trim()}`;
  }

  // 3. Fallback: recordId + sourceId + text hash
  const recordId = item.recordId || '';
  const sourceId = item.sourceId || '';
  const text = item.text || item.chunkText || '';
  const textHash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);

  return `prov:${recordId}:${sourceId}:${textHash}`;
}

/**
 * Deduplicates an array of verified evidence items
 * 
 * @param {Array<Object>} evidenceList List of evidence items for a claim
 * @returns {Object} Deduplication result containing unique items, duplicates count, and dropped keys
 */
export function deduplicateEvidence(evidenceList) {
  if (!Array.isArray(evidenceList) || evidenceList.length === 0) {
    return {
      items: [],
      totalCount: 0,
      uniqueCount: 0,
      duplicateCount: 0,
      droppedKeys: []
    };
  }

  const seenEvidenceIds = new Set();
  const seenChunkIds = new Set();
  const seenFallbackKeys = new Set();

  const uniqueItems = [];
  const droppedKeys = [];

  for (const item of evidenceList) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const evId = typeof item.evidenceId === 'string' && item.evidenceId.trim().length > 0
      ? item.evidenceId.trim()
      : null;
    const chkId = typeof item.chunkId === 'string' && item.chunkId.trim().length > 0
      ? item.chunkId.trim()
      : null;

    let isDuplicate = false;
    let duplicateKey = null;

    if (evId && seenEvidenceIds.has(evId)) {
      isDuplicate = true;
      duplicateKey = `ev:${evId}`;
    } else if (chkId && seenChunkIds.has(chkId)) {
      isDuplicate = true;
      duplicateKey = `chk:${chkId}`;
    } else if (!evId && !chkId) {
      const fbKey = getEvidenceKey(item);
      if (seenFallbackKeys.has(fbKey)) {
        isDuplicate = true;
        duplicateKey = fbKey;
      }
    }

    if (isDuplicate) {
      droppedKeys.push(duplicateKey);
      continue;
    }

    // Register all available identifiers for this unique item
    if (evId) seenEvidenceIds.add(evId);
    if (chkId) seenChunkIds.add(chkId);
    if (!evId && !chkId) seenFallbackKeys.add(getEvidenceKey(item));

    // Clone item with complete provenance intact
    uniqueItems.push({ ...item });
  }

  return {
    items: uniqueItems,
    totalCount: evidenceList.length,
    uniqueCount: uniqueItems.length,
    duplicateCount: droppedKeys.length,
    droppedKeys
  };
}
