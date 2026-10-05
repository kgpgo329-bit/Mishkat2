/**
 * Mishkat Lexical Retriever — Arabic BM25 Ranking Engine
 * 
 * Implements Arabic-aware BM25 lexical retrieval over KnowledgeChunks.
 * Adheres strictly to Section 8:
 * - Search-specific normalization without altering stored source text
 * - Okapi BM25 ranking formula (k1=1.2, b=0.75)
 * - Returns ranked candidate chunks with lexicalScore and lexicalRank
 */

import { normalizeSearchText, extractSearchTokens } from './retrievalQueryBuilder.js';

export class LexicalRetriever {
  constructor(chunks = [], options = {}) {
    this.k1 = options.k1 ?? 1.2;
    this.b = options.b ?? 0.75;
    this.index = new Map(); // term -> Map<chunkId, termFrequency>
    this.docLengths = new Map(); // chunkId -> docLength
    this.chunksMap = new Map(); // chunkId -> chunk
    this.totalDocs = 0;
    this.avgDocLength = 0;

    if (Array.isArray(chunks) && chunks.length > 0) {
      this.buildIndex(chunks);
    }
  }

  /**
   * Builds the inverted index over the provided KnowledgeChunks
   * @param {Array<Object>} chunks 
   */
  buildIndex(chunks) {
    this.index.clear();
    this.docLengths.clear();
    this.chunksMap.clear();

    let totalLength = 0;

    for (const chunk of chunks) {
      this.chunksMap.set(chunk.chunkId, chunk);

      // Create search document combining title, section, topics, and canonical text
      const topicsText = Array.isArray(chunk.topics) ? chunk.topics.join(' ') : '';
      const docText = `${chunk.title || ''} ${chunk.section || ''} ${topicsText} ${chunk.text || ''}`;
      const tokens = extractSearchTokens(docText);

      this.docLengths.set(chunk.chunkId, tokens.length);
      totalLength += tokens.length;

      // Calculate term frequencies in this document
      const tfMap = new Map();
      for (const token of tokens) {
        tfMap.set(token, (tfMap.get(token) || 0) + 1);
      }

      // Add to inverted index
      for (const [token, count] of tfMap.entries()) {
        if (!this.index.has(token)) {
          this.index.set(token, new Map());
        }
        this.index.get(token).set(chunk.chunkId, count);
      }
    }

    this.totalDocs = chunks.length;
    this.avgDocLength = this.totalDocs > 0 ? (totalLength / this.totalDocs) : 0;
  }

  /**
   * Calculates Inverse Document Frequency (IDF) for a term
   * @param {string} term 
   * @returns {number}
   */
  getIDF(term) {
    const docFreq = this.index.has(term) ? this.index.get(term).size : 0;
    // Standard Okapi BM25 IDF formula with 1-smoothing
    return Math.log(((this.totalDocs - docFreq + 0.5) / (docFreq + 0.5)) + 1);
  }

  /**
   * Scores all indexed chunks against the query and returns ranked candidates
   * 
   * @param {Object} query Built retrieval query from retrievalQueryBuilder
   * @param {Object} [options={}]
   * @returns {Array<Object>} List of ranked candidates with lexicalScore and lexicalRank
   */
  search(query, options = {}) {
    const candidatePoolSize = options.candidatePoolSize || 20;
    const queryTokens = Array.isArray(query.searchTokens) && query.searchTokens.length > 0
      ? query.searchTokens
      : extractSearchTokens(query.claimText || query.originalQuestion || '');

    if (queryTokens.length === 0 || this.totalDocs === 0) {
      return [];
    }

    const uniqueQueryTokens = Array.from(new Set(queryTokens));

    // Accumulate BM25 scores per chunk
    const scores = new Map(); // chunkId -> score
    const matchedTermsMap = new Map(); // chunkId -> Set<string>

    for (const token of uniqueQueryTokens) {
      if (!this.index.has(token)) continue;

      const idf = this.getIDF(token);
      const postingList = this.index.get(token);

      for (const [chunkId, tf] of postingList.entries()) {
        const docLen = this.docLengths.get(chunkId) || this.avgDocLength;
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLength));
        const termScore = idf * (numerator / denominator);

        scores.set(chunkId, (scores.get(chunkId) || 0) + termScore);
        if (!matchedTermsMap.has(chunkId)) {
          matchedTermsMap.set(chunkId, new Set());
        }
        matchedTermsMap.get(chunkId).add(token);
      }
    }

    // Sort by lexical score descending
    const rankedResults = Array.from(scores.entries())
      .filter(([_, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, candidatePoolSize);

    return rankedResults.map(([chunkId, lexicalScore], index) => {
      const chunk = this.chunksMap.get(chunkId);
      const matchedCount = matchedTermsMap.has(chunkId) ? matchedTermsMap.get(chunkId).size : 0;
      const termCoverage = uniqueQueryTokens.length > 0 ? (matchedCount / uniqueQueryTokens.length) : 0;
      return {
        chunk,
        lexicalScore: Number(lexicalScore.toFixed(4)),
        lexicalRank: index + 1,
        termCoverage: Number(termCoverage.toFixed(4))
      };
    });
  }
}

export default LexicalRetriever;
