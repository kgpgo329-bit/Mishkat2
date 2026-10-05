/**
 * Mishkat Phase 9: Knowledge Journey Service
 *
 * Canonical orchestrator for the Knowledge Journey domain layer.
 *
 * Pipeline for addRecord():
 *  1. Eligibility Gate   (Phase 6 + Phase 7 preconditions)
 *  2. Lineage Validation (DEEP_LEARNING: parent must exist and be VERIFIED)
 *  3. Fingerprint        (deterministic learning identity)
 *  4. Duplicate Check    (against storage fingerprint index)
 *  5. Record Build       (knowledgeRecordBuilder)
 *  6. Save               (via storage abstraction)
 *  7. State Update       (journeyProgress)
 *
 * STRICT INVARIANTS:
 * - No Firebase dependency (injected via storage abstraction).
 * - No Assessment logic.
 * - No Journey Report logic.
 * - No fake/demo/seed records accepted.
 * - Unselected Deep Learning suggestions NEVER reach this service.
 * - Only VERIFIED records count toward unique progress.
 */

import crypto from 'crypto';
import { ADD_RECORD_RESULT, RECORD_ORIGIN, RECORD_STATUS } from './journeyTypes.js';
import { checkJourneyEligibility } from './journeyGate.js';
import { buildKnowledgeRecord } from './knowledgeRecordBuilder.js';
import { computeLearningFingerprint, extractClaimStatements } from './learningIdentity.js';
import { computeJourneyState } from './journeyProgress.js';
import { InMemoryJourneyStorage } from './journeyStorage.js';

export class JourneyService {
  /**
   * @param {Object} [storage]  Any object implementing the JourneyStorageBase contract.
   *                            Defaults to InMemoryJourneyStorage.
   */
  constructor(storage) {
    this._storage = storage || new InMemoryJourneyStorage();
  }

  /**
   * Attempts to add a new VERIFIED learning record to the journey.
   *
   * @param {Object} params
   * @param {string}       params.sessionId
   * @param {Object}       params.interpretation     Phase 2 output
   * @param {Object}       params.sufficiencyResult  Phase 6 output
   * @param {Object}       params.answerResult       Phase 7 output
   * @param {string}       [params.origin]           'USER_QUESTION' | 'DEEP_LEARNING'
   * @param {string|null}  [params.parentRecordId]   Parent record ID for DEEP_LEARNING
   * @param {Object}       [params.options]          { mockConcepts }
   *
   * @returns {Promise<{
   *   result: string,           ADD_RECORD_RESULT value
   *   record: Object|null,      KnowledgeRecord if CREATED
   *   duplicateOf: string|null, Existing record id if DUPLICATE
   *   journeyState: Object,     Current journey state
   *   reason: string
   * }>}
   */
  async addRecord({
    sessionId,
    interpretation,
    sufficiencyResult,
    answerResult,
    origin = RECORD_ORIGIN.USER_QUESTION,
    parentRecordId = null,
    options = {}
  }) {
    // ── 1. Eligibility Gate ───────────────────────────────────────────────
    const gate = checkJourneyEligibility({ sufficiencyResult, answerResult });
    if (!gate.eligible) {
      const state = await this._buildState(sessionId);
      return {
        result: ADD_RECORD_RESULT.GATED,
        record: null,
        duplicateOf: null,
        journeyState: state,
        reason: gate.reason
      };
    }

    // ── 2. Lineage Validation ─────────────────────────────────────────────
    if (origin === RECORD_ORIGIN.DEEP_LEARNING) {
      if (!parentRecordId) {
        const state = await this._buildState(sessionId);
        return {
          result: ADD_RECORD_RESULT.LINEAGE_INVALID,
          record: null,
          duplicateOf: null,
          journeyState: state,
          reason: 'LINEAGE_INVALID: DEEP_LEARNING record requires a parentRecordId.'
        };
      }
      const parentRecord = await this._storage.getRecord(parentRecordId);
      if (!parentRecord || parentRecord.status !== RECORD_STATUS.VERIFIED) {
        const state = await this._buildState(sessionId);
        return {
          result: ADD_RECORD_RESULT.LINEAGE_INVALID,
          record: null,
          duplicateOf: null,
          journeyState: state,
          reason: `LINEAGE_INVALID: parentRecordId '${parentRecordId}' not found or not VERIFIED.`
        };
      }
    }

    // ── 3. Compute Fingerprint ────────────────────────────────────────────
    const question = interpretation?.questionText || interpretation?.originalQuestion || '';
    const topic = interpretation?.topic || interpretation?.taskTopic || interpretation?.task || 'GENERAL';
    const concepts = options.mockConcepts || [];
    const claimStatements = extractClaimStatements(answerResult?.answerClaims || []);

    const fingerprint = computeLearningFingerprint({ question, topic, concepts, claimStatements });

    // ── 4. Duplicate Check ────────────────────────────────────────────────
    const existingFingerprints = await this._storage.getAllFingerprints();
    if (existingFingerprints.includes(fingerprint)) {
      // Find the existing record
      const allRecords = await (this._storage.getAllRecords?.() ?? Promise.resolve([]));
      const existing = allRecords.find(r => r.fingerprint === fingerprint);
      const state = await this._buildState(sessionId);
      return {
        result: ADD_RECORD_RESULT.DUPLICATE,
        record: null,
        duplicateOf: existing?.id || null,
        journeyState: state,
        reason: 'DUPLICATE: Equivalent learning already exists in journey.'
      };
    }

    // ── 5. Build Record ───────────────────────────────────────────────────
    const record = buildKnowledgeRecord({
      sessionId,
      interpretation,
      answerResult,
      origin,
      parentRecordId,
      options
    });

    // Attach fingerprint for storage indexing
    record.fingerprint = fingerprint;

    // ── 6. Save ───────────────────────────────────────────────────────────
    await this._storage.saveRecord(record);

    // ── 7. Compute Updated State ──────────────────────────────────────────
    const state = await this._buildState(sessionId);

    return {
      result: ADD_RECORD_RESULT.CREATED,
      record,
      duplicateOf: null,
      journeyState: state,
      reason: 'CREATED: Verified learning record added to journey.'
    };
  }

  /**
   * Returns the current journey state.
   * @param {string} [sessionId]
   * @returns {Promise<Object>} JourneyState
   */
  async getJourneyState(sessionId) {
    return this._buildState(sessionId);
  }

  /**
   * Retrieves a specific record by ID.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getRecord(id) {
    return this._storage.getRecord(id);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  async _buildState(sessionId) {
    const uniqueVerifiedCount = await this._storage.countUniqueVerified();
    const verifiedRecords = sessionId
      ? await this._storage.getRecordsBySession(sessionId)
      : (await (this._storage.getAllRecords?.() ?? Promise.resolve([])));
    return computeJourneyState({ sessionId, verifiedRecords, uniqueVerifiedCount });
  }
}

// Singleton default instance (InMemoryStorage — replaced later by Firebase)
const journeyService = new JourneyService();
export default journeyService;

/**
 * Functional entry point (mirrors Phase 6/7/8 pattern).
 */
export async function addJourneyRecord(params) {
  return journeyService.addRecord(params);
}
