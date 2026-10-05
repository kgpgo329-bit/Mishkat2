/**
 * Mishkat Phase 9: Knowledge Journey — Barrel Export
 */

export {
  RECORD_STATUS,
  RECORD_ORIGIN,
  JOURNEY_TARGET,
  ADD_RECORD_RESULT,
  isValidOrigin,
  isValidRecordStatus
} from './journeyTypes.js';

export { checkJourneyEligibility } from './journeyGate.js';
export { buildKnowledgeRecord } from './knowledgeRecordBuilder.js';
export { normalizeArabicText, computeLearningFingerprint, extractClaimStatements, isDuplicate } from './learningIdentity.js';
export { computeJourneyState } from './journeyProgress.js';
export { JourneyStorageBase, InMemoryJourneyStorage } from './journeyStorage.js';
export { JourneyService, addJourneyRecord } from './JourneyService.js';
export { default } from './JourneyService.js';
