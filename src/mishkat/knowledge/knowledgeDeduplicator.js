/**
 * Mishkat Knowledge Deduplicator — Deterministic Provenance-Preserving Deduplicator
 * 
 * Rules:
 * 1. Uses exact normalized content hash + sourceId + reference metadata.
 * 2. NEVER deletes evidence due to semantic similarity.
 * 3. If identical text exists from two different legitimate sources, PRESERVES BOTH
 *    to maintain multi-source corroboration and independent provenance.
 * 4. Rejects identical duplicate records submitted under the same source.
 */

import { generateDeduplicationKey, computeContentHash } from './knowledgeNormalizer.js';

export class KnowledgeDeduplicator {
  constructor() {
    this._seenKeys = new Set();
  }

  /**
   * Generates a unique deduplication key for a record or chunk
   * 
   * @param {Object} item Record or Chunk
   * @returns {string} Stable deduplication key
   */
  generateKey(item) {
    if (!item) return '';
    const sourceId = item.sourceId || '';
    const domain = item.domain || '';
    const text = item.text || '';
    const reference = item.reference || {};
    return generateDeduplicationKey(sourceId, domain, text, reference);
  }

  /**
   * Checks if a record/chunk is an identical duplicate of a previously seen item
   * 
   * @param {Object} item 
   * @returns {boolean}
   */
  isDuplicate(item) {
    const key = this.generateKey(item);
    return this._seenKeys.has(key);
  }

  /**
   * Registers a record/chunk key as seen
   * 
   * @param {Object} item 
   * @returns {boolean} True if newly registered, false if already existed
   */
  register(item) {
    const key = this.generateKey(item);
    if (this._seenKeys.has(key)) {
      return false;
    }
    this._seenKeys.add(key);
    return true;
  }

  /**
   * Filters out identical duplicates from an array of records/chunks
   * 
   * @param {Array<Object>} items 
   * @returns {{ unique: Array<Object>, duplicates: Array<Object> }}
   */
  filterDuplicates(items) {
    const unique = [];
    const duplicates = [];

    for (const item of items) {
      if (this.isDuplicate(item)) {
        duplicates.push(item);
      } else {
        this.register(item);
        unique.push(item);
      }
    }

    return { unique, duplicates };
  }

  /**
   * Clears seen keys
   */
  reset() {
    this._seenKeys.clear();
  }
}

export default KnowledgeDeduplicator;
