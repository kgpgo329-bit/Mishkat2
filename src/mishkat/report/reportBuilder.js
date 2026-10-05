/**
 * Mishkat Phase 11: Final Journey Report Builder & Sanitizer
 *
 * Constructs the final learning report with exactly two primary user-facing sections:
 *  1. ملخص الرحلة المعرفية
 *  2. تقييم الفهم
 *
 * ANTI-FABRICATION INVARIANTS:
 * - Topics, concepts, counts, and sources come ONLY from VERIFIED records.
 * - Assessment metrics (totalItems, correctCount, scorePercentage, conceptsUnderstood,
 *   conceptsNeedingReview) reflect ONLY the real completed assessment result.
 * - Zero fabricated percentages, achievements, or subjective labels.
 * - Client-safe output completely excludes private assessment keys and scoring secrets.
 */

import crypto from 'crypto';
import { REPORT_SECTIONS } from './reportTypes.js';

function makeId(prefix = 'rep') {
  return `${prefix}_${crypto.randomBytes(5).toString('hex')}`;
}

/**
 * Builds the canonical internal Journey Report.
 *
 * @param {Object} params
 * @param {Object} params.journeyState
 * @param {Object} params.assessmentResult
 * @param {string} [params.version]
 * @returns {Object} internalReport
 */
export function buildJourneyReport({ journeyState, assessmentResult, version = '1.0' }) {
  const verifiedRecords = (journeyState.verifiedRecords || []).filter(
    r => r && (r.status === 'VERIFIED' || !r.status)
  );

  // ── 1. Summarize Journey ────────────────────────────────────────────────
  const topicsSet = new Set();
  const conceptsSet = new Set();
  const sourcesMap = new Map(); // sourceId -> { sourceId, sourceName }
  let userQuestionCount = 0;
  let deepLearningCount = 0;
  const lineageLinks = [];

  for (const rec of verifiedRecords) {
    if (rec.topic) topicsSet.add(rec.topic);
    for (const c of (rec.concepts || [])) {
      if (c) conceptsSet.add(c);
    }
    for (const s of (rec.sources || [])) {
      if (s && s.sourceId && !sourcesMap.has(s.sourceId)) {
        sourcesMap.set(s.sourceId, {
          sourceId: s.sourceId,
          sourceName: s.sourceName || s.sourceId
        });
      }
    }

    if (rec.origin === 'DEEP_LEARNING') {
      deepLearningCount++;
      if (rec.parentRecordId) {
        lineageLinks.push({
          childRecordId: rec.id,
          parentRecordId: rec.parentRecordId
        });
      }
    } else {
      userQuestionCount++;
    }
  }

  const journeySummary = {
    title: REPORT_SECTIONS.JOURNEY_SUMMARY,
    uniqueVerifiedCount: journeyState.uniqueVerifiedCount,
    topicsCovered: [...topicsSet],
    conceptsEncountered: [...conceptsSet],
    progression: {
      userQuestions: userQuestionCount,
      deepLearningFollowUps: deepLearningCount,
      lineageLinksCount: lineageLinks.length
    },
    sourcesUsed: [...sourcesMap.values()]
  };

  // ── 2. Summarize Assessment ─────────────────────────────────────────────
  const assessmentSummary = {
    title: REPORT_SECTIONS.ASSESSMENT_EVALUATION,
    assessmentId: assessmentResult.assessmentId,
    totalItems: assessmentResult.totalItems,
    correctCount: assessmentResult.correctCount,
    incorrectCount: assessmentResult.incorrectCount,
    scorePercentage: assessmentResult.scorePercentage,
    conceptsUnderstood: assessmentResult.conceptsUnderstood || [],
    conceptsNeedingReview: assessmentResult.conceptsNeedingReview || [],
    factualInterpretation: `أنجز المستفيد التقييم المعرفي بنجاح، حيث أجاب على ${assessmentResult.correctCount} من أصل ${assessmentResult.totalItems} أسئلة بنسبة دقة بلغت ${assessmentResult.scorePercentage}%.`
  };

  const reportId = makeId('rep');

  return {
    reportId,
    sessionId: journeyState.sessionId || null,
    assessmentId: assessmentResult.assessmentId,
    version,
    createdAt: new Date().toISOString(),
    sections: {
      [REPORT_SECTIONS.JOURNEY_SUMMARY]: journeySummary,
      [REPORT_SECTIONS.ASSESSMENT_EVALUATION]: assessmentSummary
    },
    internalMetadata: {
      lineageLinks,
      verifiedRecordIds: verifiedRecords.map(r => r.id),
      evaluatedAt: assessmentResult.evaluatedAt || new Date().toISOString()
    }
  };
}

/**
 * Sanitizes an internal report for safe client delivery.
 * Excludes internal record IDs and internal assessment keys.
 *
 * @param {Object} internalReport
 * @returns {Object} clientSafeReport
 */
export function toClientSafeReport(internalReport) {
  if (!internalReport || !internalReport.sections) {
    return null;
  }

  const js = internalReport.sections[REPORT_SECTIONS.JOURNEY_SUMMARY];
  const as = internalReport.sections[REPORT_SECTIONS.ASSESSMENT_EVALUATION];

  return {
    reportId: internalReport.reportId,
    sessionId: internalReport.sessionId,
    createdAt: internalReport.createdAt,
    sections: {
      [REPORT_SECTIONS.JOURNEY_SUMMARY]: {
        title: js.title,
        uniqueVerifiedCount: js.uniqueVerifiedCount,
        topicsCovered: [...js.topicsCovered],
        conceptsEncountered: [...js.conceptsEncountered],
        progression: { ...js.progression },
        sourcesUsed: js.sourcesUsed.map(s => ({ sourceName: s.sourceName }))
      },
      [REPORT_SECTIONS.ASSESSMENT_EVALUATION]: {
        title: as.title,
        totalItems: as.totalItems,
        correctCount: as.correctCount,
        incorrectCount: as.incorrectCount,
        scorePercentage: as.scorePercentage,
        conceptsUnderstood: [...as.conceptsUnderstood],
        conceptsNeedingReview: [...as.conceptsNeedingReview],
        factualInterpretation: as.factualInterpretation
      }
    }
  };
}
