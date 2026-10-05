/**
 * Mishkat Phase 8: Follow-Up Generator
 *
 * Generates deterministic Arabic follow-up questions derived ONLY from the
 * verified context of the current answer.
 *
 * STRICT SAFETY RULES (verbatim from spec):
 * - A follow-up question MUST NOT contain a prefilled answer.
 * - A follow-up question MUST NOT contain a hidden answer or assumed verdict.
 * - A follow-up question MUST NOT contain fabricated evidence or sources.
 * - A follow-up question MUST NOT contain a hardcoded religious conclusion.
 *
 * AI boundary:
 *   1. options.mockSuggestions   — inject a full mock suggestions array (tests)
 *   2. options.generatorOverride — inject a custom async generator function (tests / DI)
 *   3. Default                   — deterministic synthesis from answer context
 *
 * No external API is called from this module.
 */

import crypto from 'crypto';
import { FOLLOW_UP_ORIGIN, DEEP_LEARNING_CONFIG } from './deepLearningTypes.js';

/** @returns {string} A short random follow-up ID */
function makeFollowUpId() {
  return 'fl_' + crypto.randomBytes(5).toString('hex');
}

/**
 * Extracts topic keywords from verified answer claims and evidence metadata.
 * Returns a best-effort list of topic strings (Arabic or transliterated).
 *
 * @param {Array} answerClaims
 * @param {Array} usedSources
 * @returns {string[]}
 */
function extractTopics(answerClaims, usedSources) {
  const topics = new Set();
  for (const claim of answerClaims || []) {
    if (claim.statement && typeof claim.statement === 'string') {
      // Pick first meaningful Arabic word (≥ 3 chars)
      const words = claim.statement.split(/\s+/).filter(w => w.length >= 3);
      if (words[0]) topics.add(words[0]);
    }
  }
  for (const src of usedSources || []) {
    if (src.sourceName && typeof src.sourceName === 'string') {
      topics.add(src.sourceName);
    }
  }
  return [...topics].slice(0, 3);
}

/**
 * Deterministic follow-up synthesis.
 * Derives open-ended questions from the verified answer context.
 * Does NOT encode a verdict, answer, or conclusion.
 *
 * @param {Object} ctx  Generation context
 * @returns {Array}     Raw suggestion objects (before deduplication)
 */
function synthesizeSuggestions(ctx) {
  const {
    originalQuestion,
    task,
    originalClaims,
    answerClaims,
    acceptedEvidence,
    usedSources
  } = ctx;

  const topics = extractTopics(answerClaims, usedSources);
  const questionType = task || 'GENERAL';
  const suggestions = [];

  // ── Template 1: Broaden the topic ────────────────────────────────────────
  if (topics[0]) {
    suggestions.push({
      followUpId: makeFollowUpId(),
      question: `ما هي الأحكام الشرعية المتعلقة بـ${topics[0]}؟`,
      origin: FOLLOW_UP_ORIGIN,
      parentRecordId: null,
      relatedOriginalClaimIds: (originalClaims || []).slice(0, 2).map(c => c.claimId).filter(Boolean),
      relatedAnswerClaimIds: (answerClaims || []).slice(0, 2).map(c => c.claimId).filter(Boolean),
      relatedEvidenceIds: (acceptedEvidence || []).slice(0, 2).map(e => e.evidenceId).filter(Boolean),
      relatedSourceIds: (usedSources || []).slice(0, 2).map(s => s.sourceId).filter(Boolean),
      rationale: `توسيع الموضوع ليشمل الأحكام الشرعية المتعلقة بـ${topics[0]}`
    });
  }

  // ── Template 2: Explore distinctions / conditions ────────────────────────
  if (topics[1] || topics[0]) {
    const refTopic = topics[1] || topics[0];
    suggestions.push({
      followUpId: makeFollowUpId(),
      question: `ما الفرق بين الحالات المختلفة المتعلقة بـ${refTopic}؟`,
      origin: FOLLOW_UP_ORIGIN,
      parentRecordId: null,
      relatedOriginalClaimIds: (originalClaims || []).slice(0, 1).map(c => c.claimId).filter(Boolean),
      relatedAnswerClaimIds: (answerClaims || []).slice(0, 2).map(c => c.claimId).filter(Boolean),
      relatedEvidenceIds: (acceptedEvidence || []).slice(0, 2).map(e => e.evidenceId).filter(Boolean),
      relatedSourceIds: (usedSources || []).slice(0, 1).map(s => s.sourceId).filter(Boolean),
      rationale: `استكشاف الفروق والشروط المتعلقة بـ${refTopic}`
    });
  }

  // ── Template 3: Source / scholarly basis ────────────────────────────────
  const sourceNames = (usedSources || []).map(s => s.sourceName).filter(Boolean);
  if (sourceNames.length > 0) {
    suggestions.push({
      followUpId: makeFollowUpId(),
      question: `ما هو الدليل الشرعي الوارد في ${sourceNames[0]} بشأن هذه المسألة؟`,
      origin: FOLLOW_UP_ORIGIN,
      parentRecordId: null,
      relatedOriginalClaimIds: [],
      relatedAnswerClaimIds: (answerClaims || []).slice(0, 1).map(c => c.claimId).filter(Boolean),
      relatedEvidenceIds: (acceptedEvidence || []).slice(0, 3).map(e => e.evidenceId).filter(Boolean),
      relatedSourceIds: (usedSources || []).slice(0, 2).map(s => s.sourceId).filter(Boolean),
      rationale: `الاستفسار عن الدليل الشرعي في المصدر: ${sourceNames[0]}`
    });
  }

  // ── Template 4: Practical application ───────────────────────────────────
  suggestions.push({
    followUpId: makeFollowUpId(),
    question: `كيف يُطبَّق هذا الحكم في الحياة اليومية؟`,
    origin: FOLLOW_UP_ORIGIN,
    parentRecordId: null,
    relatedOriginalClaimIds: (originalClaims || []).slice(0, 1).map(c => c.claimId).filter(Boolean),
    relatedAnswerClaimIds: (answerClaims || []).slice(0, 2).map(c => c.claimId).filter(Boolean),
    relatedEvidenceIds: [],
    relatedSourceIds: [],
    rationale: 'استكشاف التطبيق العملي للحكم في الحياة اليومية'
  });

  // ── Template 5: Scholarly disagreement ──────────────────────────────────
  if (questionType === 'LEGAL_RULING' || questionType === 'VERIFY_CLAIM') {
    suggestions.push({
      followUpId: makeFollowUpId(),
      question: `هل هناك خلاف بين العلماء في هذه المسألة؟`,
      origin: FOLLOW_UP_ORIGIN,
      parentRecordId: null,
      relatedOriginalClaimIds: (originalClaims || []).slice(0, 2).map(c => c.claimId).filter(Boolean),
      relatedAnswerClaimIds: (answerClaims || []).map(c => c.claimId).filter(Boolean),
      relatedEvidenceIds: (acceptedEvidence || []).slice(0, 2).map(e => e.evidenceId).filter(Boolean),
      relatedSourceIds: (usedSources || []).map(s => s.sourceId).filter(Boolean),
      rationale: 'استكشاف مواطن الخلاف العلمي في المسألة'
    });
  }

  // Trim to MAX_SUGGESTIONS
  return suggestions.slice(0, DEEP_LEARNING_CONFIG.MAX_SUGGESTIONS);
}

/**
 * Generates follow-up question suggestions from a fully verified answer context.
 *
 * @param {Object} ctx
 * @param {string}  ctx.originalQuestion
 * @param {string}  ctx.task
 * @param {Array}   ctx.originalClaims
 * @param {Array}   ctx.answerClaims
 * @param {Array}   ctx.acceptedEvidence
 * @param {Array}   ctx.usedSources
 * @param {Object}  [options]
 * @param {Array}   [options.mockSuggestions]        Inject mock suggestions array (tests)
 * @param {Function}[options.generatorOverride]      Inject custom async generator (tests / DI)
 * @returns {Promise<Array>} Raw suggestion objects (before deduplication)
 */
export async function generateFollowUps(ctx, options = {}) {
  // AI boundary 1: full mock override
  if (Array.isArray(options.mockSuggestions)) {
    return options.mockSuggestions;
  }

  // AI boundary 2: custom generator function (DI / future Gemini integration)
  if (typeof options.generatorOverride === 'function') {
    return await options.generatorOverride(ctx, options);
  }

  // Default: deterministic synthesis
  return synthesizeSuggestions(ctx);
}
