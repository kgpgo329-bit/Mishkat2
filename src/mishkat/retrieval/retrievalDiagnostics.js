/**
 * Mishkat Retrieval Diagnostics Collector — Phase 4
 * 
 * Records granular operational diagnostics for developers:
 * - Query construction
 * - Lexical & semantic candidate pools
 * - Fusion score breakdowns
 * - Rejected/filtered candidates
 * - Latency and embedding provider metrics
 */

export class RetrievalDiagnosticsCollector {
  constructor() {
    this.logs = [];
  }

  createTrace(queryId, interpretation) {
    const startTime = Date.now();
    const trace = {
      queryId,
      originalQuestion: interpretation.originalQuestion,
      task: interpretation.task,
      topic: interpretation.topic,
      claimsCount: interpretation.claimsToResolve?.length || 1,
      claimTraces: [],
      startTime,
      endTime: null,
      totalLatencyMs: 0
    };

    return {
      recordClaim(claimQuery, { lexicalCount, semanticCount, fusedCount, finalCount, rejectedCount }) {
        trace.claimTraces.push({
          claimId: claimQuery.claimId,
          claimText: claimQuery.claimText,
          preferredDomains: claimQuery.preferredDomains,
          requestedEvidence: claimQuery.requestedEvidence,
          searchTokensCount: claimQuery.searchTokens?.length || 0,
          lexicalCount,
          semanticCount,
          fusedCount,
          finalCount,
          rejectedCount
        });
      },

      finish(embeddingProviderInfo = {}) {
        trace.endTime = Date.now();
        trace.totalLatencyMs = trace.endTime - trace.startTime;
        trace.embeddingProvider = embeddingProviderInfo.providerType || 'UNKNOWN';
        trace.embeddingModel = embeddingProviderInfo.modelName || 'UNKNOWN';
        return trace;
      }
    };
  }
}

export default RetrievalDiagnosticsCollector;
