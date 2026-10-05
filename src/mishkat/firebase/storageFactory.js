/**
 * Mishkat Storage Factory
 *
 * Allows dynamic, clean selection between:
 * - 'memory': deterministic in-memory stores for tests, local dev, and fallbacks
 * - 'firestore': persistent Cloud Firestore storage for server production runtime
 *
 * Controlled via options or process.env.MISHKAT_STORAGE ('memory' | 'firestore').
 */

import { InMemoryJourneyStorage } from '../journey/journeyStorage.js';
import { InMemoryAssessmentStorage } from '../assessment/assessmentStorage.js';
import { InMemoryReportStorage } from '../report/reportStorage.js';
import { InMemoryHistoryStorage } from '../history/historyStorage.js';
import { FirestoreJourneyStorage } from './FirestoreJourneyStorage.js';
import { FirestoreAssessmentStorage } from './FirestoreAssessmentStorage.js';
import { FirestoreReportStorage } from './FirestoreReportStorage.js';
import { FirestoreHistoryStorage } from './FirestoreHistoryStorage.js';

import { getAdminFirestoreDb, createAdminFirestoreOps } from './firebaseAdmin.js';

/**
 * Creates and returns the storage adapters bundle.
 *
 * @param {'memory'|'firestore'|null} [type]
 * @param {Object} [options]
 * @returns {{
 *   type: string,
 *   journeyStorage: import('../journey/journeyStorage.js').JourneyStorageBase,
 *   assessmentStorage: import('../assessment/assessmentStorage.js').AssessmentStorageBase,
 *   reportStorage: import('../report/reportStorage.js').ReportStorageBase
 * }}
 */
export function createStorage(type = null, options = {}) {
  const resolvedType = type || (process.env.MISHKAT_STORAGE === 'firestore' ? 'firestore' : 'memory');

  if (resolvedType === 'firestore') {
    let db = options.db;
    let opts = { ...options };

    if (!db && !opts.firestoreOps) {
      try {
        db = getAdminFirestoreDb(options);
        opts.db = db;
        opts.firestoreOps = createAdminFirestoreOps(db);
      } catch (err) {
        console.warn('[Mishkat StorageFactory] Admin Firestore init fallback:', err.message);
      }
    }

    return {
      type: 'firestore',
      journeyStorage: new FirestoreJourneyStorage(db, opts),
      assessmentStorage: new FirestoreAssessmentStorage(db, opts),
      reportStorage: new FirestoreReportStorage(db, opts),
      historyStorage: new FirestoreHistoryStorage(db, opts)
    };
  }

  return {
    type: 'memory',
    journeyStorage: new InMemoryJourneyStorage(),
    assessmentStorage: new InMemoryAssessmentStorage(),
    reportStorage: new InMemoryReportStorage(),
    historyStorage: new InMemoryHistoryStorage()
  };
}
