/**
 * Mishkat Source & Knowledge Validator
 * 
 * Enforces strict integrity rules for sources, knowledge records, and chunks.
 * Rejects invalid records, unapproved sources, missing identifiers,
 * or orphan chunks with broken provenance.
 */

import {
  ALLOWED_DOMAINS,
  KNOWLEDGE_DOMAINS,
  ALLOWED_EVIDENCE_TYPES,
  ALLOWED_VERIFICATION_STATUSES
} from './sourceTypes.js';

/**
 * Validates a KnowledgeRecord against schema and domain rules
 * 
 * @param {Object} record 
 * @param {Object} [sourceRegistry] 
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateKnowledgeRecord(record, sourceRegistry = null) {
  const errors = [];

  if (!record || typeof record !== 'object') {
    return { isValid: false, errors: ['Record must be a valid non-null object.'] };
  }

  // 1. Structural Identifiers
  if (!record.recordId || typeof record.recordId !== 'string' || record.recordId.trim() === '') {
    errors.push('Missing or empty recordId.');
  }

  if (!record.sourceId || typeof record.sourceId !== 'string' || record.sourceId.trim() === '') {
    errors.push('Missing or empty sourceId.');
  } else if (sourceRegistry) {
    const src = sourceRegistry.getSource(record.sourceId);
    if (!src) {
      errors.push(`Source "${record.sourceId}" is not registered in the Source Registry.`);
    } else if (src.approved !== true) {
      errors.push(`Source "${record.sourceId}" is not approved.`);
    }
  }

  // 2. Domain
  if (!record.domain || !ALLOWED_DOMAINS.includes(record.domain)) {
    errors.push(`Invalid or missing domain: ${record.domain}. Must be one of: ${ALLOWED_DOMAINS.join(', ')}.`);
  }

  // 3. Text
  if (!record.text || typeof record.text !== 'string' || record.text.trim() === '') {
    errors.push('Record text must be a non-empty string.');
  }

  // 4. Evidence Type
  if (record.evidenceType && !ALLOWED_EVIDENCE_TYPES.includes(record.evidenceType)) {
    errors.push(`Invalid evidenceType: ${record.evidenceType}`);
  }

  // 5. Reference checks
  if (!record.reference || typeof record.reference !== 'object') {
    errors.push('Record reference must be an object.');
  } else {
    // Domain-specific validation: QURAN
    if (record.domain === KNOWLEDGE_DOMAINS.QURAN) {
      const { surahNumber, ayahNumber } = record.reference;
      if (typeof surahNumber !== 'number' || surahNumber < 1 || surahNumber > 114) {
        errors.push(`QURAN records must specify a valid surahNumber (1-114). Found: ${surahNumber}`);
      }
      if (typeof ayahNumber !== 'number' || ayahNumber < 1) {
        errors.push(`QURAN records must specify a valid positive ayahNumber. Found: ${ayahNumber}`);
      }
    }

    // Domain-specific validation: HADITH
    if (record.domain === KNOWLEDGE_DOMAINS.HADITH) {
      // Authenticity grading metadata must be explicit or null, NEVER guessed
      const verification = record.verification || {};
      if (verification.grading !== null && verification.grading !== undefined && typeof verification.grading !== 'string') {
        errors.push('HADITH grading must be a valid string or null.');
      }
    }
  }

  // 6. Attribution
  if (!record.attribution || typeof record.attribution !== 'object') {
    errors.push('Record attribution must be an object.');
  }

  // 7. Verification Status
  if (record.verification) {
    if (record.verification.status && !ALLOWED_VERIFICATION_STATUSES.includes(record.verification.status)) {
      errors.push(`Invalid verification status: ${record.verification.status}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a KnowledgeChunk against schema and provenance rules
 * 
 * @param {Object} chunk 
 * @param {Map<string, Object>} [recordsMap] Optional records map to check provenance
 * @param {Object} [sourceRegistry] Optional source registry
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateKnowledgeChunk(chunk, recordsMap = null, sourceRegistry = null) {
  const errors = [];

  if (!chunk || typeof chunk !== 'object') {
    return { isValid: false, errors: ['Chunk must be a valid non-null object.'] };
  }

  // 1. Chunk & Record Identifiers
  if (!chunk.chunkId || typeof chunk.chunkId !== 'string' || chunk.chunkId.trim() === '') {
    errors.push('Missing or empty chunkId.');
  }

  if (!chunk.recordId || typeof chunk.recordId !== 'string' || chunk.recordId.trim() === '') {
    errors.push('Missing or empty recordId.');
  }

  if (!chunk.sourceId || typeof chunk.sourceId !== 'string' || chunk.sourceId.trim() === '') {
    errors.push('Missing or empty sourceId.');
  }

  // 2. Provenance Traceability Check
  if (recordsMap && chunk.recordId) {
    const parentRecord = recordsMap.get(chunk.recordId);
    if (!parentRecord) {
      errors.push(`ORPHAN_CHUNK: Chunk "${chunk.chunkId}" references non-existent recordId "${chunk.recordId}".`);
    } else if (parentRecord.sourceId !== chunk.sourceId) {
      errors.push(`PROVENANCE_MISMATCH: Chunk sourceId "${chunk.sourceId}" does not match record sourceId "${parentRecord.sourceId}".`);
    }
  }

  if (sourceRegistry && chunk.sourceId) {
    const src = sourceRegistry.getSource(chunk.sourceId);
    if (!src) {
      errors.push(`ORPHAN_SOURCE: Chunk "${chunk.chunkId}" references non-registered sourceId "${chunk.sourceId}".`);
    } else if (src.approved !== true) {
      errors.push(`UNAPPROVED_SOURCE: Chunk references unapproved source "${chunk.sourceId}".`);
    }
  }

  // 3. Domain & Text
  if (!chunk.domain || !ALLOWED_DOMAINS.includes(chunk.domain)) {
    errors.push(`Invalid or missing domain: ${chunk.domain}`);
  }

  if (!chunk.text || typeof chunk.text !== 'string' || chunk.text.trim() === '') {
    errors.push('Chunk text must be a non-empty string.');
  }

  // 4. Content Hash
  if (!chunk.contentHash || typeof chunk.contentHash !== 'string' || chunk.contentHash.length !== 64) {
    errors.push('Chunk contentHash must be a valid 64-character hex string (SHA-256).');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
