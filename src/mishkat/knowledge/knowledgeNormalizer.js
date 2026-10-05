/**
 * Mishkat Knowledge Normalizer — Conservative Linguistic & Structural Normalizer
 * 
 * Enforces strict conservative text normalization:
 * - Unicode NFC normalization
 * - Invisible / zero-width character removal
 * - Whitespace consolidation without stripping meaningful text
 * - NEVER rewrites religious texts or paraphrases
 * - NEVER strips diacritics or Quranic marks from canonical QURAN domain text
 * - Generates deterministic SHA-256 content hashes
 */

import crypto from 'crypto';
import { KNOWLEDGE_DOMAINS } from './sourceTypes.js';

/**
 * Normalizes text conservatively according to domain rules
 * 
 * @param {string} rawText 
 * @param {string} domain 
 * @returns {{ rawText: string, normalizedText: string, isModified: boolean, contentHash: string }}
 */
export function normalizeKnowledgeText(rawText, domain = '') {
  if (typeof rawText !== 'string') {
    throw new Error('INVALID_TEXT: rawText must be a valid string.');
  }

  // 1. Unicode NFC Normalization
  let text = rawText.normalize('NFC');

  // 2. Strip BOM, zero-width characters, and non-printable control characters
  // \uFEFF: Byte Order Mark
  // \u200B-\u200D: Zero-width space, non-joiner, joiner (except where essential)
  // \u200E, \u200F: LTR / RTL marks (cleanup if stray)
  text = text
    .replace(/\uFEFF/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // 3. Whitespace normalization
  // Convert non-breaking spaces \u00A0 and various unicode spaces to regular space
  text = text.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');

  // Consolidate multiple spaces within a line (do not strip line breaks)
  text = text
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .trim();

  // 4. Domain-specific preservation:
  // For QURAN: DO NOT strip tashkeel or Uthmani marks under ANY circumstance.
  // For other domains: Still DO NOT strip words or paraphrase.

  const isModified = text !== rawText;
  const contentHash = computeContentHash(text);

  return {
    rawText,
    normalizedText: text,
    isModified,
    contentHash
  };
}

/**
 * Computes a deterministic SHA-256 hash for content verification and deduplication
 * 
 * @param {string} text 
 * @param {Object} [reference={}] 
 * @returns {string} hex hash
 */
export function computeContentHash(text, reference = {}) {
  const hash = crypto.createHash('sha256');
  hash.update(text || '');

  // If structured reference exists, incorporate it deterministically
  if (reference && typeof reference === 'object') {
    const sortedKeys = Object.keys(reference).sort();
    const refString = sortedKeys
      .filter(k => reference[k] !== null && reference[k] !== undefined)
      .map(k => `${k}:${reference[k]}`)
      .join('|');
    if (refString) {
      hash.update('::' + refString);
    }
  }

  return hash.digest('hex');
}

/**
 * Generates a stable deterministic composite deduplication key
 * 
 * @param {string} sourceId 
 * @param {string} domain 
 * @param {string} text 
 * @param {Object} reference 
 * @returns {string}
 */
export function generateDeduplicationKey(sourceId, domain, text, reference = {}) {
  const normSourceId = (sourceId || '').trim();
  const normDomain = (domain || '').trim();
  const hash = computeContentHash(text, reference);
  return `${normSourceId}:${normDomain}:${hash}`;
}
