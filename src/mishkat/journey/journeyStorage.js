/**
 * Mishkat Phase 9: Journey Storage Abstraction
 *
 * Defines the storage interface (contract) that all Journey storage backends
 * must implement. The Journey Service depends ONLY on this interface.
 *
 * Current implementation: InMemoryJourneyStorage (fully deterministic, no I/O).
 * Future: FirebaseJourneyStorage — implements the same interface without
 *         requiring changes to Journey business logic.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * CONTRACT METHODS
 * ──────────────────────────────────────────────────────────────────────────
 *
 *  saveRecord(record)         → Promise<void>
 *  getRecord(id)              → Promise<KnowledgeRecord | null>
 *  getRecordsBySession(sid)   → Promise<KnowledgeRecord[]>
 *  getAllFingerprints()        → Promise<string[]>
 *  countUniqueVerified()      → Promise<number>
 *
 * IMPORTANT: No Firebase is imported or used in this file.
 */

/**
 * Abstract base class (duck-typed interface).
 * Extend this to create concrete storage backends.
 */
export class JourneyStorageBase {
  /** @param {Object} record */
  async saveRecord(record) {                       // eslint-disable-line no-unused-vars
    throw new Error('Not implemented: saveRecord');
  }
  /** @param {string} id */
  async getRecord(id) {                            // eslint-disable-line no-unused-vars
    throw new Error('Not implemented: getRecord');
  }
  /** @param {string} sessionId */
  async getRecordsBySession(sessionId) {           // eslint-disable-line no-unused-vars
    throw new Error('Not implemented: getRecordsBySession');
  }
  /** @returns {Promise<string[]>} */
  async getAllFingerprints() {
    throw new Error('Not implemented: getAllFingerprints');
  }
  /** @returns {Promise<number>} */
  async countUniqueVerified() {
    throw new Error('Not implemented: countUniqueVerified');
  }
}

/**
 * In-memory storage implementation.
 * Used for all deterministic tests and local development.
 * No network, no filesystem, no Firebase.
 */
export class InMemoryJourneyStorage extends JourneyStorageBase {
  constructor() {
    super();
    /** @type {Map<string, Object>} recordId → record */
    this._records = new Map();
    /** @type {Map<string, string>} fingerprint → recordId (unique learning index) */
    this._fingerprintIndex = new Map();
  }

  /**
   * Saves a record and indexes its fingerprint.
   * @param {Object} record  Must have { id, fingerprint, ... }
   */
  async saveRecord(record) {
    this._records.set(record.id, record);
    if (record.fingerprint) {
      this._fingerprintIndex.set(record.fingerprint, record.id);
    }
  }

  /** @param {string} id */
  async getRecord(id) {
    return this._records.get(id) ?? null;
  }

  /** @param {string} sessionId */
  async getRecordsBySession(sessionId) {
    return [...this._records.values()].filter(r => r.sessionId === sessionId);
  }

  /** @returns {Promise<string[]>} */
  async getAllFingerprints() {
    return [...this._fingerprintIndex.keys()];
  }

  /**
   * Count of unique verified records (= number of indexed fingerprints).
   * @returns {Promise<number>}
   */
  async countUniqueVerified() {
    return this._fingerprintIndex.size;
  }

  /**
   * Checks whether a fingerprint already exists (duplicate detection).
   * @param {string} fingerprint
   * @returns {Promise<boolean>}
   */
  async hasFingerprint(fingerprint) {
    return this._fingerprintIndex.has(fingerprint);
  }

  /**
   * Returns all stored records (for testing / inspection).
   * @returns {Promise<Object[]>}
   */
  async getAllRecords() {
    return [...this._records.values()];
  }

  /**
   * Resets storage to empty state (for test isolation).
   */
  reset() {
    this._records.clear();
    this._fingerprintIndex.clear();
  }
}
