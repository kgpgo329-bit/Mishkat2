/**
 * Mishkat Phase 9 / Step 3: Cloud Firestore Journey Storage Adapter
 *
 * Implements the JourneyStorageBase contract using Cloud Firestore.
 *
 * LOGICAL FIRESTORE MODEL:
 * - sessions/{sessionId}
 * - sessions/{sessionId}/journeyRecords/{recordId}
 * - recordsIndex/{recordId}                   (O(1) cross-session lookup by recordId)
 * - fingerprints/{fingerprint}                 (O(1) deduplication index across restarts)
 *
 * PRESERVED INVARIANTS:
 * - Exact same observable behavior as InMemoryJourneyStorage.
 * - Zero domain logic changes or leaks.
 * - Works behind server/API boundary only.
 */

import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  deleteDoc
} from 'firebase/firestore';
import { JourneyStorageBase } from '../journey/journeyStorage.js';
import { getFirestoreDb } from './firebaseConfig.js';

export class FirestoreJourneyStorage extends JourneyStorageBase {
  /**
   * @param {import('firebase/firestore').Firestore} [db] Optional Firestore instance
   * @param {Object} [options]
   */
  constructor(db = null, options = {}) {
    super();
    this._db = db;
    this._options = options;
    this._ops = options.firestoreOps || {
      doc,
      getDoc,
      setDoc,
      getDocs,
      collection,
      deleteDoc
    };
  }

  /**
   * Returns the resolved Firestore instance (lazily initialized if not injected).
   * @private
   */
  _getDb() {
    if (!this._db) {
      this._db = getFirestoreDb(this._options);
    }
    return this._db;
  }

  /**
   * Saves a VERIFIED KnowledgeRecord to Firestore and updates the deduplication index.
   *
   * @param {Object} record Must contain { id, sessionId, fingerprint, ... }
   * @returns {Promise<void>}
   */
  async saveRecord(record) {
    if (!record || !record.id) {
      throw new Error('INVALID_RECORD: Missing record.id in FirestoreJourneyStorage.');
    }
    const sessionId = record.sessionId || 'default_session';
    const db = this._getDb();
    const { doc, setDoc } = this._ops;

    // 1. Write the main record document inside sessions/{sessionId}/journeyRecords/{recordId}
    const recordRef = doc(db, 'sessions', sessionId, 'journeyRecords', record.id);
    const cleanRecord = JSON.parse(JSON.stringify(record));
    await setDoc(recordRef, cleanRecord);

    // 2. Index recordId -> sessionId for fast O(1) getRecord(id)
    const indexRef = doc(db, 'recordsIndex', record.id);
    await setDoc(indexRef, { id: record.id, sessionId });

    // 3. Index fingerprint for O(1) deduplication check across server restarts
    if (record.fingerprint) {
      const fpRef = doc(db, 'fingerprints', record.fingerprint);
      await setDoc(fpRef, {
        fingerprint: record.fingerprint,
        recordId: record.id,
        sessionId,
        status: record.status || 'VERIFIED',
        createdAt: record.timestamp || new Date().toISOString()
      });
    }

    // 4. Update session metadata doc
    const sessionRef = doc(db, 'sessions', sessionId);
    await setDoc(sessionRef, {
      sessionId,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  }

  /**
   * Retrieves a record by ID across all sessions.
   *
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getRecord(id) {
    if (!id) return null;
    const db = this._getDb();
    const { doc, getDoc } = this._ops;

    // Look up sessionId from index
    const indexSnap = await getDoc(doc(db, 'recordsIndex', id));
    if (!indexSnap || !indexSnap.exists()) {
      return null;
    }
    const { sessionId } = indexSnap.data();

    const recordSnap = await getDoc(doc(db, 'sessions', sessionId, 'journeyRecords', id));
    if (!recordSnap || !recordSnap.exists()) {
      return null;
    }
    return recordSnap.data();
  }

  /**
   * Retrieves all records associated with a specific sessionId.
   *
   * @param {string} sessionId
   * @returns {Promise<Object[]>}
   */
  async getRecordsBySession(sessionId) {
    if (!sessionId) return [];
    const db = this._getDb();
    const { collection, getDocs } = this._ops;

    const colRef = collection(db, 'sessions', sessionId, 'journeyRecords');
    const snapshot = await getDocs(colRef);
    const records = [];
    if (snapshot) {
      snapshot.forEach(d => records.push(d.data()));
    }
    return records;
  }

  /**
   * Returns all recorded learning fingerprints.
   * @returns {Promise<string[]>}
   */
  async getAllFingerprints() {
    const db = this._getDb();
    const { collection, getDocs } = this._ops;
    const fpCol = collection(db, 'fingerprints');
    const snapshot = await getDocs(fpCol);
    const fingerprints = [];
    if (snapshot) {
      snapshot.forEach(d => fingerprints.push(d.id));
    }
    return fingerprints;
  }

  /**
   * Checks whether a fingerprint already exists in the deduplication index.
   * @param {string} fingerprint
   * @returns {Promise<boolean>}
   */
  async hasFingerprint(fingerprint) {
    if (!fingerprint) return false;
    const db = this._getDb();
    const { doc, getDoc } = this._ops;
    const snap = await getDoc(doc(db, 'fingerprints', fingerprint));
    return snap && snap.exists();
  }

  /**
   * Returns the count of unique verified learning records in storage.
   * @returns {Promise<number>}
   */
  async countUniqueVerified() {
    const fingerprints = await this.getAllFingerprints();
    return fingerprints.length;
  }

  /**
   * Retrieves all records across all sessions.
   * @returns {Promise<Object[]>}
   */
  async getAllRecords() {
    const db = this._getDb();
    const { collection, getDocs } = this._ops;
    const indexCol = collection(db, 'recordsIndex');
    const indexSnap = await getDocs(indexCol);
    const records = [];

    if (indexSnap && indexSnap.docs) {
      for (const d of indexSnap.docs) {
        const rec = await this.getRecord(d.id);
        if (rec) records.push(rec);
      }
    }
    return records;
  }

  /**
   * Deletes a record by ID (useful for smoke test cleanup).
   * @param {string} id
   * @returns {Promise<void>}
   */
  async deleteRecord(id) {
    if (!id) return;
    const db = this._getDb();
    const { doc, getDoc, deleteDoc } = this._ops;
    const indexSnap = await getDoc(doc(db, 'recordsIndex', id));
    if (!indexSnap || !indexSnap.exists()) return;

    const { sessionId } = indexSnap.data();
    const recSnap = await getDoc(doc(db, 'sessions', sessionId, 'journeyRecords', id));
    if (recSnap && recSnap.exists()) {
      const rec = recSnap.data();
      if (rec.fingerprint) {
        await deleteDoc(doc(db, 'fingerprints', rec.fingerprint));
      }
      await deleteDoc(doc(db, 'sessions', sessionId, 'journeyRecords', id));
    }
    await deleteDoc(doc(db, 'recordsIndex', id));
  }
}
