/**
 * Mishkat Phase 9: Unique-Learning Identity / Deduplication
 *
 * Determines whether a new VERIFIED interaction represents the same learning
 * point as an existing KnowledgeRecord, using only deterministic fingerprinting.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * FINGERPRINT COMPONENTS (all deterministic, no arbitrary thresholds)
 * ──────────────────────────────────────────────────────────────────────────
 *
 * A learning identity fingerprint is built from:
 *  1. Normalized question text (Arabic normalization applied)
 *  2. Normalized topic string
 *  3. Sorted normalized concept set
 *  4. Sorted normalized grounded claim statement set
 *
 * Normalization pipeline (same as Phase 8 deduplicator):
 *  - Remove tashkeel / diacritics
 *  - Unify hamza (إأآ → ا)
 *  - Unify taa marbuta (ة → ه)
 *  - Unify alef maqsura (ى → ي)
 *  - Collapse whitespace, trim, lowercase
 *
 * A duplicate is detected when:
 *   the new record's fingerprint matches an existing record's fingerprint exactly.
 *
 * This rejects paraphrases that produce identical normalized concept + claim
 * combinations, without introducing arbitrary similarity thresholds.
 */

import crypto from 'crypto';

/**
 * Normalizes an Arabic string for identity comparison.
 * @param {string} text
 * @returns {string}
 */
export function normalizeArabicText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')  // remove tashkeel
    .replace(/[إأآ]/g, 'ا')                         // unify hamza
    .replace(/ة/g, 'ه')                              // unify taa marbuta
    .replace(/ى/g, 'ي')                              // unify alef maqsura
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Computes a deterministic SHA-256 fingerprint for a learning identity.
 *
 * @param {Object} params
 * @param {string}   params.question   Raw question text
 * @param {string}   params.topic      Topic label
 * @param {string[]} params.concepts   Concept array
 * @param {string[]} params.claimStatements  Grounded claim statements
 * @returns {string}  Hex fingerprint
 */
export function computeLearningFingerprint({ question, topic, concepts, claimStatements }) {
  const nq = normalizeArabicText(question);
  const nt = normalizeArabicText(topic);
  const nc = (concepts || []).map(normalizeArabicText).sort().join('|');
  const ns = (claimStatements || []).map(normalizeArabicText).sort().join('|');

  const raw = [nq, nt, nc, ns].join('::');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Extracts grounded claim statements from a KnowledgeRecord or an answerResult.
 * Used for fingerprint computation.
 *
 * @param {Array} answerClaims  Phase 7 answerClaims array
 * @returns {string[]}
 */
export function extractClaimStatements(answerClaims) {
  return (answerClaims || [])
    .filter(c => c.groundingStatus === 'GROUNDED' || c.groundingStatus === 'PARTIALLY_GROUNDED')
    .map(c => c.statement || '')
    .filter(Boolean);
}

/**
 * Checks whether a proposed new record is a duplicate of any existing record
 * in the journey.
 *
 * @param {string}   newFingerprint   Fingerprint of the candidate record
 * @param {string[]} existingFingerprints  Fingerprints of all existing records
 * @returns {boolean}
 */
export function isDuplicate(newFingerprint, existingFingerprints) {
  return existingFingerprints.includes(newFingerprint);
}
