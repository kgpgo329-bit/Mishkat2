/**
 * Mishkat Evidence Diagnostics — Phase 5
 * 
 * Tracks verification metrics, latencies, model invocations,
 * schema retries, relation distributions, and contradiction counts.
 */

export class EvidenceDiagnosticsCollector {
  constructor() {
    this.reset();
  }

  reset() {
    this.totalVerifications = 0;
    this.aiCalls = 0;
    this.successfulAiCalls = 0;
    this.failedAiCalls = 0;
    this.schemaRetries = 0;
    this.rateLimit429Count = 0;
    this.successfulRetryCount = 0;
    this.exhaustedRetryCount = 0;
    this.verificationErrors = 0;
    this.totalLatencyMs = 0;
    this.contradictionsDetected = 0;
    this.requestedModel = 'gemini-flash-lite-latest';
    this.actualModel = null;
    this.relationCounts = {
      DIRECT: 0,
      SUPPORTING: 0,
      CONTEXTUAL: 0,
      INCIDENTAL: 0,
      UNRELATED: 0
    };
  }

  recordRateLimitHit() {
    this.rateLimit429Count++;
  }

  recordRetrySuccess() {
    this.successfulRetryCount++;
  }

  recordRetryExhausted() {
    this.exhaustedRetryCount++;
  }

  recordVerdict(verdict) {
    this.totalVerifications++;
    if (verdict && verdict.relation && this.relationCounts[verdict.relation] !== undefined) {
      this.relationCounts[verdict.relation]++;
    }
    if (verdict && verdict.contradictsClaim === true) {
      this.contradictionsDetected++;
    }
  }

  recordAiCall({ success, latencyMs, retries = 0, error = null, model = null }) {
    this.aiCalls++;
    this.totalLatencyMs += (latencyMs || 0);
    this.schemaRetries += (retries || 0);
    if (model) this.actualModel = model;

    if (success) {
      this.successfulAiCalls++;
    } else {
      this.failedAiCalls++;
    }
  }

  getSummary() {
    return {
      totalVerifications: this.totalVerifications,
      aiCalls: this.aiCalls,
      successfulAiCalls: this.successfulAiCalls,
      failedAiCalls: this.failedAiCalls,
      schemaRetries: this.schemaRetries,
      rateLimit429Count: this.rateLimit429Count,
      successfulRetryCount: this.successfulRetryCount,
      exhaustedRetryCount: this.exhaustedRetryCount,
      verificationErrors: this.verificationErrors,
      totalLatencyMs: this.totalLatencyMs,
      averageLatencyMs: this.aiCalls > 0 ? Math.round(this.totalLatencyMs / this.aiCalls) : 0,
      contradictionsDetected: this.contradictionsDetected,
      requestedModel: this.requestedModel,
      actualModel: this.actualModel || this.requestedModel,
      relationCounts: { ...this.relationCounts }
    };
  }
}

export const globalEvidenceDiagnostics = new EvidenceDiagnosticsCollector();
