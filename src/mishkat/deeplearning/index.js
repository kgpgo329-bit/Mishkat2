/**
 * Mishkat Phase 8: Deep Learning — Barrel Export
 */

export { DEEP_LEARNING_STATUS, FOLLOW_UP_ORIGIN, DEEP_LEARNING_CONFIG, isValidDeepLearningStatus } from './deepLearningTypes.js';
export { checkDeepLearningActivation } from './activationGate.js';
export { normalizeArabic, deduplicateFollowUps } from './followUpDeduplicator.js';
export { generateFollowUps } from './followUpGenerator.js';
export { DeepLearningService, generateDeepLearningFollowUps } from './DeepLearningService.js';
export { default } from './DeepLearningService.js';
