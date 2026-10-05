/**
 * Mishkat Phase 10: Assessment Service Orchestrator
 *
 * Coordinates dynamic assessment generation, storage immutability,
 * client-safe sanitization, and response scoring.
 *
 * INVARIANTS:
 * - Generates assessments ONLY when journey is eligible (>= 20 unique verified records).
 * - Client receives ONLY sanitized items (no correct answers or leakage).
 * - Evaluates against immutable stored assessment instance.
 * - Does NOT create KnowledgeRecords or mutate Knowledge Journey progress.
 * - Zero Firebase dependencies.
 */

import crypto from 'crypto';
import { ASSESSMENT_STATUS } from './assessmentTypes.js';
import { checkAssessmentEligibility } from './assessmentGate.js';
import {
  synthesizeAssessmentItems,
  toClientSafeAssessment
} from './assessmentGenerator.js';
import { scoreAssessment } from './assessmentScorer.js';
import { InMemoryAssessmentStorage } from './assessmentStorage.js';

export class AssessmentService {
  /**
   * @param {Object} [storage] Object implementing AssessmentStorageBase
   */
  constructor(storage) {
    this._storage = storage || new InMemoryAssessmentStorage();
  }

  /**
   * Generates a dynamic assessment from the user's verified Knowledge Journey.
   *
   * @param {Object} params
   * @param {Object} params.journeyState   Current JourneyState
   * @param {Object} [params.options]      { mockItems, generatorOverride, shuffleFn }
   * @returns {Promise<{
   *   status: string,
   *   assessment: Object|null,
   *   reason?: string
   * }>}
   */
  async generateAssessment({ journeyState, options = {} }) {
    // 1. Activation Gate
    const gate = checkAssessmentEligibility(journeyState);
    if (!gate.eligible) {
      return {
        status: ASSESSMENT_STATUS.NOT_ELIGIBLE,
        assessment: null,
        reason: gate.reason
      };
    }

    // 2. Filter strictly VERIFIED records
    const verifiedRecords = (journeyState.verifiedRecords || []).filter(
      r => r && (r.status === 'VERIFIED' || !r.status)
    );

    // 3. Dynamic Generation (Mockable / DI / Synthesizer)
    let items = [];
    if (Array.isArray(options.mockItems)) {
      items = options.mockItems;
    } else if (typeof options.generatorOverride === 'function') {
      items = await options.generatorOverride(verifiedRecords, options);
    } else {
      items = synthesizeAssessmentItems(verifiedRecords, options);
    }

    if (!items || items.length === 0) {
      return {
        status: ASSESSMENT_STATUS.EMPTY,
        assessment: null,
        reason: 'No assessment questions could be derived from the provided records.'
      };
    }

    // 4. Construct Internal Assessment (with Private Answer Keys)
    const assessmentId = 'asm_' + crypto.randomBytes(5).toString('hex');
    const internalAssessment = {
      assessmentId,
      sessionId: journeyState.sessionId || null,
      createdAt: new Date().toISOString(),
      items
    };

    // 5. Store Assessment Instance (Ensures Immutability)
    await this._storage.saveAssessment(internalAssessment);

    // 6. Return Client-Safe Sanitized Payload
    return {
      status: ASSESSMENT_STATUS.CREATED,
      assessment: toClientSafeAssessment(internalAssessment)
    };
  }

  /**
   * Submits user responses and evaluates them against the stored assessment.
   *
   * @param {Object} params
   * @param {string} params.assessmentId
   * @param {Array<{assessmentItemId: string, selectedOptionId: string}>} params.responses
   * @returns {Promise<Object>} submissionResult
   */
  async submitAssessment({ assessmentId, responses = [] }) {
    if (!assessmentId) {
      throw new Error('MISSING_ASSESSMENT_ID: assessmentId is required for submission.');
    }

    const storedAssessment = await this._storage.getAssessment(assessmentId);
    if (!storedAssessment) {
      throw new Error(`ASSESSMENT_NOT_FOUND: No assessment found with id '${assessmentId}'.`);
    }

    // Score against private keys
    const scoredResult = scoreAssessment(storedAssessment, responses);

    // Save submission record
    await this._storage.saveSubmission(scoredResult);

    return scoredResult;
  }

  /**
   * Fetches a client-safe assessment by ID.
   * @param {string} assessmentId
   * @returns {Promise<Object|null>}
   */
  async getClientAssessment(assessmentId) {
    const internal = await this._storage.getAssessment(assessmentId);
    return internal ? toClientSafeAssessment(internal) : null;
  }

  /**
   * Directly fetches internal assessment for tests / domain introspection.
   * @param {string} assessmentId
   * @returns {Promise<Object|null>}
   */
  async getInternalAssessment(assessmentId) {
    return this._storage.getAssessment(assessmentId);
  }
}

// Default singleton instance
const defaultAssessmentService = new AssessmentService();
export default defaultAssessmentService;
