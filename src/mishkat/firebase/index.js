/**
 * Mishkat Firebase Module — Barrel Export
 */

export {
  getFirebaseConfig,
  isFirebaseConfigured,
  getFirebaseApp,
  getFirestoreDb
} from './firebaseConfig.js';

export { FirestoreJourneyStorage } from './FirestoreJourneyStorage.js';
export { FirestoreAssessmentStorage } from './FirestoreAssessmentStorage.js';
export { FirestoreReportStorage } from './FirestoreReportStorage.js';
export { FirestoreHistoryStorage } from './FirestoreHistoryStorage.js';
export { createStorage } from './storageFactory.js';
export {
  getAdminApp,
  getAdminFirestoreDb,
  isAdminCredentialConfigured,
  createAdminFirestoreOps
} from './firebaseAdmin.js';

