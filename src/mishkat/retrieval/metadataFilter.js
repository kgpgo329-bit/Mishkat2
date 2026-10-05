/**
 * Mishkat Metadata Filter & Booster — Phase 4
 * 
 * Implements non-destructive domain boosting based on Phase 2 task,
 * requestedEvidence, and preferredDomains.
 * Adheres strictly to Section 12:
 * - Prefer soft boosting over destructive filtering
 * - Primary evidence across domains remains discoverable
 */

export class MetadataFilter {
  constructor(options = {}) {
    this.enabled = options.enableMetadataBoost ?? true;
    this.weight = options.metadataBoostWeight ?? 0.35;
  }

  /**
   * Calculates a metadata affinity boost for a given candidate chunk
   * 
   * @param {Object} chunk KnowledgeChunk
   * @param {Object} query Built retrieval query
   * @returns {number} Metadata boost multiplier [0.0 - 1.0]
   */
  calculateBoost(chunk, query) {
    if (!this.enabled || !chunk || !query) return 0.0;

    let boost = 0.0;
    const preferredDomains = Array.isArray(query.preferredDomains) ? query.preferredDomains : [];

    // 1. Preferred Domain Match
    if (preferredDomains.length > 0) {
      const domainIndex = preferredDomains.indexOf(chunk.domain);
      if (domainIndex === 0) {
        boost += 0.40; // Top preferred domain
      } else if (domainIndex > 0) {
        boost += Math.max(0.15, 0.35 - (domainIndex * 0.1));
      }
    }

    // 2. Evidence Type Exact Match
    if (query.requestedEvidence && chunk.evidenceType === query.requestedEvidence) {
      boost += 0.30;
    }

    // 3. Task-specific Nuance Boosts
    switch (query.task) {
      case 'TRANSLATE_CONCEPT':
        if (chunk.domain === 'TERMINOLOGY') boost += 0.25;
        break;
      case 'VERIFY_HADITH':
        if (chunk.domain === 'HADITH') boost += 0.25;
        break;
      case 'VERIFY_QURAN':
      case 'CORRECT_QUOTE':
        if (chunk.domain === 'QURAN') boost += 0.25;
        break;
      case 'MISCONCEPTION':
        // Boost misconception rebuttals, but keep primary Quran/Hadith/History discoverable
        if (chunk.domain === 'MISCONCEPTIONS') boost += 0.20;
        break;
      case 'VERIFY_CONSENSUS':
        if (chunk.domain === 'FIQH' || chunk.domain === 'AQEEDAH') boost += 0.20;
        break;
      case 'HISTORICAL_CLAIM':
        if (chunk.domain === 'HISTORY') boost += 0.25;
        break;
    }

    // Cap total boost at 1.0, scaled by weight
    return Math.min(1.0, boost) * this.weight;
  }
}

export default MetadataFilter;
