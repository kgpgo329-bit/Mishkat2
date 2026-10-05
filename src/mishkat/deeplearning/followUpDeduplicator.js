/**
 * Mishkat Phase 8: Follow-Up Deduplicator
 *
 * Arabic text normalization and duplicate rejection logic.
 *
 * Normalization rules applied (in order):
 *  1. Remove tashkeel (diacritics U+064B–U+0652, U+0670, U+0640)
 *  2. Unify hamza variants (إأآ → ا)
 *  3. Unify taa marbuta (ة → ه)
 *  4. Unify alef maqsura (ى → ي)
 *  5. Collapse multiple whitespace to single space and trim
 *
 * Rejection criteria:
 *  - Exact string duplicate of an existing accepted suggestion
 *  - Normalized duplicate of an existing accepted suggestion
 *  - Normalized text matches the normalized original question
 */

/**
 * Normalizes an Arabic string for deduplication comparison.
 * @param {string} text
 * @returns {string}
 */
export function normalizeArabic(text) {
  if (typeof text !== 'string') return '';
  return text
    // Remove tashkeel / diacritics
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    // Unify hamza variants → bare alef
    .replace(/[إأآ]/g, 'ا')
    // Unify taa marbuta → haa
    .replace(/ة/g, 'ه')
    // Unify alef maqsura → yaa
    .replace(/ى/g, 'ي')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Deduplicates a list of follow-up question objects against each other and
 * against the original question.
 *
 * @param {string} originalQuestion  The user's original question text
 * @param {Array<{followUpId: string, question: string, [key: string]: *}>} suggestions
 * @returns {{ accepted: Array, rejected: Array<{suggestion, reason}> }}
 */
export function deduplicateFollowUps(originalQuestion, suggestions) {
  const normalizedOriginal = normalizeArabic(originalQuestion || '');

  const accepted = [];
  const rejected = [];

  // Track already-seen texts for O(n²) duplicate detection across the batch
  const seenExact = new Set();
  const seenNormalized = new Set();

  for (const suggestion of suggestions) {
    const questionText = suggestion.question || '';
    const exact = questionText.trim();
    const normalized = normalizeArabic(questionText);

    // 1. Reject if it restates the original question
    if (normalized && normalized === normalizedOriginal) {
      rejected.push({ suggestion, reason: 'DUPLICATE_ORIGINAL_QUESTION' });
      continue;
    }

    // 2. Reject exact duplicate within batch
    if (seenExact.has(exact)) {
      rejected.push({ suggestion, reason: 'EXACT_DUPLICATE' });
      continue;
    }

    // 3. Reject normalized duplicate within batch
    if (normalized && seenNormalized.has(normalized)) {
      rejected.push({ suggestion, reason: 'NORMALIZED_DUPLICATE' });
      continue;
    }

    // Accept
    seenExact.add(exact);
    if (normalized) seenNormalized.add(normalized);
    accepted.push(suggestion);
  }

  return { accepted, rejected };
}
