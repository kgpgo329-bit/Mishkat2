/**
 * Mishkat Retrieval Query Builder — Phase 4 Claims-First Representation
 * 
 * Builds rich, claim-aware retrieval queries from Phase 2 structured interpretation.
 * Invariants:
 * 1. Preserves original claim text intact.
 * 2. Incorporates question, task, topic, subtopics, user goal, and requested evidence.
 * 3. Infers preferred Islamic knowledge domains based on task and evidence type.
 * 4. Extracts search-normalized tokens without altering canonical text.
 */

import { TASK_DOMAIN_AFFINITY, EVIDENCE_DOMAIN_AFFINITY } from './retrievalTypes.js';

/**
 * Normalizes text specifically for search indexing/matching:
 * - Strips tashkeel and tatweel
 * - Standardizes alefs (أ إ آ -> ا)
 * - Standardizes hamzas (ؤ ئ -> ء)
 * - Standardizes taa marbuta and haa (ة -> ه)
 * - Standardizes yaa and alif maqsura (ى -> ي)
 * - Removes punctuation
 * 
 * (Keeps stored canonical source text untouched)
 */
export function normalizeSearchText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'ء')
    .replace(/ئ/g, 'ء')
    .replace(/ة/g, 'ه')
    .replace(/[؟?؟!.,:؛،"'{}\[\]()«»<>—\-\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenizes Arabic search text into distinct significant lexical terms
 */
export function extractSearchTokens(text) {
  const norm = normalizeSearchText(text);
  const rawTokens = norm.split(' ').filter(Boolean);

  // Normalized Arabic stop words that carry minimal discrimination when searching Islamic chunks
  const stopWords = new Set([
    'في', 'من', 'على', 'علي', 'عن', 'إلى', 'الى', 'الي', 'مع', 'هذا', 'هذه', 'تلك', 'ذلك',
    'التي', 'الذي', 'الذين', 'اللاتي', 'هو', 'هي', 'هم', 'هن', 'كان', 'كانت',
    'يكون', 'تكون', 'ما', 'ماذا', 'هل', 'كيف', 'لماذا', 'ليه', 'وش', 'ايش',
    'شنو', 'ان', 'أن', 'إن', 'او', 'أو', 'ثم', 'حتى', 'حتي', 'إذا', 'اذا', 'كل', 'غير',
    'بين', 'بعد', 'قبل', 'عند', 'فقط', 'قد', 'لقد', 'لا', 'لم', 'لن', 'ليس', 'ليست',
    'له', 'لها', 'لهم', 'به', 'بها', 'بهم'
  ]);

  return rawTokens.filter(t => t.length > 1 && !stopWords.has(t));
}

/**
 * Builds structured retrieval queries for all claims in an interpretation
 * 
 * @param {Object} interpretation Phase 2 Question Understanding output
 * @returns {Array<Object>} List of ClaimRetrievalQueries
 */
export function buildClaimRetrievalQueries(interpretation) {
  if (!interpretation || typeof interpretation !== 'object') {
    throw new Error('INVALID_INTERPRETATION: Expected valid Phase 2 interpretation object.');
  }

  const {
    originalQuestion = '',
    task = 'GENERAL',
    topic = '',
    subtopics = [],
    userGoal = '',
    claimsToResolve = [],
    requestedEvidence = []
  } = interpretation;

  // If no claims were generated, create a synthetic fallback claim from the question
  const claims = Array.isArray(claimsToResolve) && claimsToResolve.length > 0
    ? claimsToResolve
    : [
        {
          claimId: 'claim_default',
          statement: originalQuestion,
          importance: 'CORE',
          requiredEvidenceType: requestedEvidence[0] || 'TEXTUAL_EVIDENCE'
        }
      ];

  return claims.map((claim, idx) => {
    const claimId = claim.claimId || `claim_${idx + 1}`;
    const claimText = (claim.statement || originalQuestion).trim();
    const claimEvidenceType = claim.requiredEvidenceType || requestedEvidence[0] || '';

    // Infer preferred domains from Task and Evidence Type
    const taskDomains = TASK_DOMAIN_AFFINITY[task] || [];
    const evidenceDomains = EVIDENCE_DOMAIN_AFFINITY[claimEvidenceType] || [];
    const preferredDomains = Array.from(new Set([...evidenceDomains, ...taskDomains]));

    // Construct composite search string combining claim, topic, subtopics, and goal
    const compositeSearchText = [
      claimText,
      topic,
      ...(Array.isArray(subtopics) ? subtopics : []),
      userGoal
    ].filter(Boolean).join(' ');

    const searchTokens = extractSearchTokens(compositeSearchText);

    return {
      claimId,
      originalQuestion,
      task,
      topic,
      subtopics: Array.isArray(subtopics) ? [...subtopics] : [],
      userGoal,
      claimText,
      requestedEvidence: claimEvidenceType,
      preferredDomains,
      compositeSearchText,
      searchTokens
    };
  });
}
