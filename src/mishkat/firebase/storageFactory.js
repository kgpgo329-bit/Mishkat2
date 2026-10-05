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
import { FirestoreJourneyStorage } from './FirestoreJourneyStorage.js';
import { FirestoreAssessmentStorage } from './FirestoreAssessmentStorage.js';
import { FirestoreReportStorage } from './FirestoreReportStorage.js';

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
    return {
      type: 'firestore',
      journeyStorage: new FirestoreJourneyStorage(options.db, options),
      assessmentStorage: new FirestoreAssessmentStorage(options.db, options),
      reportStorage: new FirestoreReportStorage(options.db, options)
    };
  }

  return {
    type: 'memory',
    journeyStorage: new InMemoryJourneyStorage(),
    assessmentStorage: new InMemoryAssessmentStorage(),
    reportStorage: new InMemoryReportStorage()
  };
}
