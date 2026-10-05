/**
 * Mishkat Phase 10: Verified Knowledge Assessment — Barrel Export
 */

export {
  ASSESSMENT_STATUS,
  QUESTION_TYPE,
  ASSESSMENT_CONFIG,
  isValidQuestionType
} from './assessmentTypes.js';

export { checkAssessmentEligibility } from './assessmentGate.js';
export {
  AssessmentStorageBase,
  InMemoryAssessmentStorage
} from './assessmentStorage.js';

export {
  shuffleArray,
  deduplicateOptions,
  toClientSafeAssessment,
  synthesizeAssessmentItems
} from './assessmentGenerator.js';

export { scoreAssessment } from './assessmentScorer.js';
export {
  AssessmentService,
  default as defaultAssessmentService
} from './AssessmentService.js';
