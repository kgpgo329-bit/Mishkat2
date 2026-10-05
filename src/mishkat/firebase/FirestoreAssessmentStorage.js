/**
 * Mishkat Phase 10 / Step 3: Cloud Firestore Assessment Storage Adapter
 *
 * Implements the AssessmentStorageBase contract using Cloud Firestore.
 *
 * LOGICAL FIRESTORE MODEL:
 * - sessions/{sessionId}/assessments/{assessmentId}
 * - sessions/{sessionId}/submissions/{submissionId}
 * - assessmentsIndex/{assessmentId}
 * - submissionsIndex/{submissionId}
 *
 * SECURITY INVARIANTS:
 * - Stores private assessment instances (with correct answer keys) server-side only.
 * - Never accessed directly by browser clients (protected by firestore.rules).
 */

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { AssessmentStorageBase } from '../assessment/assessmentStorage.js';
import { getFirestoreDb } from './firebaseConfig.js';
import { getAdminFirestoreDb, createAdminFirestoreOps } from './firebaseAdmin.js';

export class FirestoreAssessmentStorage extends AssessmentStorageBase {
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
      this.__ops = { doc, getDoc, setDoc, deleteDoc };
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
   * Saves an assessment instance containing private evaluation keys.
   *
   * @param {Object} assessment
   * @returns {Promise<void>}
   */
  async saveAssessment(assessment) {
    if (!assessment || !assessment.assessmentId) {
      throw new Error('Invalid assessment: missing assessmentId');
    }
    const sessionId = assessment.sessionId || 'default_session';
    const db = this._getDb();
    const { doc, setDoc } = this._ops;

    const cleanData = JSON.parse(JSON.stringify(assessment));
    await setDoc(doc(db, 'sessions', sessionId, 'assessments', assessment.assessmentId), cleanData);
    await setDoc(doc(db, 'assessmentsIndex', assessment.assessmentId), {
      assessmentId: assessment.assessmentId,
      sessionId
    });
  }

  /**
   * Retrieves an assessment instance by ID.
   *
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getAssessment(id) {
    if (!id) return null;
    const db = this._getDb();
    const { doc, getDoc } = this._ops;

    const indexSnap = await getDoc(doc(db, 'assessmentsIndex', id));
    if (!indexSnap || !indexSnap.exists()) {
      return null;
    }
    const { sessionId } = indexSnap.data();

    const assessSnap = await getDoc(doc(db, 'sessions', sessionId, 'assessments', id));
    if (!assessSnap || !assessSnap.exists()) {
      return null;
    }
    return assessSnap.data();
  }

  /**
   * Saves a scored assessment submission result.
   *
   * @param {Object} submission
   * @returns {Promise<void>}
   */
  async saveSubmission(submission) {
    if (!submission || !submission.submissionId) {
      throw new Error('Invalid submission: missing submissionId');
    }
    const sessionId = submission.sessionId || 'default_session';
    const db = this._getDb();
    const { doc, setDoc } = this._ops;

    const cleanData = JSON.parse(JSON.stringify(submission));
    await setDoc(doc(db, 'sessions', sessionId, 'submissions', submission.submissionId), cleanData);
    await setDoc(doc(db, 'submissionsIndex', submission.submissionId), {
      submissionId: submission.submissionId,
      sessionId
    });
  }

  /**
   * Retrieves a scored submission result by ID.
   *
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getSubmission(id) {
    if (!id) return null;
    const db = this._getDb();
    const { doc, getDoc } = this._ops;

    const indexSnap = await getDoc(doc(db, 'submissionsIndex', id));
    if (!indexSnap || !indexSnap.exists()) {
      return null;
    }
    const { sessionId } = indexSnap.data();

    const subSnap = await getDoc(doc(db, 'sessions', sessionId, 'submissions', id));
    if (!subSnap || !subSnap.exists()) {
      return null;
    }
    return subSnap.data();
  }

  /**
   * Deletes an assessment and its index (useful for smoke test cleanup).
   * @param {string} id
   */
  async deleteAssessment(id) {
    if (!id) return;
    const db = this._getDb();
    const { doc, getDoc, deleteDoc } = this._ops;
    const indexSnap = await getDoc(doc(db, 'assessmentsIndex', id));
    if (!indexSnap || !indexSnap.exists()) return;

    const { sessionId } = indexSnap.data();
    await deleteDoc(doc(db, 'sessions', sessionId, 'assessments', id));
    await deleteDoc(doc(db, 'assessmentsIndex', id));
  }
}
