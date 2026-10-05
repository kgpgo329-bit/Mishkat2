/**
 * Mishkat Retrieval Service — Phase 4 Hybrid Trusted Retrieval
 * 
 * Canonical orchestrator for hybrid claim-aware retrieval.
 * Invariants:
 * 1. Searches ONLY indexed trusted KnowledgeChunks from TrustedSourceRepository.
 * 2. Claims-first: iterates every claim in interpretation.claimsToResolve.
 * 3. Fuses Arabic BM25 lexical retrieval and dense semantic embeddings via RRF.
 * 4. Applies non-destructive domain and evidence boosts.
 * 5. Deduplicates candidates and respects zero-result thresholds.
 * 6. Never generates answers, proof verdicts, or citations.
 */

import crypto from 'crypto';
import { defaultTrustedSourceRepository } from '../knowledge/TrustedSourceRepository.js';
import { DEFAULT_RETRIEVAL_OPTIONS } from './retrievalTypes.js';
import { buildClaimRetrievalQueries } from './retrievalQueryBuilder.js';
import { LexicalRetriever } from './lexicalRetriever.js';
import { SemanticRetriever } from './semanticRetriever.js';
import { getEmbeddingProvider } from './embeddingProvider.js';
import { CandidateFusion } from './candidateFusion.js';
import { CandidateRanker } from './candidateRanker.js';
import { RetrievalDiagnosticsCollector } from './retrievalDiagnostics.js';

export class RetrievalService {
  constructor(options = {}) {
    this.options = { ...DEFAULT_RETRIEVAL_OPTIONS, ...options };
    this.embeddingProvider = getEmbeddingProvider(this.options);
    this.lexicalRetriever = new LexicalRetriever([], this.options);
    this.semanticRetriever = new SemanticRetriever([], {
      provider: this.embeddingProvider,
      ...this.options
    });
    this.fusion = new CandidateFusion(this.options);
    this.ranker = new CandidateRanker(this.options);
    this.diagnosticsCollector = new RetrievalDiagnosticsCollector();
    this._initialized = false;
  }

  /**
   * Initializes / synchronizes indexed chunks from the repository
   * @param {Object} repository TrustedSourceRepository instance
   */
  async initializeWithRepository(repository = defaultTrustedSourceRepository) {
    // If repository has no in-memory chunks, attempt disk load
    if (repository.chunkCount === 0) {
      try {
        repository.loadFromDisk('data/knowledge');
      } catch {
        // Ignored if disk data is not populated
      }
    }

    // Retrieve all chunks from repository
    const chunks = [];
    for (const [_, chunk] of repository._chunks.entries()) {
      chunks.push(chunk);
    }

    this.lexicalRetriever.buildIndex(chunks);
    await this.semanticRetriever.indexChunks(chunks);
    this._initialized = true;
  }

  /**
   * Primary Canonical Entry Point:
   * retrieveForInterpretation({ interpretation, repository, options })
   * 
   * @param {Object} params
   * @param {Object} params.interpretation Output from Phase 2 Question Understanding
   * @param {Object} [params.repository] TrustedSourceRepository instance
   * @param {Object} [params.options] Override options
   * @returns {Promise<{ queryId: string, claims: Array<Object>, diagnostics: Object }>}
   */
  async retrieveForInterpretation({ interpretation, repository = defaultTrustedSourceRepository, options = {} }) {
    if (!interpretation || typeof interpretation !== 'object') {
      throw new Error('INVALID_INTERPRETATION: retrieveForInterpretation requires a valid interpretation object.');
    }

    const mergedOptions = { ...this.options, ...options };
    const queryId = `qret_${crypto.randomBytes(6).toString('hex')}`;
    const tracer = this.diagnosticsCollector.createTrace(queryId, interpretation);

    // 1. Ensure retrievers are synced with repository chunks
    if (!this._initialized || repository.chunkCount !== this.lexicalRetriever.totalDocs) {
      await this.initializeWithRepository(repository);
    }

    // 2. Build claims-first retrieval queries
    const claimQueries = buildClaimRetrievalQueries(interpretation);
    const claimResults = [];

    // 3. Execute hybrid retrieval for each claim independently
    for (const claimQuery of claimQueries) {
      // A. Lexical Retrieval (BM25)
      const lexicalCandidates = this.lexicalRetriever.search(claimQuery, mergedOptions);

      // B. Semantic Retrieval (Embeddings & Cosine Similarity)
      const semanticCandidates = await this.semanticRetriever.search(claimQuery, mergedOptions);

      // C. Reciprocal Rank Fusion & Metadata Boosting
      const fusedCandidates = this.fusion.fuse({
        lexicalCandidates,
        semanticCandidates,
        query: claimQuery
      });

      // D. Final Deduplication, Zero-Result Relevance Filtering, and Top-K Ranking
      const finalCandidates = this.ranker.rank(fusedCandidates, mergedOptions);

      // Diagnostics for this claim
      tracer.recordClaim(claimQuery, {
        lexicalCount: lexicalCandidates.length,
        semanticCount: semanticCandidates.length,
        fusedCount: fusedCandidates.length,
        finalCount: finalCandidates.length,
        rejectedCount: fusedCandidates.length - finalCandidates.length
      });

      claimResults.push({
        claimId: claimQuery.claimId,
        query: {
          task: claimQuery.task,
          topic: claimQuery.topic,
          userGoal: claimQuery.userGoal,
          claimText: claimQuery.claimText,
          requestedEvidence: claimQuery.requestedEvidence,
          preferredDomains: claimQuery.preferredDomains
        },
        candidates: finalCandidates
      });
    }

    const diagnostics = tracer.finish({
      providerType: this.embeddingProvider.providerType,
      modelName: this.embeddingProvider.modelName
    });

    return {
      queryId,
      claims: claimResults,
      diagnostics
    };
  }
}

// Singleton instance
export const defaultRetrievalService = new RetrievalService();

/**
 * Top-level canonical function for standalone invocation
 */
export async function retrieveForInterpretation(params) {
  return defaultRetrievalService.retrieveForInterpretation(params);
}

export default RetrievalService;
