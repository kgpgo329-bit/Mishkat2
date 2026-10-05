/**
 * Mishkat Candidate Ranker — Slicing, Deduplication, and Zero-Result Filtering
 * 
 * Strict compliance with Sections 15, 16, & 17:
 * - Configurable Top-K (default: 5)
 * - Deterministic deduplication by chunkId while preserving multi-source provenance
 * - Principled zero-result thresholding: returns [] if no candidate meets relevance criteria
 */

export class CandidateRanker {
  constructor(options = {}) {
    this.topK = options.topK || 5;
    this.minRelevanceThreshold = options.minRelevanceThreshold || 0.012;
    this.minSemanticNoiseFloor = options.minSemanticNoiseFloor ?? 0.60;
  }

  /**
   * Post-processes, filters, and ranks fused candidates
   * 
   * @param {Array<Object>} candidates Fused candidate list
   * @param {Object} [overrideOptions={}]
   * @returns {Array<Object>} Ranked Top-K candidates or empty array
   */
  rank(candidates, overrideOptions = {}) {
    const topK = overrideOptions.topK || this.topK;
    const threshold = overrideOptions.minRelevanceThreshold ?? this.minRelevanceThreshold;
    const noiseFloor = overrideOptions.minSemanticNoiseFloor ?? this.minSemanticNoiseFloor;

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return [];
    }

    // 1. Deduplicate by chunkId
    const seenChunkIds = new Set();
    const uniqueCandidates = [];

    for (const cand of candidates) {
      if (!cand.chunkId || seenChunkIds.has(cand.chunkId)) {
        continue;
      }
      seenChunkIds.add(cand.chunkId);
      uniqueCandidates.push(cand);
    }

    // 2. Zero-Result Relevance Filtering
    // A candidate is genuine if:
    // (a) It has a significant lexical match (coverage >= 0.20 or semantic support >= noiseFloor), OR
    // (b) It has a semantic score meeting the significance floor (>= noiseFloor)
    // AND its final fusion score meets the relevance threshold.
    const relevantCandidates = uniqueCandidates.filter(c => {
      const lexicalScore = c.scores.lexicalScore || 0;
      const semanticScore = c.scores.semanticScore || 0;
      const termCoverage = c.scores.termCoverage ?? 1.0;

      const hasSignificantLexicalMatch = lexicalScore > 0 && (termCoverage >= 0.20 || semanticScore >= noiseFloor);
      const hasSemanticSignificance = semanticScore >= noiseFloor;
      const passesThreshold = (c.scores.finalScore || 0) >= threshold;

      // Reject candidates that lack significant lexical grounding AND lack semantic significance
      if (!hasSignificantLexicalMatch && !hasSemanticSignificance) {
        return false;
      }

      return passesThreshold;
    });

    // 3. Slice Top-K
    const topCandidates = relevantCandidates.slice(0, topK);

    // 4. Re-assign final 1-based ranks
    return topCandidates.map((cand, index) => ({
      ...cand,
      finalRank: index + 1
    }));
  }
}

export default CandidateRanker;
