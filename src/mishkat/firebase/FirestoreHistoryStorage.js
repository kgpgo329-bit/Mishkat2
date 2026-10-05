/**
 * Mishkat: Cloud Firestore Question History Storage Adapter
 *
 * Implements the HistoryStorageBase contract using Cloud Firestore.
 *
 * LOGICAL FIRESTORE MODEL:
 * - sessions/{sessionId}/history/{interactionId}
 *
 * PRESERVED INVARIANTS:
 * - Completely separate from Journey records and Assessment state.
 * - Stores every question interaction for session restoration and audit.
 * - Exact same observable behavior as InMemoryHistoryStorage.
 * - Works strictly server-side behind the API boundary.
 */

import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  deleteDoc
} from 'firebase/firestore';
import { HistoryStorageBase } from '../history/historyStorage.js';
import { getFirestoreDb } from './firebaseConfig.js';
import { getAdminFirestoreDb, createAdminFirestoreOps } from './firebaseAdmin.js';

export class FirestoreHistoryStorage extends HistoryStorageBase {
  /**
   * @param {import('firebase/firestore').Firestore|import('firebase-admin/firestore').Firestore} [db]
   * @param {Object} [options]
   */
  constructor(db = null, options = {}) {
    super();
    this._db = db;
    this._options = options;
    this.__ops = options.firestoreOps || null;
  }

  get _ops() {
    if (this.__ops) return this.__ops;
    if (this._options.firestoreOps) {
      this.__ops = this._options.firestoreOps;
      return this.__ops;
    }
    const resolvedDb = this._getDb();
    try {
      this.__ops = createAdminFirestoreOps(resolvedDb);
    } catch {
      this.__ops = { doc, getDoc, setDoc, getDocs, collection, deleteDoc };
    }
    return this.__ops;
  }

  set _ops(val) {
    this.__ops = val;
  }

  _getDb() {
    if (!this._db) {
      try {
        this._db = getAdminFirestoreDb(this._options);
      } catch {
        this._db = getFirestoreDb(this._options);
      }
    }
    return this._db;
  }

  /**
   * Saves an interaction document to sessions/{sessionId}/history/{interactionId}
   * @param {Object} interaction
   * @returns {Promise<void>}
   */
  async saveInteraction(interaction) {
    if (!interaction || !interaction.interactionId) {
      throw new Error('INVALID_INTERACTION: Missing interactionId in FirestoreHistoryStorage.');
    }
    const sessionId = interaction.sessionId || 'default_session';
    const db = this._getDb();
    const { doc, setDoc } = this._ops;

    const ref = doc(db, 'sessions', sessionId, 'history', interaction.interactionId);
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

    await setDoc(ref, cleanRecord);
  }

  /**
   * Retrieves all interactions for a session from sessions/{sessionId}/history
   * @param {string} sessionId
   * @returns {Promise<Array<Object>>}
   */
  async getHistory(sessionId = 'default_session') {
    const db = this._getDb();
    const { collection, getDocs } = this._ops;

    const colRef = collection(db, 'sessions', sessionId, 'history');
    const snap = await getDocs(colRef);

    const interactions = [];
    if (snap && snap.forEach) {
      snap.forEach(docSnap => {
        const data = docSnap.data ? docSnap.data() : docSnap;
        if (data) {
          interactions.push(data);
        }
      });
    }

    return interactions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Deletes a specific interaction document.
   * @param {string} sessionId
   * @param {string} interactionId
   * @returns {Promise<void>}
   */
  async deleteInteraction(sessionId, interactionId) {
    const db = this._getDb();
    const { doc, deleteDoc } = this._ops;
    const ref = doc(db, 'sessions', sessionId, 'history', interactionId);
    await deleteDoc(ref);
  }

  /**
   * Clears all interactions in sessions/{sessionId}/history
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async clearSession(sessionId) {
    const db = this._getDb();
    const { collection, getDocs, deleteDoc } = this._ops;
    const colRef = collection(db, 'sessions', sessionId, 'history');
    const snap = await getDocs(colRef);
    if (snap && snap.forEach) {
      const deletePromises = [];
      snap.forEach(d => {
        deletePromises.push(deleteDoc(d.ref || d));
      });
      await Promise.all(deletePromises);
    }
  }
}
