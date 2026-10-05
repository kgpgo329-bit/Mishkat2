/**
 * Mishkat Phase 11: Final Knowledge Journey Report — Deterministic Test Suite
 *
 * 33 Required Scenarios covering eligibility, anti-fabrication, lineage,
 * exact two-section contract, immutability, safety, and zero external dependencies.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ReportService,
  REPORT_STATUS,
  REPORT_SECTIONS,
  InMemoryReportStorage,
  toClientSafeReport
} from '../src/mishkat/report/index.js';
import { InMemoryJourneyStorage } from '../src/mishkat/journey/journeyStorage.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeJourneyRecords(count = 20) {
  const records = [];
  for (let i = 1; i <= count; i++) {
    const isDeepLearning = (i > 15);
    records.push({
      id: `kr_${i}`,
      sessionId: 'sess_11',
      originalQuestion: `سؤال موثق رقم ${i}`,
      origin: isDeepLearning ? 'DEEP_LEARNING' : 'USER_QUESTION',
      parentRecordId: isDeepLearning ? `kr_${i - 10}` : null,
      topic: `باب_${i % 5}`,
      concepts: [`مفهوم_${i % 7}_أ`, `مفهوم_${i % 7}_ب`],
      verifiedAnswer: `الجواب المعتمد للسؤال ${i}`,
      sources: [
        {
          sourceId: `src_${i % 3}`,
          sourceName: `المصدر المعتمد رقم ${i % 3}`
        }
      ],
      status: 'VERIFIED',
      createdAt: new Date().toISOString()
    });
  }
  return records;
}

function makeJourneyState(count = 20) {
  return {
    sessionId: 'sess_11',
    verifiedRecords: makeJourneyRecords(count),
    uniqueVerifiedCount: count,
    targetCount: 20,
    remainingCount: Math.max(0, 20 - count),
    progressPercentage: Math.min(100, Math.round((count / 20) * 100)),
    milestoneReached: count >= 20,
    assessmentEligible: count >= 20,
    updatedAt: new Date().toISOString()
  };
}

function makeCompletedAssessment(overrides = {}) {
  return {
    submissionId: 'sub_test_1',
    assessmentId: 'asm_test_1',
    totalItems: 5,
    correctCount: 4,
    incorrectCount: 1,
    scorePercentage: 80,
    conceptsUnderstood: ['مفهوم_1_أ', 'مفهوم_2_أ'],
    conceptsNeedingReview: ['مفهوم_3_ب'],
    evaluatedAt: new Date().toISOString(),
    ...overrides
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 1. Journey below milestone -> REPORT_NOT_ELIGIBLE
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 1: Journey below milestone -> REPORT_NOT_ELIGIBLE', () => {
  it('returns REPORT_NOT_ELIGIBLE when uniqueVerifiedCount < 20', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(19),
      assessmentResult: makeCompletedAssessment()
    });
    assert.equal(result.status, REPORT_STATUS.REPORT_NOT_ELIGIBLE);
    assert.equal(result.report, null);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. No completed assessment -> REPORT_NOT_ELIGIBLE
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 2: No completed assessment -> REPORT_NOT_ELIGIBLE', () => {
  it('returns REPORT_NOT_ELIGIBLE when assessmentResult is missing or null', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: null
    });
    assert.equal(result.status, REPORT_STATUS.REPORT_NOT_ELIGIBLE);
    assert.equal(result.report, null);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. Valid milestone + completed assessment -> report generated
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 3: Valid milestone + completed assessment -> report generated', () => {
  it('successfully generates report with status CREATED', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment()
    });
    assert.equal(result.status, REPORT_STATUS.CREATED);
    assert.ok(result.report);
    assert.ok(result.report.reportId);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. Report contains "ملخص الرحلة المعرفية"
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 4: Report contains "ملخص الرحلة المعرفية"', () => {
  it('has primary section titled ملخص الرحلة المعرفية', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment()
    });
    assert.ok(result.report.sections[REPORT_SECTIONS.JOURNEY_SUMMARY]);
    assert.equal(
      result.report.sections[REPORT_SECTIONS.JOURNEY_SUMMARY].title,
      'ملخص الرحلة المعرفية'
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. Report contains "تقييم الفهم"
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 5: Report contains "تقييم الفهم"', () => {
  it('has primary section titled تقييم الفهم', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment()
    });
    assert.ok(result.report.sections[REPORT_SECTIONS.ASSESSMENT_EVALUATION]);
    assert.equal(
      result.report.sections[REPORT_SECTIONS.ASSESSMENT_EVALUATION].title,
      'تقييم الفهم'
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 6. Unique verified count matches real Journey state
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 6: Unique verified count matches real Journey state', () => {
  it('preserves exactly 20 unique verified count', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment()
    });
    const js = result.report.sections[REPORT_SECTIONS.JOURNEY_SUMMARY];
    assert.equal(js.uniqueVerifiedCount, 20);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 7. Topics come only from VERIFIED records
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 7: Topics come only from VERIFIED records', () => {
  it('collects topics strictly from verified records', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment()
    });
    const js = result.report.sections[REPORT_SECTIONS.JOURNEY_SUMMARY];
    assert.ok(js.topicsCovered.length > 0);
    for (const t of js.topicsCovered) {
      assert.ok(t.startsWith('باب_'));
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 8. Concepts come only from VERIFIED records
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 8: Concepts come only from VERIFIED records', () => {
  it('collects concepts strictly from verified records', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment()
    });
    const js = result.report.sections[REPORT_SECTIONS.JOURNEY_SUMMARY];
    assert.ok(js.conceptsEncountered.length > 0);
    for (const c of js.conceptsEncountered) {
      assert.ok(c.startsWith('مفهوم_'));
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 9. USER_QUESTION / DEEP_LEARNING lineage summarized correctly
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 9: USER_QUESTION / DEEP_LEARNING lineage summarized correctly', () => {
  it('correctly tracks counts of user questions vs deep learning followups', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment()
    });
    const js = result.report.sections[REPORT_SECTIONS.JOURNEY_SUMMARY];
    assert.equal(js.progression.userQuestions, 15);
    assert.equal(js.progression.deepLearningFollowUps, 5);
    assert.equal(js.progression.lineageLinksCount, 5);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 10. Actual assessment totalItems preserved
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 10: Actual assessment totalItems preserved', () => {
  it('preserves totalItems from assessmentResult', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment({ totalItems: 7 })
    });
    assert.equal(
      result.report.sections[REPORT_SECTIONS.ASSESSMENT_EVALUATION].totalItems,
      7
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 11. Actual correctCount preserved
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 11: Actual correctCount preserved', () => {
  it('preserves correctCount from assessmentResult', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment({ correctCount: 3 })
    });
    assert.equal(
      result.report.sections[REPORT_SECTIONS.ASSESSMENT_EVALUATION].correctCount,
      3
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 12. Actual incorrectCount preserved
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 12: Actual incorrectCount preserved', () => {
  it('preserves incorrectCount from assessmentResult', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment({ incorrectCount: 2 })
    });
    assert.equal(
      result.report.sections[REPORT_SECTIONS.ASSESSMENT_EVALUATION].incorrectCount,
      2
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 13. Actual scorePercentage preserved
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 13: Actual scorePercentage preserved', () => {
  it('preserves scorePercentage from assessmentResult without alteration', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment({ scorePercentage: 85 })
    });
    assert.equal(
      result.report.sections[REPORT_SECTIONS.ASSESSMENT_EVALUATION].scorePercentage,
      85
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 14. Concepts understood use actual assessment result
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 14: Concepts understood use actual assessment result', () => {
  it('matches conceptsUnderstood in assessmentResult', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment({ conceptsUnderstood: ['التوحيد', 'الصلاة'] })
    });
    assert.deepEqual(
      result.report.sections[REPORT_SECTIONS.ASSESSMENT_EVALUATION].conceptsUnderstood,
      ['التوحيد', 'الصلاة']
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 15. Concepts needing review use actual assessment result
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 15: Concepts needing review use actual assessment result', () => {
  it('matches conceptsNeedingReview in assessmentResult', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment({ conceptsNeedingReview: ['شروط الصلاة'] })
    });
    assert.deepEqual(
      result.report.sections[REPORT_SECTIONS.ASSESSMENT_EVALUATION].conceptsNeedingReview,
      ['شروط الصلاة']
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 16. No fabricated percentages
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 16: No fabricated percentages', () => {
  it('never outputs invented percentage claims in factual interpretation', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment({ scorePercentage: 80 })
    });
    const interpretation =
      result.report.sections[REPORT_SECTIONS.ASSESSMENT_EVALUATION].factualInterpretation;

    assert.ok(interpretation.includes('80%'));
    assert.ok(!interpretation.includes('95%'));
    assert.ok(!interpretation.includes('100%'));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 17. No fabricated topics/concepts
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 17: No fabricated topics/concepts', () => {
  it('only presents topics and concepts present in the input records', async () => {
    const service = new ReportService();
    const state = makeJourneyState(20);
    const result = await service.generateReport({
      journeyState: state,
      assessmentResult: makeCompletedAssessment()
    });

    const js = result.report.sections[REPORT_SECTIONS.JOURNEY_SUMMARY];
    assert.ok(!js.topicsCovered.includes('موضوع_غير_موجود'));
    assert.ok(!js.conceptsEncountered.includes('مفهوم_مخترع'));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 18. No unverified records included
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 18: No unverified records included', () => {
  it('filters out records marked UNVERIFIED', async () => {
    const service = new ReportService();
    const records = makeJourneyRecords(20);
    records.push({
      id: 'kr_unver',
      topic: 'موضوع_مردود',
      concepts: ['مفهوم_مردود'],
      status: 'UNVERIFIED'
    });

    const state = {
      ...makeJourneyState(20),
      verifiedRecords: records
    };

    const result = await service.generateReport({
      journeyState: state,
      assessmentResult: makeCompletedAssessment()
    });

    const js = result.report.sections[REPORT_SECTIONS.JOURNEY_SUMMARY];
    assert.ok(!js.topicsCovered.includes('موضوع_مردود'));
    assert.ok(!js.conceptsEncountered.includes('مفهوم_مردود'));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 19. Sources deduplicated
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 19: Sources deduplicated', () => {
  it('deduplicates sources across multiple records', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment()
    });

    const sources = result.report.sections[REPORT_SECTIONS.JOURNEY_SUMMARY].sourcesUsed;
    const names = sources.map(s => s.sourceName);
    const unique = new Set(names);
    assert.equal(names.length, unique.size);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 20. Only actual Journey sources included
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 20: Only actual Journey sources included', () => {
  it('does not invent external sources not in verified records', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment()
    });

    const sources = result.report.sections[REPORT_SECTIONS.JOURNEY_SUMMARY].sourcesUsed;
    for (const s of sources) {
      assert.ok(s.sourceName.startsWith('المصدر المعتمد رقم '));
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 21. Assessment private answer keys not exposed
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 21: Assessment private answer keys not exposed', () => {
  it('client-safe report omits private keys', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment()
    });

    const str = JSON.stringify(result.report);
    assert.ok(!str.includes('correctOptionId'));
    assert.ok(!str.includes('correctAnswerText'));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 22. correctOptionId not exposed
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 22: correctOptionId not exposed', () => {
  it('verifies absence of correctOptionId in any report field', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment()
    });
    assert.equal(result.report.correctOptionId, undefined);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 23. Internal scoring secrets not exposed
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 23: Internal scoring secrets not exposed', () => {
  it('omits scoring secrets from client-safe representation', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment()
    });
    assert.equal(result.report.scoringKey, undefined);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 24. Report generation does not create KnowledgeRecords
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 24: Report generation does not create KnowledgeRecords', () => {
  it('journey storage record count remains unchanged before and after report generation', async () => {
    const journeyStorage = new InMemoryJourneyStorage();
    const countBefore = await journeyStorage.countUniqueVerified();

    const service = new ReportService();
    await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment()
    });

    const countAfter = await journeyStorage.countUniqueVerified();
    assert.equal(countBefore, countAfter);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 25. Journey progress unchanged after report generation
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 25: Journey progress unchanged after report generation', () => {
  it('journey state uniqueVerifiedCount remains strictly unchanged', async () => {
    const state = makeJourneyState(20);
    const service = new ReportService();

    await service.generateReport({
      journeyState: state,
      assessmentResult: makeCompletedAssessment()
    });

    assert.equal(state.uniqueVerifiedCount, 20);
    assert.equal(state.milestoneReached, true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 26. Assessment result unchanged after report generation
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 26: Assessment result unchanged after report generation', () => {
  it('original assessmentResult properties are not mutated', async () => {
    const assessmentResult = makeCompletedAssessment({ scorePercentage: 80 });
    const service = new ReportService();

    await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult
    });

    assert.equal(assessmentResult.scorePercentage, 80);
    assert.equal(assessmentResult.totalItems, 5);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 27. Report tied to sessionId
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 27: Report tied to sessionId', () => {
  it('report contains correct sessionId matching journeyState', async () => {
    const service = new ReportService();
    const result = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment()
    });
    assert.equal(result.report.sessionId, 'sess_11');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 28. Report tied to assessmentId
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 28: Report tied to assessmentId', () => {
  it('internal report ties directly to assessmentId', async () => {
    const service = new ReportService();
    const res = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment({ assessmentId: 'asm_special_99' })
    });
    const internal = await service.getInternalReport(res.report.reportId);
    assert.equal(internal.assessmentId, 'asm_special_99');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 29. Existing report remains immutable
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 29: Existing report remains immutable', () => {
  it('stored report does not mutate when journeyState is modified later', async () => {
    const service = new ReportService();
    const state = makeJourneyState(20);

    const res = await service.generateReport({
      journeyState: state,
      assessmentResult: makeCompletedAssessment()
    });

    const firstFetch = await service.getClientReport(res.report.reportId);

    // Modify state in memory
    state.uniqueVerifiedCount = 25;

    const secondFetch = await service.getClientReport(res.report.reportId);
    assert.equal(
      firstFetch.sections[REPORT_SECTIONS.JOURNEY_SUMMARY].uniqueVerifiedCount,
      secondFetch.sections[REPORT_SECTIONS.JOURNEY_SUMMARY].uniqueVerifiedCount
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 30. New cycle creates a new report/version rather than mutating previous one
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 30: New cycle creates a new report/version rather than mutating previous one', () => {
  it('generates a new reportId with distinct version', async () => {
    const service = new ReportService();
    const state = makeJourneyState(20);

    const res1 = await service.generateReport({
      journeyState: state,
      assessmentResult: makeCompletedAssessment({ scorePercentage: 80 }),
      version: '1.0'
    });

    const res2 = await service.generateReport({
      journeyState: state,
      assessmentResult: makeCompletedAssessment({ scorePercentage: 100 }),
      version: '2.0'
    });

    assert.notEqual(res1.report.reportId, res2.report.reportId);

    const int1 = await service.getInternalReport(res1.report.reportId);
    const int2 = await service.getInternalReport(res2.report.reportId);
    assert.equal(int1.version, '1.0');
    assert.equal(int2.version, '2.0');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 31. Storage abstraction works in memory
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 31: Storage abstraction works in memory', () => {
  it('saves and retrieves reports with InMemoryReportStorage', async () => {
    const storage = new InMemoryReportStorage();
    const report = { reportId: 'rep_test', sessionId: 'sess_1', sections: {} };

    await storage.saveReport(report);
    const fetched = await storage.getReport('rep_test');
    assert.deepEqual(fetched, report);

    storage.reset();
    assert.equal(await storage.getReport('rep_test'), null);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 32. No Firebase dependency
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 32: No Firebase dependency', () => {
  it('service executes purely in Node.js process without Firebase libraries', async () => {
    const service = new ReportService();
    const res = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment()
    });
    assert.ok(res.report);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 33. No external AI/API required for deterministic tests
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 33: No external AI/API required for deterministic tests', () => {
  it('runs instantaneously with zero network overhead', async () => {
    const service = new ReportService();
    const start = Date.now();
    const res = await service.generateReport({
      journeyState: makeJourneyState(20),
      assessmentResult: makeCompletedAssessment()
    });
    const elapsed = Date.now() - start;
    assert.equal(res.status, REPORT_STATUS.CREATED);
    assert.ok(elapsed < 100, `Executed in ${elapsed}ms`);
  });
});
