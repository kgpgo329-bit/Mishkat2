/**
 * Mishkat Question History Storage Interface & In-Memory Implementation
 *
 * Stores all completed user-pipeline question interactions for user visibility
 * completely SEPARATE from Knowledge Journey progress.
 *
 * INVARIANTS:
 * - Question History does NOT equal Knowledge Journey.
 * - Storing an interaction NEVER creates a KnowledgeRecord.
 * - Storing an interaction NEVER increments uniqueVerifiedCount.
 * - Storing an interaction NEVER unlocks Assessment or Report.
 * - Minimal safe fields only: interactionId, sessionId, originalQuestion, timestamp, status, recordId, origin, parentRecordId.
 * - Zero secrets, internal prompts, or reasoning stored.
 */

export class HistoryStorageBase {
  /**
   * Saves an interaction record.
   * @param {Object} interaction
   * @returns {Promise<void>}
   */
  async saveInteraction(interaction) {
    throw new Error('Not implemented: HistoryStorageBase.saveInteraction');
  }

  /**
   * Retrieves all recorded interactions for a session, ordered by timestamp ascending.
   * @param {string} sessionId
   * @returns {Promise<Array<Object>>}
   */
  async getHistory(sessionId) {
    throw new Error('Not implemented: HistoryStorageBase.getHistory');
  }

  /**
   * Deletes a specific interaction (used for tests or cleanup).
   * @param {string} sessionId
   * @param {string} interactionId
   * @returns {Promise<void>}
   */
  async deleteInteraction(sessionId, interactionId) {
    throw new Error('Not implemented: HistoryStorageBase.deleteInteraction');
  }

  /**
   * Clears all interactions for a session.
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async clearSession(sessionId) {
    throw new Error('Not implemented: HistoryStorageBase.clearSession');
  }
}

/**
 * Deterministic In-Memory implementation of Question History.
 */
export class InMemoryHistoryStorage extends HistoryStorageBase {
  constructor() {
    super();
    /** @type {Map<string, Array<Object>>} sessionId -> interactions */
    this._history = new Map();
  }

  async saveInteraction(interaction) {
    if (!interaction || !interaction.interactionId) {
      throw new Error('INVALID_INTERACTION: interactionId is required.');
    }
    const sessionId = interaction.sessionId || 'default_session';
    const list = this._history.get(sessionId) || [];

    // Filter out internal secrets/keys if accidentally passed
    const cleanRecord = {
      interactionId: interaction.interactionId,
      sessionId,
      originalQuestion: interaction.originalQuestion || '',
      timestamp: interaction.timestamp || new Date().toISOString(),
      status: interaction.status || 'ANSWERED',
      recordId: interaction.recordId || null,
      origin: interaction.origin || 'USER_QUESTION',
      parentRecordId: interaction.parentRecordId || null
    };

    // Remove existing with same interactionId if replacing, else append
    const existingIdx = list.findIndex(item => item.interactionId === cleanRecord.interactionId);
    if (existingIdx >= 0) {
      list[existingIdx] = cleanRecord;
    } else {
      list.push(cleanRecord);
    }

    this._history.set(sessionId, list);
  }

  async getHistory(sessionId = 'default_session') {
    const list = this._history.get(sessionId) || [];
    // Return clone sorted by timestamp ascending
    return [...list]
      .map(item => ({ ...item }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async deleteInteraction(sessionId, interactionId) {
    const list = this._history.get(sessionId) || [];
    this._history.set(sessionId, list.filter(item => item.interactionId !== interactionId));
  }

  async clearSession(sessionId) {
    this._history.delete(sessionId);
  }
}
