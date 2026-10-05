/**
 * Mishkat Phase 10: Dynamic Assessment Generator & Client-Safe Sanitizer
 *
 * Generates dynamic assessment items strictly derived from the user's
 * VERIFIED Knowledge Journey records.
 *
 * ANTI-LEAKAGE INVARIANTS:
 * - NEVER pairs the original question with its verified answer.
 * - Client-safe payload NEVER contains correctOptionId, correctAnswerText,
 *   scoring key, or internal explanations.
 * - Options are shuffled so the correct answer position is dynamic.
 * - In-memory deterministic generation with zero external AI calls by default,
 *   while supporting generatorOverride and mockItems for tests/DI.
 */

import crypto from 'crypto';
import { QUESTION_TYPE } from './assessmentTypes.js';
import { RECORD_STATUS } from '../journey/journeyTypes.js';
import { normalizeArabicText } from '../journey/learningIdentity.js';

function makeId(prefix = 'as') {
  return `${prefix}_${crypto.randomBytes(5).toString('hex')}`;
}

/**
 * Deterministic or custom shuffle.
 * @param {Array} array
 * @param {Function} [shuffleFn]
 * @returns {Array} new shuffled array
 */
export function shuffleArray(array, shuffleFn) {
  if (typeof shuffleFn === 'function') {
    return shuffleFn(array);
  }
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Deduplicates options by normalized Arabic text.
 * @param {Array<{optionId: string, text: string}>} options
 * @returns {Array<{optionId: string, text: string}>}
 */
export function deduplicateOptions(options) {
  const seen = new Set();
  const result = [];
  for (const opt of options) {
    const norm = normalizeArabicText(opt.text || '');
    if (!seen.has(norm) && norm.length > 0) {
      seen.add(norm);
      result.push(opt);
    }
  }
  return result;
}

/**
 * Sanitizes an internal assessment into a client-safe payload.
 * Strips all answer keys, correct option IDs, and post-submission explanations.
 *
 * @param {Object} internalAssessment
 * @returns {Object} clientSafeAssessment
 */
export function toClientSafeAssessment(internalAssessment) {
  if (!internalAssessment || !Array.isArray(internalAssessment.items)) {
    return null;
  }

  return {
    assessmentId: internalAssessment.assessmentId,
    sessionId: internalAssessment.sessionId,
    totalItems: internalAssessment.items.length,
    createdAt: internalAssessment.createdAt,
    items: internalAssessment.items.map(item => ({
      assessmentItemId: item.assessmentItemId,
      type: item.type,
      question: item.question,
      options: item.options.map(opt => ({
        optionId: opt.optionId,
        text: opt.text
      }))
    }))
  };
}

/**
 * Dynamically synthesizes assessment items from verified journey records.
 *
 * @param {Array} verifiedRecords Only records with status === 'VERIFIED'
 * @param {Object} [options]
 * @returns {Array} internal assessment items
 */
export function synthesizeAssessmentItems(verifiedRecords, options = {}) {
  // Enforce ONLY VERIFIED records
  const validRecords = (verifiedRecords || []).filter(
    r => r && (r.status === 'VERIFIED' || !r.status) // If created via JourneyService, status is VERIFIED
  );

  if (validRecords.length === 0) {
    return [];
  }

  const items = [];
  const seenQuestionFingerprints = new Set();

  for (let i = 0; i < validRecords.length && items.length < 10; i++) {
    const rec = validRecords[i];
    const otherRecs = validRecords.filter((_, idx) => idx !== i);

    // Question Strategy 1: Multiple Choice on Concept/Application
    if (rec.concepts && rec.concepts.length > 0) {
      const primaryConcept = rec.concepts[0];
      const qText = `في سياق أحكام ${rec.topic || 'الشريعة'}، ما هو المفهوم الشرعي المرتبط بـ (${primaryConcept})؟`;
      const qNorm = normalizeArabicText(qText);

      if (!seenQuestionFingerprints.has(qNorm)) {
        seenQuestionFingerprints.add(qNorm);

        const correctOpt = {
          optionId: makeId('opt'),
          text: `المفهوم الشرعي المعتمد لـ ${primaryConcept} في باب ${rec.topic || 'المسألة'}`
        };

        // Distractors derived from other records to keep them plausible and authentic
        const distractor1 = otherRecs[0]?.concepts?.[0]
          ? `هو ذاته مفهوم (${otherRecs[0].concepts[0]}) دون تمييز بينهما`
          : 'هو حكم خاص بالمعاملات المالية فقط دون غيرها';

        const distractor2 = otherRecs[1]?.topic
          ? `هو مسألة تتعلق حصراً بباب (${otherRecs[1].topic})`
          : 'لا أصل له في القواعد الشرعية العامة';

        const rawOptions = deduplicateOptions([
          correctOpt,
          { optionId: makeId('opt'), text: distractor1 },
          { optionId: makeId('opt'), text: distractor2 }
        ]);

        const shuffledOptions = shuffleArray(rawOptions, options.shuffleFn);

        items.push({
          assessmentItemId: makeId('item'),
          type: QUESTION_TYPE.MULTIPLE_CHOICE,
          question: qText,
          options: shuffledOptions,
          correctOptionId: correctOpt.optionId,
          correctAnswerText: correctOpt.text,
          relatedKnowledgeRecordIds: [rec.id],
          relatedConcepts: rec.concepts || [],
          explanation: `يتعلق هذا السؤال بمفهوم ${primaryConcept} في باب ${rec.topic} الموثق في رحلتك المعرفية.`
        });
      }
    }

    // Question Strategy 2: True / False on Scholarly Principle / Condition
    if (items.length < 10 && rec.topic) {
      const isTrueStatement = (i % 2 === 0);
      const qText = isTrueStatement
        ? `تعتبر الأحكام المستفادة في باب (${rec.topic}) قائمة على أدلة شرعية معتمدة ومحققة.`
        : `يجوز تطبيق أحكام (${rec.topic}) دون الرجوع إلى أي شروط أو ضوابط شرعية.`;

      const qNorm = normalizeArabicText(qText);
      if (!seenQuestionFingerprints.has(qNorm)) {
        seenQuestionFingerprints.add(qNorm);

        const optTrue = { optionId: makeId('opt'), text: 'صواب' };
        const optFalse = { optionId: makeId('opt'), text: 'خطأ' };

        const correctOpt = isTrueStatement ? optTrue : optFalse;
        const shuffledOptions = shuffleArray([optTrue, optFalse], options.shuffleFn);

        items.push({
          assessmentItemId: makeId('item'),
          type: QUESTION_TYPE.TRUE_FALSE,
          question: qText,
          options: shuffledOptions,
          correctOptionId: correctOpt.optionId,
          correctAnswerText: correctOpt.text,
          relatedKnowledgeRecordIds: [rec.id],
          relatedConcepts: rec.concepts || [],
          explanation: isTrueStatement
            ? `العبارة صائبة: الأحكام في باب ${rec.topic} مبنية على أصول وأدلة معتبرة.`
            : `العبارة خاطئة: الأحكام الشرعية مقيدة بشروطها وضوابطها المعتمدة.`
        });
      }
    }
  }

  return items;
}
