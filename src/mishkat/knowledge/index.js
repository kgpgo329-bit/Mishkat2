/**
 * Mishkat Knowledge Layer — Unified Module Exports
 */

export * from './sourceTypes.js';
export * from './sourceRegistry.js';
export * from './sourceValidator.js';
export * from './knowledgeNormalizer.js';
export * from './knowledgeChunker.js';
export * from './knowledgeDeduplicator.js';
export * from './sourceAdapters/index.js';
export * from './TrustedSourceRepository.js';

export { defaultTrustedSourceRepository as repository } from './TrustedSourceRepository.js';
