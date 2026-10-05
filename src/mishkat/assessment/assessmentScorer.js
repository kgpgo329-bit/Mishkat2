/**
 * Mishkat Phase 10: Assessment Scoring Engine
 *
 * Scores user responses deterministically against the private answer keys
 * of an immutable assessment instance.
 *
 * SECURITY INVARIANT:
 * - NEVER trusts client-submitted "correct answer" or "isCorrect" fields.
 * - Always evaluates against stored internal item.correctOptionId.
 */

import crypto from 'crypto';

/**
 * Evaluates assessment responses and produces a scored result.
 *
 * @param {Object} internalAssessment Stored assessment with private answer keys
 * @param {Array<{assessmentItemId: string, selectedOptionId: string}>} responses User responses
 * @returns {Object} Submission result
 */
export function scoreAssessment(internalAssessment, responses = []) {
  if (!internalAssessment || !Array.isArray(internalAssessment.items)) {
    throw new Error('INVALID_ASSESSMENT: Assessment instance is invalid or has no items.');
  }

  const items = internalAssessment.items;
  const totalItems = items.length;

  if (totalItems === 0) {
    return {
      submissionId: 'sub_' + crypto.randomBytes(4).toString('hex'),
      assessmentId: internalAssessment.assessmentId,
      totalItems: 0,
      correctCount: 0,
      incorrectCount: 0,
      scorePercentage: 0,
      perItemOutcome: [],
      conceptsUnderstood: [],
      conceptsNeedingReview: [],
      evaluatedAt: new Date().toISOString()
    };
  }

  // Index user responses by itemId
  const responseMap = new Map();
  for (const r of responses || []) {
    if (r && r.assessmentItemId) {
      responseMap.set(r.assessmentItemId, r.selectedOptionId);
    }
  }

  let correctCount = 0;
  const perItemOutcome = [];
  const conceptSuccessMap = new Map(); // concept -> { correct: number, total: number }

  for (const item of items) {
    const selectedOptionId = responseMap.get(item.assessmentItemId) ?? null;
    const isCorrect = (selectedOptionId !== null && selectedOptionId === item.correctOptionId);

    if (isCorrect) {
      correctCount++;
    }

    perItemOutcome.push({
      assessmentItemId: item.assessmentItemId,
      isCorrect,
      selectedOptionId,
      correctOptionId: item.correctOptionId,
      correctAnswerText: item.correctAnswerText,
      explanation: item.explanation || '',
      relatedConcepts: item.relatedConcepts || []
    });

    // Track concept mastery
    for (const concept of (item.relatedConcepts || [])) {
      if (!conceptSuccessMap.has(concept)) {
        conceptSuccessMap.set(concept, { correct: 0, total: 0 });
      }
      const entry = conceptSuccessMap.get(concept);
      entry.total++;
      if (isCorrect) entry.correct++;
    }
  }

  const incorrectCount = totalItems - correctCount;
  const scorePercentage = Math.round((correctCount / totalItems) * 100);

  const conceptsUnderstood = [];
  const conceptsNeedingReview = [];

  for (const [concept, stats] of conceptSuccessMap.entries()) {
    if (stats.correct === stats.total) {
      conceptsUnderstood.push(concept);
    } else {
      conceptsNeedingReview.push(concept);
    }
  }

  return {
    submissionId: 'sub_' + crypto.randomBytes(4).toString('hex'),
    assessmentId: internalAssessment.assessmentId,
    totalItems,
    correctCount,
    incorrectCount,
    scorePercentage,
    perItemOutcome,
    conceptsUnderstood,
    conceptsNeedingReview,
    evaluatedAt: new Date().toISOString()
  };
}
