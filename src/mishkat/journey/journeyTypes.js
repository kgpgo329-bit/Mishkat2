/**
 * Mishkat Phase 9: Knowledge Journey — Types & Constants
 *
 * Defines canonical enumerations, default values, and milestone configuration
 * for the Knowledge Journey domain layer.
 *
 * IMPORTANT:
 * - This file contains NO Firebase dependencies.
 * - No Assessment logic lives here.
 * - No Journey Report logic lives here.
 */

/**
 * Status values for a KnowledgeRecord.
 * Only VERIFIED records count toward journey progress.
 */
export const RECORD_STATUS = Object.freeze({
  VERIFIED: 'VERIFIED'
});

/**
 * Origin values for a KnowledgeRecord.
 * USER_QUESTION: a direct user submission.
 * DEEP_LEARNING: a Phase 8 suggestion that was selected, submitted through
 *   the full Mishkat pipeline, and successfully verified.
 */
export const RECORD_ORIGIN = Object.freeze({
  USER_QUESTION: 'USER_QUESTION',
  DEEP_LEARNING: 'DEEP_LEARNING'
});

/**
 * Number of unique VERIFIED learning records required to reach the milestone
 * and unlock assessment eligibility.
 */
export const JOURNEY_TARGET = 20;

/**
 * Add-record outcome codes returned by JourneyService.addRecord()
 */
export const ADD_RECORD_RESULT = Object.freeze({
  CREATED:         'CREATED',           // New unique verified record added
  DUPLICATE:       'DUPLICATE',         // Equivalent learning already present
  GATED:           'GATED',             // Upstream conditions not met — not recorded
  LINEAGE_INVALID: 'LINEAGE_INVALID'    // DEEP_LEARNING parent missing or not verified
});

/**
 * Validates a record origin value.
 * @param {string} origin
 * @returns {boolean}
 */
export function isValidOrigin(origin) {
  return Object.values(RECORD_ORIGIN).includes(origin);
}

/**
 * Validates a record status value.
 * @param {string} status
 * @returns {boolean}
 */
export function isValidRecordStatus(status) {
  return Object.values(RECORD_STATUS).includes(status);
}
