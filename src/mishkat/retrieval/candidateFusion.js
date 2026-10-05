/**
 * Mishkat Candidate Fusion — Reciprocal Rank Fusion (RRF) Engine
 * 
 * Strict compliance with Section 13 & 14:
 * - Deterministic Reciprocal Rank Fusion (RRF): RRF(d) = sum(1 / (k + rank_i(d)))
 * - Integrates metadata affinity boost without distorting rank comparability
 * - Preserves complete candidate diagnostics and provenance contract
 */

import { MetadataFilter } from './metadataFilter.js';

export class CandidateFusion {
  constructor(options = {}) {
    this.k = options.rrfK || 60;
    this.metadataFilter = options.metadataFilter || new MetadataFilter(options);
  }

  /**
   * Fuses lexical and semantic candidate lists into a unified ranked list
   * 
   * @param {Object} params
   * @param {Array<Object>} params.lexicalCandidates
   * @param {Array<Object>} params.semanticCandidates
   * @param {Object} params.query
   * @returns {Array<Object>} Fused and ranked candidates matching canonical candidate contract
   */
  fuse({ lexicalCandidates = [], semanticCandidates = [], query }) {
    const candidatesMap = new Map(); // chunkId -> merged intermediate data

    // 1. Process Lexical Candidates
    for (const item of lexicalCandidates) {
      const chunk = item.chunk;
      if (!chunk || !chunk.chunkId) continue;

      const rrfLexical = 1.0 / (this.k + item.lexicalRank);

      candidatesMap.set(chunk.chunkId, {
        chunk,
        lexicalScore: item.lexicalScore,
        lexicalRank: item.lexicalRank,
        termCoverage: item.termCoverage ?? 1.0,
        semanticScore: 0,
        semanticRank: null,
        rrfLexical,
        rrfSemantic: 0
      });
    }

    // 2. Process Semantic Candidates
    for (const item of semanticCandidates) {
      const chunk = item.chunk;
      if (!chunk || !chunk.chunkId) continue;

      const rrfSemantic = 1.0 / (this.k + item.semanticRank);

      if (candidatesMap.has(chunk.chunkId)) {
        const existing = candidatesMap.get(chunk.chunkId);
        existing.semanticScore = item.semanticScore;
        existing.semanticRank = item.semanticRank;
        existing.rrfSemantic = rrfSemantic;
      } else {
        candidatesMap.set(chunk.chunkId, {
          chunk,
          lexicalScore: 0,
          lexicalRank: null,
          semanticScore: item.semanticScore,
          semanticRank: item.semanticRank,
          rrfLexical: 0,
          rrfSemantic
        });
      }
    }

    // 3. Compute RRF Fusion Score + Metadata Boost
    const fusedList = [];

    for (const [chunkId, data] of candidatesMap.entries()) {
      const chunk = data.chunk;
      const baseRrf = data.rrfLexical + data.rrfSemantic;
      const metadataBoost = this.metadataFilter.calculateBoost(chunk, query);
      const finalScore = baseRrf * (1.0 + metadataBoost);

      fusedList.push({
        ...data,
        baseRrf,
        metadataBoost,
        finalScore
      });
    }

    // 4. Sort by finalScore descending
    fusedList.sort((a, b) => b.finalScore - a.finalScore);

    // 5. Build Canonical Candidate Contracts
    return fusedList.map((item, index) => {
      const chunk = item.chunk;
      return {
        claimId: query.claimId,
        chunkId: chunk.chunkId,
        recordId: chunk.recordId,
        sourceId: chunk.sourceId,
        sourceName: chunk.sourceName || '',
        sourceUrl: chunk.sourceUrl || null,
        domain: chunk.domain,
        title: chunk.title || '',
        section: chunk.section || '',
        text: chunk.text,
        evidenceType: chunk.evidenceType || '',
        reference: chunk.reference ? { ...chunk.reference } : {},
        attribution: chunk.attribution ? { ...chunk.attribution } : {},
        verification: chunk.verification ? { ...chunk.verification } : {},
        scores: {
          lexicalScore: item.lexicalScore,
          lexicalRank: item.lexicalRank,
          termCoverage: item.termCoverage ?? (item.lexicalScore > 0 ? 1.0 : 0.0),
          semanticScore: item.semanticScore,
          semanticRank: item.semanticRank,
          metadataBoost: Number(item.metadataBoost.toFixed(4)),
          fusionScore: Number(item.baseRrf.toFixed(5)),
          finalScore: Number(item.finalScore.toFixed(5))
        },
        finalRank: index + 1
      };
    });
  }
}

export default CandidateFusion;
