/**
 * Mishkat Phase 11 / Step 3: Cloud Firestore Report Storage Adapter
 *
 * Implements the ReportStorageBase contract using Cloud Firestore.
 *
 * LOGICAL FIRESTORE MODEL:
 * - sessions/{sessionId}/reports/{reportId}
 * - reportsIndex/{reportId}
 *
 * PRESERVED INVARIANTS:
 * - Stores immutable Journey Reports linked to valid completed assessments.
 * - Exact same observable behavior as InMemoryReportStorage.
 */

import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  deleteDoc
} from 'firebase/firestore';
import { ReportStorageBase } from '../report/reportStorage.js';
import { getFirestoreDb } from './firebaseConfig.js';
import { getAdminFirestoreDb, createAdminFirestoreOps } from './firebaseAdmin.js';

export class FirestoreReportStorage extends ReportStorageBase {
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
   * Saves an immutable Journey Report to Firestore.
   *
   * @param {Object} report
   * @returns {Promise<void>}
   */
  async saveReport(report) {
    if (!report || !report.reportId) {
      throw new Error('Invalid report: missing reportId');
    }
    const sessionId = report.sessionId || 'default_session';
    const db = this._getDb();
    const { doc, setDoc } = this._ops;

    const cleanData = JSON.parse(JSON.stringify(report));
    await setDoc(doc(db, 'sessions', sessionId, 'reports', report.reportId), cleanData);
    await setDoc(doc(db, 'reportsIndex', report.reportId), {
      reportId: report.reportId,
      sessionId
    });
  }

  /**
   * Retrieves a Journey Report by ID.
   *
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getReport(id) {
    if (!id) return null;
    const db = this._getDb();
    const { doc, getDoc } = this._ops;

    const indexSnap = await getDoc(doc(db, 'reportsIndex', id));
    if (!indexSnap || !indexSnap.exists()) {
      return null;
    }
    const { sessionId } = indexSnap.data();

    const reportSnap = await getDoc(doc(db, 'sessions', sessionId, 'reports', id));
    if (!reportSnap || !reportSnap.exists()) {
      return null;
    }
    return reportSnap.data();
  }

  /**
   * Retrieves all Journey Reports for a given session ID.
   *
   * @param {string} sessionId
   * @returns {Promise<Object[]>}
   */
  async getReportsBySession(sessionId) {
    if (!sessionId) return [];
    const db = this._getDb();
    const { collection, getDocs } = this._ops;

    const colRef = collection(db, 'sessions', sessionId, 'reports');
    const snapshot = await getDocs(colRef);
    const reports = [];
    if (snapshot) {
      snapshot.forEach(d => reports.push(d.data()));
    }
    return reports;
  }

  /**
   * Deletes a report and its index (useful for smoke test cleanup).
   * @param {string} id
   */
  async deleteReport(id) {
    if (!id) return;
    const db = this._getDb();
    const { doc, getDoc, deleteDoc } = this._ops;
    const indexSnap = await getDoc(doc(db, 'reportsIndex', id));
    if (!indexSnap || !indexSnap.exists()) return;

    const { sessionId } = indexSnap.data();
    await deleteDoc(doc(db, 'sessions', sessionId, 'reports', id));
    await deleteDoc(doc(db, 'reportsIndex', id));
  }
}
