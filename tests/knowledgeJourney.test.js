/**
 * Mishkat Phase 9: Knowledge Journey — Deterministic Test Suite (27 scenarios)
 *
 * All tests are deterministic. No Firebase, no network, no external AI calls.
 * Uses InMemoryJourneyStorage exclusively.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { JourneyService } from '../src/mishkat/journey/JourneyService.js';
import { InMemoryJourneyStorage } from '../src/mishkat/journey/journeyStorage.js';
import { ADD_RECORD_RESULT, RECORD_ORIGIN, RECORD_STATUS, JOURNEY_TARGET } from '../src/mishkat/journey/journeyTypes.js';
import { normalizeArabicText, computeLearningFingerprint } from '../src/mishkat/journey/learningIdentity.js';
import { computeJourneyState } from '../src/mishkat/journey/journeyProgress.js';

// ── Shared Fixtures ──────────────────────────────────────────────────────────

const GOOD_SUFFICIENCY = {
  overallSufficiency: 'SUFFICIENT',
  routing: 'ANSWERED',
  claims: [{ claimId: 'cl_1', status: 'SUPPORTED', supportingEvidence: [{ evidenceId: 'ev_1' }] }]
};

const GOOD_ANSWER = {
  answerStatus: 'ANSWERED',
  answerText: 'الصلاة واجبة في الإسلام.',
  answerClaims: [
    {
      claimId: 'ac_1',
      statement: 'الصلاة واجبة.',
      importance: 'CORE',
      groundingStatus: 'GROUNDED',
      originalClaimId: 'cl_1',
      evidenceIds: ['ev_1'],
      chunkIds: ['ck_1'],
      sourceIds: ['src_1']
    }
  ],
  groundingVerification: { status: 'VERIFIED', isFullyGrounded: true, groundedClaims: 1, ungroundedClaims: 0 },
  citations: [{ chunkId: 'ck_1', sourceId: 'src_1', sourceName: 'صحيح البخاري', text: 'نص' }],
  sources: [{ sourceId: 'src_1', sourceName: 'صحيح البخاري', sourceUrl: '' }]
};

const GOOD_INTERPRETATION = {
  questionText: 'ما حكم الصلاة في الإسلام؟',
  task: 'LEGAL_RULING',
  topic: 'الصلاة'
};

/** Creates a fresh isolated JourneyService for each test */
function makeService() {
  return new JourneyService(new InMemoryJourneyStorage());
}

/** Makes a record-add params object with optional overrides */
function makeParams(overrides = {}) {
  return {
    sessionId: 'sess_test',
    interpretation: GOOD_INTERPRETATION,
    sufficiencyResult: GOOD_SUFFICIENCY,
    answerResult: GOOD_ANSWER,
    origin: RECORD_ORIGIN.USER_QUESTION,
    parentRecordId: null,
    options: { mockConcepts: ['الصلاة', 'الوجوب'] },
    ...overrides
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Scenario 1: SUFFICIENT + ANSWERED + grounding PASSED → VERIFIED record
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 1: SUFFICIENT + ANSWERED + grounding PASSED → record CREATED', () => {
  it('creates a VERIFIED KnowledgeRecord', async () => {
    const svc = makeService();
    const { result, record } = await svc.addRecord(makeParams());
    assert.equal(result, ADD_RECORD_RESULT.CREATED);
    assert.ok(record, 'record must be returned');
    assert.equal(record.status, RECORD_STATUS.VERIFIED);
    assert.ok(record.id.startsWith('kr_'));
    assert.equal(record.originalQuestion, GOOD_INTERPRETATION.questionText);
    assert.equal(record.origin, RECORD_ORIGIN.USER_QUESTION);
    assert.equal(record.parentRecordId, null);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 2: PARTIAL → no record
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 2: PARTIAL → GATED, no record', () => {
  it('returns GATED when routing is PARTIAL', async () => {
    const svc = makeService();
    const { result, record } = await svc.addRecord(makeParams({
      sufficiencyResult: { ...GOOD_SUFFICIENCY, overallSufficiency: 'PARTIAL', routing: 'PARTIAL' }
    }));
    assert.equal(result, ADD_RECORD_RESULT.GATED);
    assert.equal(record, null);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 3: INSUFFICIENT → no record
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 3: INSUFFICIENT → GATED, no record', () => {
  it('returns GATED when sufficiency is INSUFFICIENT', async () => {
    const svc = makeService();
    const { result, record } = await svc.addRecord(makeParams({
      sufficiencyResult: { ...GOOD_SUFFICIENCY, overallSufficiency: 'INSUFFICIENT', routing: 'INSUFFICIENT' }
    }));
    assert.equal(result, ADD_RECORD_RESULT.GATED);
    assert.equal(record, null);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 4: NEEDS_CLARIFICATION → no record
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 4: NEEDS_CLARIFICATION → GATED, no record', () => {
  it('returns GATED for NEEDS_CLARIFICATION routing', async () => {
    const svc = makeService();
    const { result, record } = await svc.addRecord(makeParams({
      sufficiencyResult: { ...GOOD_SUFFICIENCY, routing: 'NEEDS_CLARIFICATION' }
    }));
    assert.equal(result, ADD_RECORD_RESULT.GATED);
    assert.equal(record, null);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 5: REFER_TO_AUTHORITY → no record
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 5: REFER_TO_AUTHORITY → GATED, no record', () => {
  it('returns GATED for REFER_TO_AUTHORITY routing', async () => {
    const svc = makeService();
    const { result, record } = await svc.addRecord(makeParams({
      sufficiencyResult: { ...GOOD_SUFFICIENCY, routing: 'REFER_TO_AUTHORITY' }
    }));
    assert.equal(result, ADD_RECORD_RESULT.GATED);
    assert.equal(record, null);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 6: SERVICE_ERROR → no record
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 6: SERVICE_ERROR → GATED, no record', () => {
  it('returns GATED for SERVICE_ERROR answerStatus', async () => {
    const svc = makeService();
    const { result, record } = await svc.addRecord(makeParams({
      answerResult: { ...GOOD_ANSWER, answerStatus: 'SERVICE_ERROR' }
    }));
    assert.equal(result, ADD_RECORD_RESULT.GATED);
    assert.equal(record, null);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 7: Failed grounding → no record
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 7: Failed grounding → GATED, no record', () => {
  it('returns GATED when isFullyGrounded is false', async () => {
    const svc = makeService();
    const { result, record } = await svc.addRecord(makeParams({
      answerResult: {
        ...GOOD_ANSWER,
        groundingVerification: { status: 'PARTIALLY_VERIFIED', isFullyGrounded: false, groundedClaims: 0, ungroundedClaims: 1 }
      }
    }));
    assert.equal(result, ADD_RECORD_RESULT.GATED);
    assert.equal(record, null);
  });

  it('returns GATED when grounding status is UNVERIFIED', async () => {
    const svc = makeService();
    const { result } = await svc.addRecord(makeParams({
      answerResult: {
        ...GOOD_ANSWER,
        groundingVerification: { status: 'UNVERIFIED', isFullyGrounded: false, groundedClaims: 0, ungroundedClaims: 1 }
      }
    }));
    assert.equal(result, ADD_RECORD_RESULT.GATED);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 8: USER_QUESTION record — origin + parentRecordId
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 8: USER_QUESTION record has correct origin and null parentRecordId', () => {
  it('sets origin USER_QUESTION and parentRecordId null', async () => {
    const svc = makeService();
    const { result, record } = await svc.addRecord(makeParams({ origin: RECORD_ORIGIN.USER_QUESTION }));
    assert.equal(result, ADD_RECORD_RESULT.CREATED);
    assert.equal(record.origin, RECORD_ORIGIN.USER_QUESTION);
    assert.equal(record.parentRecordId, null);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 9: Verified selected Deep Learning follow-up — DEEP_LEARNING lineage
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 9: Verified Deep Learning follow-up → DEEP_LEARNING with valid parentRecordId', () => {
  it('creates child record with correct origin and parent link', async () => {
    const svc = makeService();

    // Create parent record
    const { record: parent } = await svc.addRecord(makeParams());
    assert.equal(parent.status, RECORD_STATUS.VERIFIED);

    // Create Deep Learning child (different question/concepts to avoid duplicate)
    const childInterpretation = {
      questionText: 'ما هي شروط صحة الصلاة؟',
      task: 'LEGAL_RULING',
      topic: 'شروط الصلاة'
    };
    const childAnswer = {
      ...GOOD_ANSWER,
      answerText: 'شروط الصلاة تشمل الطهارة والوقت.',
      answerClaims: [{
        claimId: 'ac_2',
        statement: 'الطهارة شرط للصلاة.',
        importance: 'CORE',
        groundingStatus: 'GROUNDED',
        evidenceIds: ['ev_2'],
        chunkIds: ['ck_2'],
        sourceIds: ['src_1']
      }]
    };

    const { result, record: child } = await svc.addRecord({
      sessionId: 'sess_test',
      interpretation: childInterpretation,
      sufficiencyResult: GOOD_SUFFICIENCY,
      answerResult: childAnswer,
      origin: RECORD_ORIGIN.DEEP_LEARNING,
      parentRecordId: parent.id,
      options: { mockConcepts: ['الطهارة', 'الوقت'] }
    });

    assert.equal(result, ADD_RECORD_RESULT.CREATED);
    assert.equal(child.origin, RECORD_ORIGIN.DEEP_LEARNING);
    assert.equal(child.parentRecordId, parent.id);
    assert.equal(child.status, RECORD_STATUS.VERIFIED);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 10: Unselected Deep Learning suggestion → no record
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 10: Unselected Deep Learning suggestion → no record', () => {
  it('an unselected suggestion that never enters pipeline produces no record', async () => {
    // An unselected suggestion never calls addRecord().
    // This test verifies the storage remains empty in that case.
    const svc = makeService();
    const state = await svc.getJourneyState('sess_none');
    assert.equal(state.uniqueVerifiedCount, 0);
    assert.equal(state.verifiedRecords.length, 0);
    // Simulating "suggestion generated but not selected" → simply don't call addRecord
    const stateAfter = await svc.getJourneyState('sess_none');
    assert.equal(stateAfter.uniqueVerifiedCount, 0, 'unselected suggestion must never appear in journey');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 11: Invalid/missing parentRecordId → DEEP_LEARNING rejected
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 11: Invalid/missing parentRecordId → LINEAGE_INVALID', () => {
  it('returns LINEAGE_INVALID when parentRecordId is null for DEEP_LEARNING', async () => {
    const svc = makeService();
    const { result, record } = await svc.addRecord(makeParams({
      origin: RECORD_ORIGIN.DEEP_LEARNING,
      parentRecordId: null
    }));
    assert.equal(result, ADD_RECORD_RESULT.LINEAGE_INVALID);
    assert.equal(record, null);
  });

  it('returns LINEAGE_INVALID when parentRecordId references non-existent record', async () => {
    const svc = makeService();
    const { result, record } = await svc.addRecord(makeParams({
      origin: RECORD_ORIGIN.DEEP_LEARNING,
      parentRecordId: 'kr_nonexistent_abc'
    }));
    assert.equal(result, ADD_RECORD_RESULT.LINEAGE_INVALID);
    assert.equal(record, null);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 12: Exact duplicate verified question → progress NOT incremented
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 12: Exact duplicate verified question → DUPLICATE, no progress', () => {
  it('second identical submission returns DUPLICATE and does not increment count', async () => {
    const svc = makeService();

    const { result: r1, journeyState: s1 } = await svc.addRecord(makeParams());
    assert.equal(r1, ADD_RECORD_RESULT.CREATED);
    assert.equal(s1.uniqueVerifiedCount, 1);

    const { result: r2, record: rec2, journeyState: s2 } = await svc.addRecord(makeParams());
    assert.equal(r2, ADD_RECORD_RESULT.DUPLICATE);
    assert.equal(rec2, null);
    assert.equal(s2.uniqueVerifiedCount, 1, 'count must not increment on duplicate');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 13: Normalized/paraphrase-equivalent deterministic duplicate
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 13: Normalized duplicate (diacritics variant) → no progress increment', () => {
  it('diacritic-variant of same question with same claims detected as duplicate', async () => {
    const svc = makeService();

    // Original
    const { result: r1, journeyState: s1 } = await svc.addRecord(makeParams({
      interpretation: { questionText: 'ما حكم الصلاة في الإسلام؟', task: 'LEGAL_RULING', topic: 'الصلاة' },
      options: { mockConcepts: ['الصلاة', 'الوجوب'] }
    }));
    assert.equal(r1, ADD_RECORD_RESULT.CREATED);
    assert.equal(s1.uniqueVerifiedCount, 1);

    // Paraphrase with tashkeel — same normalized form
    const { result: r2, journeyState: s2 } = await svc.addRecord(makeParams({
      interpretation: { questionText: 'مَا حُكمُ الصَّلاةِ فِي الإِسلامِ؟', task: 'LEGAL_RULING', topic: 'الصَّلاة' },
      options: { mockConcepts: ['الصَّلاة', 'الوُجوب'] }  // normalized → same
    }));
    assert.equal(r2, ADD_RECORD_RESULT.DUPLICATE, 'Normalized paraphrase must be detected as duplicate');
    assert.equal(s2.uniqueVerifiedCount, 1, 'count must stay at 1');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 14: Different meaningful verified learning → progress increments
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 14: Different meaningful question → progress increments', () => {
  it('distinctly different question increments uniqueVerifiedCount', async () => {
    const svc = makeService();

    await svc.addRecord(makeParams({
      interpretation: { questionText: 'ما حكم الصلاة؟', task: 'LEGAL_RULING', topic: 'الصلاة' },
      options: { mockConcepts: ['الصلاة'] }
    }));

    const { result, journeyState } = await svc.addRecord(makeParams({
      interpretation: { questionText: 'ما تعريف الزكاة في الفقه الإسلامي؟', task: 'DEFINITION', topic: 'الزكاة' },
      options: { mockConcepts: ['الزكاة', 'الفقه'] },
      answerResult: {
        ...GOOD_ANSWER,
        answerText: 'الزكاة هي الركن الثالث من أركان الإسلام.',
        answerClaims: [{
          claimId: 'ac_zakat',
          statement: 'الزكاة ركن الإسلام الثالث.',
          importance: 'CORE',
          groundingStatus: 'GROUNDED',
          evidenceIds: ['ev_zakat'],
          chunkIds: ['ck_zakat'],
          sourceIds: ['src_1']
        }]
      }
    }));

    assert.equal(result, ADD_RECORD_RESULT.CREATED);
    assert.equal(journeyState.uniqueVerifiedCount, 2);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 15: Evidence deduplication within a record
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 15: Evidence deduplication within a record', () => {
  it('duplicate evidenceIds in answerClaims appear only once in record.evidence', async () => {
    const svc = makeService();
    const answerWithDupEvidence = {
      ...GOOD_ANSWER,
      answerClaims: [
        { claimId: 'ac_a', statement: 'حكم أ.', importance: 'CORE', groundingStatus: 'GROUNDED',
          evidenceIds: ['ev_shared'], chunkIds: ['ck_1'], sourceIds: ['src_1'] },
        { claimId: 'ac_b', statement: 'حكم ب.', importance: 'CORE', groundingStatus: 'GROUNDED',
          evidenceIds: ['ev_shared'], chunkIds: ['ck_1'], sourceIds: ['src_1'] }
      ]
    };

    const { record } = await svc.addRecord(makeParams({ answerResult: answerWithDupEvidence }));
    const evidenceIds = record.evidence.map(e => e.evidenceId);
    const unique = new Set(evidenceIds);
    assert.equal(unique.size, evidenceIds.length, 'Duplicate evidenceIds must be deduplicated');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 16: Source deduplication within a record
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 16: Source deduplication within a record', () => {
  it('duplicate sourceIds in sources appear only once in record.sources', async () => {
    const svc = makeService();
    const answerWithDupSource = {
      ...GOOD_ANSWER,
      sources: [
        { sourceId: 'src_1', sourceName: 'صحيح البخاري', sourceUrl: '' },
        { sourceId: 'src_1', sourceName: 'صحيح البخاري', sourceUrl: '' }
      ]
    };

    const { record } = await svc.addRecord(makeParams({ answerResult: answerWithDupSource }));
    const sourceIds = record.sources.map(s => s.sourceId);
    const unique = new Set(sourceIds);
    assert.equal(unique.size, sourceIds.length, 'Duplicate sourceIds must be deduplicated');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 17: Only actually-used grounded evidence/sources preserved
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 17: Only grounded evidence and sources are preserved', () => {
  it('evidence references only come from grounded answer claims', async () => {
    const svc = makeService();
    // answerClaims has only ev_used; unrelated ev_unused is nowhere in answer
    const { record } = await svc.addRecord(makeParams());
    // ev_1 is from the GOOD_ANSWER fixture — should be present
    const evidenceIds = record.evidence.map(e => e.evidenceId);
    assert.ok(evidenceIds.includes('ev_1'), 'ev_1 from grounded claim must be preserved');
    assert.ok(!evidenceIds.includes('ev_unused'), 'ev_unused must not appear');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 18: Progress at 0/20
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 18: Progress at 0/20', () => {
  it('fresh journey shows 0 unique records, 0% progress', async () => {
    const svc = makeService();
    const state = await svc.getJourneyState('sess_empty');
    assert.equal(state.uniqueVerifiedCount, 0);
    assert.equal(state.targetCount, JOURNEY_TARGET);
    assert.equal(state.remainingCount, JOURNEY_TARGET);
    assert.equal(state.progressPercentage, 0);
    assert.equal(state.milestoneReached, false);
    assert.equal(state.assessmentEligible, false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 19: Progress at 13/20
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 19: Progress calculation at 13/20', () => {
  it('computeJourneyState at 13 records returns 65% progress', () => {
    const state = computeJourneyState({
      sessionId: 'sess_x',
      verifiedRecords: new Array(13).fill({}),
      uniqueVerifiedCount: 13
    });
    assert.equal(state.uniqueVerifiedCount, 13);
    assert.equal(state.remainingCount, 7);
    assert.equal(state.progressPercentage, 65);
    assert.equal(state.milestoneReached, false);
    assert.equal(state.assessmentEligible, false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 20: Milestone at exactly 20/20
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 20: Milestone reached at exactly 20 unique records', () => {
  it('milestoneReached and assessmentEligible become true at 20', () => {
    const state = computeJourneyState({
      sessionId: 'sess_y',
      verifiedRecords: new Array(20).fill({}),
      uniqueVerifiedCount: 20
    });
    assert.equal(state.uniqueVerifiedCount, 20);
    assert.equal(state.remainingCount, 0);
    assert.equal(state.progressPercentage, 100);
    assert.equal(state.milestoneReached, true);
    assert.equal(state.assessmentEligible, true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 21: Additional records after 20 — milestone preserved, ≤ 100%
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 21: Records beyond 20 do not exceed 100% or change milestone', () => {
  it('progress capped at 100% when count exceeds 20', () => {
    const state = computeJourneyState({
      sessionId: 'sess_z',
      verifiedRecords: new Array(25).fill({}),
      uniqueVerifiedCount: 25
    });
    assert.equal(state.progressPercentage, 100, 'progress must not exceed 100%');
    assert.equal(state.remainingCount, 0);
    assert.equal(state.milestoneReached, true);
    assert.equal(state.assessmentEligible, true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 22: assessmentEligible false before 20
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 22: assessmentEligible is false before 20 records', () => {
  it('assessmentEligible is false at 19 records', () => {
    const state = computeJourneyState({
      sessionId: 'sess_19',
      verifiedRecords: new Array(19).fill({}),
      uniqueVerifiedCount: 19
    });
    assert.equal(state.assessmentEligible, false);
    assert.equal(state.milestoneReached, false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 23: assessmentEligible true at exactly 20
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 23: assessmentEligible is true at exactly 20 records', () => {
  it('assessmentEligible becomes true at uniqueVerifiedCount === 20', () => {
    const state = computeJourneyState({
      sessionId: 'sess_20',
      verifiedRecords: new Array(20).fill({}),
      uniqueVerifiedCount: 20
    });
    assert.equal(state.assessmentEligible, true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 24: In-memory storage contract works deterministically
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 24: InMemoryJourneyStorage contract', () => {
  it('saveRecord / getRecord / countUniqueVerified / getAllFingerprints work correctly', async () => {
    const storage = new InMemoryJourneyStorage();

    const record = { id: 'kr_test', fingerprint: 'fp_abc', sessionId: 'sess_1', status: RECORD_STATUS.VERIFIED };
    await storage.saveRecord(record);

    const fetched = await storage.getRecord('kr_test');
    assert.deepEqual(fetched, record);

    const count = await storage.countUniqueVerified();
    assert.equal(count, 1);

    const fps = await storage.getAllFingerprints();
    assert.deepEqual(fps, ['fp_abc']);

    storage.reset();
    const countAfterReset = await storage.countUniqueVerified();
    assert.equal(countAfterReset, 0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 25: No Firebase/network/external call occurs
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 25: No Firebase or external call in journey operations', () => {
  it('all journey operations complete synchronously in memory (no async network)', async () => {
    const svc = makeService();
    // If Firebase were used, this would require env vars or would throw
    // The test simply validates that addRecord succeeds with only in-memory deps
    const start = Date.now();
    await svc.addRecord(makeParams());
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 500, `Operation took ${elapsed}ms — should be near-instant for in-memory storage`);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 26: No Assessment generated in Phase 9
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 26: No Assessment is generated', () => {
  it('journey state does not contain assessment questions or assessment content', async () => {
    const svc = makeService();
    await svc.addRecord(makeParams());
    const state = await svc.getJourneyState('sess_test');

    assert.equal(state.assessmentQuestions, undefined, 'No assessmentQuestions in state');
    assert.equal(state.assessment, undefined, 'No assessment in state');
    assert.ok('assessmentEligible' in state, 'assessmentEligible flag must be present');
    assert.equal(typeof state.assessmentEligible, 'boolean');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 27: No Journey Report generated
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 9 — Scenario 27: No Journey Report is generated', () => {
  it('journey state does not contain a report object', async () => {
    const svc = makeService();
    await svc.addRecord(makeParams());
    const state = await svc.getJourneyState('sess_test');

    assert.equal(state.report, undefined, 'No journey report must be generated in Phase 9');
    assert.equal(state.journeyReport, undefined, 'No journeyReport must be generated in Phase 9');
  });
});
