/**
 * Mishkat Semantic Retriever — Embedding-based Candidate Discovery
 * 
 * Computes dense semantic embeddings for query and KnowledgeChunks.
 * Ranks candidates by cosine similarity.
 * Caches chunk embeddings for high throughput and zero redundant calls.
 */

import { getEmbeddingProvider, computeCosineSimilarity } from './embeddingProvider.js';

export class SemanticRetriever {
  constructor(chunks = [], options = {}) {
    this.provider = options.provider || getEmbeddingProvider(options);
    this.chunkEmbeddings = new Map(); // chunkId -> number[]
    this.chunksMap = new Map(); // chunkId -> chunk

    if (Array.isArray(chunks) && chunks.length > 0) {
      // Synchronous registration, embeddings will be lazily or batch indexed
      for (const chunk of chunks) {
        this.chunksMap.set(chunk.chunkId, chunk);
      }
    }
  }

  /**
   * Pre-computes or updates embeddings for a set of KnowledgeChunks
   * @param {Array<Object>} chunks 
   */
  async indexChunks(chunks) {
    for (const chunk of chunks) {
      this.chunksMap.set(chunk.chunkId, chunk);

      if (!this.chunkEmbeddings.has(chunk.chunkId)) {
        // Construct semantic document string incorporating title, section, topics, and text
        const topicsStr = Array.isArray(chunk.topics) ? chunk.topics.join(' ') : '';
        const semanticText = `${chunk.title || ''} ${chunk.section || ''} ${topicsStr} ${chunk.text || ''}`.trim();
        const vec = await this.provider.embedText(semanticText);
        this.chunkEmbeddings.set(chunk.chunkId, vec);
      }
    }
  }

  /**
   * Searches KnowledgeChunks semantically against a retrieval query
   * 
   * @param {Object} query Built retrieval query from retrievalQueryBuilder
   * @param {Object} [options={}]
   * @returns {Promise<Array<Object>>} Ranked candidates with semanticScore and semanticRank
   */
  async search(query, options = {}) {
    const candidatePoolSize = options.candidatePoolSize || 20;

    // Ensure all chunks are embedded
    const missingChunks = Array.from(this.chunksMap.values()).filter(c => !this.chunkEmbeddings.has(c.chunkId));
    if (missingChunks.length > 0) {
      await this.indexChunks(missingChunks);
    }

    if (this.chunksMap.size === 0) {
      return [];
    }

    // Embed composite search text
    const queryText = query.compositeSearchText || query.claimText || query.originalQuestion || '';
    const queryVec = await this.provider.embedText(queryText);

    const scored = [];
    for (const [chunkId, chunkVec] of this.chunkEmbeddings.entries()) {
      const chunk = this.chunksMap.get(chunkId);
      if (!chunk) continue;

      const sim = computeCosineSimilarity(queryVec, chunkVec);
      scored.push({
        chunk,
        semanticScore: Number(sim.toFixed(4))
      });
    }

    // Sort by semantic similarity descending
    scored.sort((a, b) => b.semanticScore - a.semanticScore);

    const sliced = scored.slice(0, candidatePoolSize);
    return sliced.map((item, index) => ({
      ...item,
      semanticRank: index + 1
    }));
  }
}

export default SemanticRetriever;
