/**
 * Mishkat Phase 8: Deep Learning Service
 *
 * Canonical orchestrator for Deep Learning / Follow-Up Discovery.
 *
 * Pipeline:
 *  1. Activation Gate (Phase 6 + Phase 7 preconditions)
 *  2. Follow-Up Generation (deterministic or AI-injectable)
 *  3. Deduplication (Arabic normalization + original-question guard)
 *  4. Status resolution (SUCCESS / GATED / EMPTY)
 *
 * Strict invariants:
 * - NEVER generates an answer.
 * - NEVER creates a Knowledge Journey record.
 * - NEVER marks a follow-up as verified.
 * - funnelFollowUpAsNewQuestion() produces a plain question object only.
 */

import crypto from 'crypto';
import { DEEP_LEARNING_STATUS, FOLLOW_UP_ORIGIN, DEEP_LEARNING_CONFIG } from './deepLearningTypes.js';
import { checkDeepLearningActivation } from './activationGate.js';
import { generateFollowUps } from './followUpGenerator.js';
import { deduplicateFollowUps } from './followUpDeduplicator.js';

class DeepLearningService {
  /**
   * Generates follow-up questions after a fully verified, grounded answer.
   *
   * @param {Object} params
   * @param {Object} params.interpretation       Phase 2 question interpretation
   * @param {Object} params.sufficiencyResult    Phase 6 sufficiency output
   * @param {Object} params.answerResult         Phase 7 grounded answer output
   * @param {Object} [params.options]            Injection / override options
   * @param {Array}  [params.options.mockSuggestions]     Full mock suggestions (tests)
   * @param {Function}[params.options.generatorOverride]  Custom generator function
   * @returns {Promise<Object>} { status, suggestions, diagnostics }
   */
  async generateFollowUps({ interpretation, sufficiencyResult, answerResult, options = {} }) {
    const diagnostics = {
      serviceId: 'dl_' + crypto.randomBytes(4).toString('hex'),
      activationChecked: false,
      generatedCount: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      rejections: []
    };

    // ── Step 1: Activation Gate ───────────────────────────────────────────
    const gate = checkDeepLearningActivation({ sufficiencyResult, answerResult });
    diagnostics.activationChecked = true;
    diagnostics.gateResult = gate;

    if (!gate.eligible) {
      return {
        status: DEEP_LEARNING_STATUS.GATED,
        suggestions: [],
        diagnostics: {
          ...diagnostics,
          gateReason: gate.reason
        }
      };
    }

    // ── Step 2: Build generation context ─────────────────────────────────
    const originalQuestion = interpretation?.questionText
      || interpretation?.originalQuestion
      || '';

    const task = interpretation?.task || 'GENERAL';

    const originalClaims = interpretation?.claimsToResolve || [];

    const answerClaims = answerResult?.answerClaims || [];

    // Flatten accepted evidence from Phase 6 sufficiency claims
    const acceptedEvidence = [];
    for (const claim of sufficiencyResult?.claims || []) {
      for (const ev of claim.supportingEvidence || []) {
        acceptedEvidence.push(ev);
      }
    }

    const usedSources = answerResult?.sources || [];

    const ctx = {
      originalQuestion,
      task,
      originalClaims,
      answerClaims,
      acceptedEvidence,
      usedSources
    };

    // ── Step 3: Generate ──────────────────────────────────────────────────
    let rawSuggestions;
    try {
      rawSuggestions = await generateFollowUps(ctx, options);
    } catch (err) {
      return {
        status: DEEP_LEARNING_STATUS.GATED,
        suggestions: [],
        diagnostics: {
          ...diagnostics,
          generationError: err.message
        }
      };
    }

    diagnostics.generatedCount = rawSuggestions.length;

    // ── Step 4: Deduplicate ───────────────────────────────────────────────
    const { accepted, rejected } = deduplicateFollowUps(originalQuestion, rawSuggestions);
    diagnostics.acceptedCount = accepted.length;
    diagnostics.rejectedCount = rejected.length;
    diagnostics.rejections = rejected.map(r => ({
      followUpId: r.suggestion?.followUpId,
      reason: r.reason
    }));

    // ── Step 5: Resolve status ────────────────────────────────────────────
    if (accepted.length < DEEP_LEARNING_CONFIG.MIN_SUGGESTIONS) {
      return {
        status: DEEP_LEARNING_STATUS.EMPTY,
        suggestions: [],
        diagnostics
      };
    }

    return {
      status: DEEP_LEARNING_STATUS.SUCCESS,
      suggestions: accepted,
      diagnostics
    };
  }

  /**
   * Converts a Deep Learning follow-up suggestion into a plain new-question
   * object for same-pipeline re-entry.
   *
   * INVARIANTS:
   * - Does NOT shortcut the pipeline.
   * - Does NOT pre-verify the follow-up question.
   * - Does NOT create a Knowledge Journey record.
   * - parentRecordId is preserved from the suggestion (expected to be null).
   *
   * @param {Object} followUp  A suggestion from generateFollowUps()
   * @returns {{ question: string, origin: string, parentRecordId: null }}
   */
  funnelFollowUpAsNewQuestion(followUp) {
    return {
      question: followUp.question,
      origin: FOLLOW_UP_ORIGIN,
      parentRecordId: followUp.parentRecordId ?? null
    };
  }
}

// Singleton default export (matches Phase 6 / 7 pattern)
const deepLearningService = new DeepLearningService();
export default deepLearningService;

// Named exports for direct use and testing
export { DeepLearningService };
export async function generateDeepLearningFollowUps(params) {
  return deepLearningService.generateFollowUps(params);
}
