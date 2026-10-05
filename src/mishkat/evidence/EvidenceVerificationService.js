/**
 * Mishkat Evidence Verification Service — Phase 5 Orchestrator
 * 
 * Strict compliance with Sections 1, 2, 7, 8, 17, 18, 19, & 25:
 * - Canonical entry point: verifyEvidence({ interpretation, retrievalResult, options })
 * - Evaluates every (Claim x Candidate) independently
 * - Enforces SIMILARITY ≠ EVIDENCE
 * - Preserves full provenance contract: recordId, sourceId, sourceName, domain, reference
 * - Preserves contradictions without discarding them
 * - Honors personal fatwa safety boundary (does not produce personalized fatwas)
 * - Excludes overall sufficiency and answer generation
 */

import crypto from 'crypto';
import { verifyClaimEvidence } from './evidenceVerifier.js';
import { globalEvidenceDiagnostics } from './evidenceDiagnostics.js';
import { DEFAULT_VERIFICATION_OPTIONS } from './evidenceTypes.js';

export class EvidenceVerificationService {
  constructor(options = {}) {
    this.options = { ...DEFAULT_VERIFICATION_OPTIONS, ...options };
  }

  /**
   * Primary Canonical Entry Point:
   * verifyEvidence({ interpretation, retrievalResult, options })
   * 
   * @param {Object} params
   * @param {Object} params.interpretation Output from Phase 2 Question Understanding
   * @param {Object} params.retrievalResult Output from Phase 4 Retrieval
   * @param {Object} [params.options={}] Override options
   * @returns {Promise<Object>} Canonical Evidence Verification Output Contract
   */
  async verifyEvidence({ interpretation, retrievalResult, options = {} }) {
    if (!interpretation || typeof interpretation !== 'object') {
      throw new Error('INVALID_INTERPRETATION: verifyEvidence requires a valid Phase 2 interpretation object.');
    }
    if (!retrievalResult || typeof retrievalResult !== 'object' || !Array.isArray(retrievalResult.claims)) {
      throw new Error('INVALID_RETRIEVAL_RESULT: verifyEvidence requires a valid Phase 4 retrievalResult object.');
    }

    const mergedOptions = { ...this.options, ...options };
    const verificationId = `vfy_${crypto.randomBytes(6).toString('hex')}`;
    const startTime = Date.now();

    const questionContext = {
      originalQuestion: interpretation.originalQuestion || '',
      task: interpretation.task || 'GENERAL',
      userGoal: interpretation.userGoal || '',
      isPersonalFatwa: Boolean(interpretation.isPersonalFatwa)
    };

    const verifiedClaims = [];

    // Map claimsToResolve by claimId for fast lookup
    const claimsMap = new Map();
    if (Array.isArray(interpretation.claimsToResolve)) {
      for (const clm of interpretation.claimsToResolve) {
        claimsMap.set(clm.claimId, clm);
      }
    }

    // Process each claim from the retrieval result
    for (const claimRetrieval of retrievalResult.claims) {
      const claimId = claimRetrieval.claimId;
      const originalClaim = claimsMap.get(claimId) || {
        claimId,
        statement: claimRetrieval.query?.claimText || interpretation.originalQuestion || '',
        requiredEvidenceType: claimRetrieval.query?.requestedEvidence || 'TEXTUAL_EVIDENCE'
      };

      const candidateChunks = claimRetrieval.candidates || [];

      // If no candidate chunks were retrieved for this claim (e.g. zero-result out of domain)
      if (candidateChunks.length === 0) {
        verifiedClaims.push({
          claimId,
          claimText: originalClaim.statement,
          evidence: []
        });
        continue;
      }

      // Perform semantic verification on all candidates for this claim
      const verdicts = await verifyClaimEvidence({
        claim: originalClaim,
        candidateChunks,
        questionContext,
        options: mergedOptions
      });

      const verdictMap = new Map(verdicts.map(v => [v.chunkId, v]));

      // Merge verified verdicts with full chunk provenance
      const evidenceList = candidateChunks.map(chunk => {
        const v = verdictMap.get(chunk.chunkId) || {
          relation: null,
          answersExactClaim: false,
          supportsClaim: false,
          contradictsClaim: false,
          preservesQuestionIntent: false,
          confidence: 0.0,
          reason: 'لم يتم العثور على حكم تحقق لهذه القطعة.',
          verificationStatus: 'VERIFICATION_ERROR',
          verificationMode: 'DETERMINISTIC_VERIFICATION'
        };

        const evidenceId = `ev_${crypto.randomBytes(6).toString('hex')}`;

        return {
          evidenceId,
          claimId,
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
          retrievalScores: chunk.scores ? { ...chunk.scores } : {},
          retrievalRank: chunk.finalRank || null,
          relation: v.relation ?? null,
          answersExactClaim: v.answersExactClaim,
          supportsClaim: v.supportsClaim,
          contradictsClaim: v.contradictsClaim,
          preservesQuestionIntent: v.preservesQuestionIntent,
          scopeMatches: v.scopeMatches ?? (v.relation === 'DIRECT'),
          requiresExternalInference: v.requiresExternalInference ?? (v.relation !== 'DIRECT'),
          materialClaimCoverage: v.materialClaimCoverage ?? (v.relation === 'DIRECT' ? 'COMPLETE' : 'PARTIAL'),
          evidenceTypeMatches: v.evidenceTypeMatches ?? true,
          confidence: v.confidence,
          reason: v.reason,
          verificationStatus: v.verificationStatus,
          verificationMode: v.verificationMode
        };
      });

      verifiedClaims.push({
        claimId,
        claimText: originalClaim.statement,
        evidence: evidenceList
      });
    }

    const totalDurationMs = Date.now() - startTime;
    const diagSummary = globalEvidenceDiagnostics.getSummary();

    return {
      verificationId,
      queryId: retrievalResult.queryId || null,
      claims: verifiedClaims,
      diagnostics: {
        totalDurationMs,
        ...diagSummary
      }
    };
  }
}

export const defaultEvidenceVerificationService = new EvidenceVerificationService();

export async function verifyEvidenceForInterpretation(params) {
  return defaultEvidenceVerificationService.verifyEvidence(params);
}

export default EvidenceVerificationService;
