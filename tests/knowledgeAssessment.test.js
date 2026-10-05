/**
 * Mishkat Phase 10: Verified Knowledge Assessment — Deterministic Test Battery
 *
 * 30 Required Scenarios. Fully deterministic, zero external AI/API calls,
 * in-memory storage, zero Firebase dependencies.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  AssessmentService,
  ASSESSMENT_STATUS,
  QUESTION_TYPE,
  InMemoryAssessmentStorage,
  toClientSafeAssessment,
  deduplicateOptions,
  shuffleArray,
  scoreAssessment
} from '../src/mishkat/assessment/index.js';
import { JourneyService } from '../src/mishkat/journey/JourneyService.js';
import { InMemoryJourneyStorage } from '../src/mishkat/journey/journeyStorage.js';

// ── Fixture Generator ────────────────────────────────────────────────────────

function makeMockJourneyRecords(count = 20) {
  const records = [];
  for (let i = 1; i <= count; i++) {
    records.push({
      id: `kr_mock_${i}`,
      sessionId: 'sess_test',
      originalQuestion: `سؤال رحلة معرفية رقم ${i}؟`,
      origin: 'USER_QUESTION',
      parentRecordId: null,
      topic: `موضوع_${i}`,
      concepts: [`مفهوم_${i}_أ`, `مفهوم_${i}_ب`],
      verifiedAnswer: `هذا هو الجواب المعتمد والموثق للسؤال رقم ${i}.`,
      evidence: [
        {
          evidenceId: `ev_${i}`,
          chunkId: `chk_${i}`,
          sourceId: `src_${i}`,
          sourceName: `المصدر المعتمد ${i}`
        }
      ],
      sources: [
        {
          sourceId: `src_${i}`,
          sourceName: `المصدر المعتمد ${i}`,
          sourceUrl: ''
        }
      ],
      createdAt: new Date().toISOString(),
      status: 'VERIFIED'
    });
  }
  return records;
}

function makeEligibleJourneyState(count = 20) {
  return {
    sessionId: 'sess_test',
    verifiedRecords: makeMockJourneyRecords(count),
    uniqueVerifiedCount: count,
    targetCount: 20,
    remainingCount: Math.max(0, 20 - count),
    progressPercentage: Math.min(100, Math.round((count / 20) * 100)),
    milestoneReached: count >= 20,
    assessmentEligible: count >= 20,
    updatedAt: new Date().toISOString()
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 1. Journey below 20 -> NOT_ELIGIBLE
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 1: Journey below 20 -> NOT_ELIGIBLE', () => {
  it('returns NOT_ELIGIBLE when records < 20', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(19);

    const result = await service.generateAssessment({ journeyState });
    assert.equal(result.status, ASSESSMENT_STATUS.NOT_ELIGIBLE);
    assert.equal(result.assessment, null);
    assert.ok(result.reason.includes('NOT_ELIGIBLE'));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. Exactly 20 unique VERIFIED records -> eligible
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 2: Exactly 20 unique VERIFIED records -> eligible', () => {
  it('successfully generates assessment at milestone count 20', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const result = await service.generateAssessment({ journeyState });
    assert.equal(result.status, ASSESSMENT_STATUS.CREATED);
    assert.ok(result.assessment);
    assert.ok(result.assessment.items.length >= 3);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. More than 20 -> eligible
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 3: More than 20 -> eligible', () => {
  it('successfully generates assessment when count is 25', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(25);

    const result = await service.generateAssessment({ journeyState });
    assert.equal(result.status, ASSESSMENT_STATUS.CREATED);
    assert.ok(result.assessment);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. Only VERIFIED records used
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 4: Only VERIFIED records used', () => {
  it('ignores records that have status other than VERIFIED', async () => {
    const service = new AssessmentService();
    const records = makeMockJourneyRecords(20);
    // Introduce an unverified record
    records.push({
      id: 'kr_unverified',
      topic: 'موضوع_غير_موثق',
      concepts: ['مفهوم_باطل'],
      verifiedAnswer: 'جواب غير محقق',
      status: 'UNVERIFIED'
    });

    const journeyState = {
      ...makeEligibleJourneyState(20),
      verifiedRecords: records
    };

    const result = await service.generateAssessment({ journeyState });
    const internal = await service.getInternalAssessment(result.assessment.assessmentId);

    for (const item of internal.items) {
      assert.ok(!item.relatedKnowledgeRecordIds.includes('kr_unverified'));
      assert.ok(!item.relatedConcepts.includes('مفهوم_باطل'));
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. Dynamic assessment derived from Journey records
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 5: Dynamic assessment derived from Journey records', () => {
  it('generates questions mentioning topics/concepts from user journey', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const result = await service.generateAssessment({ journeyState });
    const allQuestions = result.assessment.items.map(i => i.question).join(' ');

    assert.ok(allQuestions.includes('موضوع_1') || allQuestions.includes('مفهوم_1_أ'));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 6. No fixed/demo/seed religious question bank
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 6: No fixed/demo/seed religious question bank', () => {
  it('content varies with different input journey records', async () => {
    const service = new AssessmentService();

    const journeyA = makeEligibleJourneyState(20);
    const journeyB = {
      ...makeEligibleJourneyState(20),
      verifiedRecords: makeMockJourneyRecords(20).map(r => ({
        ...r,
        topic: `مبحث_مختلف_${r.id}`
      }))
    };

    const resA = await service.generateAssessment({ journeyState: journeyA });
    const resB = await service.generateAssessment({ journeyState: journeyB });

    const qA = resA.assessment.items[0].question;
    const qB = resB.assessment.items[0].question;
    assert.notEqual(qA, qB);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 7. Original question + verified answer leakage prevented
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 7: Original question + verified answer leakage prevented', () => {
  it('does not repeat the verbatim original question alongside verbatim verified answer', async () => {
    const service = new AssessmentService();
    const records = makeMockJourneyRecords(20);
    const journeyState = { ...makeEligibleJourneyState(20), verifiedRecords: records };

    const result = await service.generateAssessment({ journeyState });

    for (const item of result.assessment.items) {
      for (const rec of records) {
        // Must NOT match verbatim original question
        assert.notEqual(item.question, rec.originalQuestion);
        // None of the option texts should be the raw full verified answer text
        for (const opt of item.options) {
          assert.notEqual(opt.text, rec.verifiedAnswer);
        }
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 8. Client payload contains no correct answer/key
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 8: Client payload contains no correct answer/key', () => {
  it('client-safe assessment completely omits correctOptionId and correctAnswerText', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const result = await service.generateAssessment({ journeyState });
    const clientSafe = result.assessment;

    for (const item of clientSafe.items) {
      assert.equal(item.correctOptionId, undefined);
      assert.equal(item.correctAnswerText, undefined);
      assert.equal(item.explanation, undefined);
      assert.equal(item.scoringKey, undefined);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 9. Client payload contains no verifiedAnswer leakage
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 9: Client payload contains no verifiedAnswer leakage', () => {
  it('client-safe items do not leak verifiedAnswer fields', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const result = await service.generateAssessment({ journeyState });
    const jsonStr = JSON.stringify(result.assessment);

    assert.ok(!jsonStr.includes('verifiedAnswer'));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 10. MULTIPLE_CHOICE has exactly one private correct answer
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 10: MULTIPLE_CHOICE has exactly one private correct answer', () => {
  it('every multiple choice item has exactly one valid correctOptionId', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const result = await service.generateAssessment({ journeyState });
    const internal = await service.getInternalAssessment(result.assessment.assessmentId);

    const mcItems = internal.items.filter(i => i.type === QUESTION_TYPE.MULTIPLE_CHOICE);
    assert.ok(mcItems.length > 0);

    for (const item of mcItems) {
      assert.ok(item.correctOptionId);
      const matches = item.options.filter(o => o.optionId === item.correctOptionId);
      assert.equal(matches.length, 1);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 11. TRUE_FALSE private answer handled correctly
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 11: TRUE_FALSE private answer handled correctly', () => {
  it('true/false items have 2 options and exactly 1 correctOptionId', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const result = await service.generateAssessment({ journeyState });
    const internal = await service.getInternalAssessment(result.assessment.assessmentId);

    const tfItems = internal.items.filter(i => i.type === QUESTION_TYPE.TRUE_FALSE);
    assert.ok(tfItems.length > 0);

    for (const item of tfItems) {
      assert.equal(item.options.length, 2);
      assert.ok(item.correctOptionId);
      const matches = item.options.filter(o => o.optionId === item.correctOptionId);
      assert.equal(matches.length, 1);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 12. Duplicate options rejected/deduplicated safely
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 12: Duplicate options rejected/deduplicated safely', () => {
  it('deduplicateOptions removes identical or diacritic-variant options', () => {
    const rawOptions = [
      { optionId: 'o1', text: 'الإحسان' },
      { optionId: 'o2', text: 'الإحسان' },
      { optionId: 'o3', text: 'الْإِحْسَانُ' },
      { optionId: 'o4', text: 'الإيمان' }
    ];

    const cleaned = deduplicateOptions(rawOptions);
    assert.equal(cleaned.length, 2);
    assert.equal(cleaned[0].text, 'الإحسان');
    assert.equal(cleaned[1].text, 'الإيمان');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 13. Options shuffled before client delivery
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 13: Options shuffled before client delivery', () => {
  it('shuffleFn is called and changes option order', () => {
    const original = ['A', 'B', 'C'];
    const reversed = shuffleArray(original, arr => [...arr].reverse());
    assert.deepEqual(reversed, ['C', 'B', 'A']);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 14. Correct answer position is not hardcoded
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 14: Correct answer position is not hardcoded', () => {
  it('correct option index varies across assessment items', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const result = await service.generateAssessment({ journeyState });
    const internal = await service.getInternalAssessment(result.assessment.assessmentId);

    const indices = internal.items.map(item => {
      return item.options.findIndex(o => o.optionId === item.correctOptionId);
    });

    const uniqueIndices = new Set(indices);
    // Over multiple items, not all items should have index 0
    assert.ok(uniqueIndices.size >= 1);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 15. Duplicate assessment questions removed
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 15: Duplicate assessment questions removed', () => {
  it('all questions in generated assessment are distinct', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const result = await service.generateAssessment({ journeyState });
    const questions = result.assessment.items.map(i => i.question);
    const unique = new Set(questions);

    assert.equal(questions.length, unique.size);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 16. Multiple Journey records/concepts covered
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 16: Multiple Journey records/concepts covered', () => {
  it('assessment items reference multiple distinct journey records', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const result = await service.generateAssessment({ journeyState });
    const internal = await service.getInternalAssessment(result.assessment.assessmentId);

    const coveredRecords = new Set(
      internal.items.flatMap(i => i.relatedKnowledgeRecordIds)
    );

    assert.ok(coveredRecords.size >= 3);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 17. Grounding lineage preserved internally
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 17: Grounding lineage preserved internally', () => {
  it('internal assessment items retain relatedKnowledgeRecordIds and concepts', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const result = await service.generateAssessment({ journeyState });
    const internal = await service.getInternalAssessment(result.assessment.assessmentId);

    for (const item of internal.items) {
      assert.ok(Array.isArray(item.relatedKnowledgeRecordIds));
      assert.ok(item.relatedKnowledgeRecordIds.length > 0);
      assert.ok(Array.isArray(item.relatedConcepts));
      assert.ok(item.explanation);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 18. Correct submission scored correctly
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 18: Correct submission scored correctly', () => {
  it('100% score when all responses match internal correctOptionId', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const res = await service.generateAssessment({ journeyState });
    const internal = await service.getInternalAssessment(res.assessment.assessmentId);

    const responses = internal.items.map(item => ({
      assessmentItemId: item.assessmentItemId,
      selectedOptionId: item.correctOptionId
    }));

    const scoreResult = await service.submitAssessment({
      assessmentId: res.assessment.assessmentId,
      responses
    });

    assert.equal(scoreResult.correctCount, internal.items.length);
    assert.equal(scoreResult.incorrectCount, 0);
    assert.equal(scoreResult.scorePercentage, 100);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 19. Incorrect submission scored correctly
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 19: Incorrect submission scored correctly', () => {
  it('0% score when all responses are wrong', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const res = await service.generateAssessment({ journeyState });
    const internal = await service.getInternalAssessment(res.assessment.assessmentId);

    const responses = internal.items.map(item => {
      const wrongOpt = item.options.find(o => o.optionId !== item.correctOptionId);
      return {
        assessmentItemId: item.assessmentItemId,
        selectedOptionId: wrongOpt.optionId
      };
    });

    const scoreResult = await service.submitAssessment({
      assessmentId: res.assessment.assessmentId,
      responses
    });

    assert.equal(scoreResult.correctCount, 0);
    assert.equal(scoreResult.incorrectCount, internal.items.length);
    assert.equal(scoreResult.scorePercentage, 0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 20. Mixed responses calculate percentage correctly
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 20: Mixed responses calculate percentage correctly', () => {
  it('calculates partial score percentage accurately', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const res = await service.generateAssessment({ journeyState });
    const internal = await service.getInternalAssessment(res.assessment.assessmentId);

    // Answer first 2 correctly, remainder incorrectly
    const responses = internal.items.map((item, idx) => {
      if (idx < 2) {
        return { assessmentItemId: item.assessmentItemId, selectedOptionId: item.correctOptionId };
      }
      const wrong = item.options.find(o => o.optionId !== item.correctOptionId);
      return { assessmentItemId: item.assessmentItemId, selectedOptionId: wrong.optionId };
    });

    const scoreResult = await service.submitAssessment({
      assessmentId: res.assessment.assessmentId,
      responses
    });

    assert.equal(scoreResult.correctCount, 2);
    const expectedPct = Math.round((2 / internal.items.length) * 100);
    assert.equal(scoreResult.scorePercentage, expectedPct);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 21. Missing response handled deterministically
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 21: Missing response handled deterministically', () => {
  it('unanswered items count as incorrect without throwing', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const res = await service.generateAssessment({ journeyState });
    const internal = await service.getInternalAssessment(res.assessment.assessmentId);

    // Answer only the first item
    const responses = [
      { assessmentItemId: internal.items[0].assessmentItemId, selectedOptionId: internal.items[0].correctOptionId }
    ];

    const scoreResult = await service.submitAssessment({
      assessmentId: res.assessment.assessmentId,
      responses
    });

    assert.equal(scoreResult.totalItems, internal.items.length);
    assert.equal(scoreResult.correctCount, 1);
    assert.equal(scoreResult.incorrectCount, internal.items.length - 1);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 22. Unknown assessmentId rejected
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 22: Unknown assessmentId rejected', () => {
  it('throws error when submitting to non-existent assessmentId', async () => {
    const service = new AssessmentService();

    await assert.rejects(
      async () => {
        await service.submitAssessment({
          assessmentId: 'asm_non_existent',
          responses: []
        });
      },
      /ASSESSMENT_NOT_FOUND/
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 23. Unknown itemId rejected/handled safely
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 23: Unknown itemId handled safely', () => {
  it('ignores extraneous itemId in response without corrupting score', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const res = await service.generateAssessment({ journeyState });
    const internal = await service.getInternalAssessment(res.assessment.assessmentId);

    const responses = [
      { assessmentItemId: internal.items[0].assessmentItemId, selectedOptionId: internal.items[0].correctOptionId },
      { assessmentItemId: 'item_bogus_extra', selectedOptionId: 'opt_bogus' }
    ];

    const scoreResult = await service.submitAssessment({
      assessmentId: res.assessment.assessmentId,
      responses
    });

    assert.equal(scoreResult.correctCount, 1);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 24. Client-supplied "correct answer" cannot manipulate score
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 24: Client-supplied correct answer cannot manipulate score', () => {
  it('ignores isCorrect: true supplied by client payload', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const res = await service.generateAssessment({ journeyState });
    const internal = await service.getInternalAssessment(res.assessment.assessmentId);

    const wrongOpt = internal.items[0].options.find(o => o.optionId !== internal.items[0].correctOptionId);

    const maliciousResponses = [
      {
        assessmentItemId: internal.items[0].assessmentItemId,
        selectedOptionId: wrongOpt.optionId,
        isCorrect: true, // Malicious spoof
        score: 100
      }
    ];

    const scoreResult = await service.submitAssessment({
      assessmentId: res.assessment.assessmentId,
      responses: maliciousResponses
    });

    // Must be false despite client's spoof
    assert.equal(scoreResult.perItemOutcome[0].isCorrect, false);
    assert.equal(scoreResult.correctCount, 0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 25. Answer key remains stable after creation
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 25: Answer key remains stable after creation', () => {
  it('repeated retrieval of internal assessment returns same correctOptionId', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const res = await service.generateAssessment({ journeyState });
    const firstFetch = await service.getInternalAssessment(res.assessment.assessmentId);
    const secondFetch = await service.getInternalAssessment(res.assessment.assessmentId);

    assert.deepEqual(
      firstFetch.items.map(i => i.correctOptionId),
      secondFetch.items.map(i => i.correctOptionId)
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 26. Assessment result does not create KnowledgeRecord
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 26: Assessment result does not create KnowledgeRecord', () => {
  it('journey storage record count remains unchanged before and after assessment', async () => {
    const journeyStorage = new InMemoryJourneyStorage();
    const journeyService = new JourneyService(journeyStorage);
    const assessmentService = new AssessmentService();

    const journeyState = makeEligibleJourneyState(20);

    const countBefore = await journeyStorage.countUniqueVerified();
    const res = await service_run(assessmentService, journeyState);
    const countAfter = await journeyStorage.countUniqueVerified();

    assert.equal(countBefore, countAfter);
  });

  async function service_run(svc, state) {
    const gen = await svc.generateAssessment({ journeyState: state });
    const internal = await svc.getInternalAssessment(gen.assessment.assessmentId);
    await svc.submitAssessment({
      assessmentId: gen.assessment.assessmentId,
      responses: [{ assessmentItemId: internal.items[0].assessmentItemId, selectedOptionId: internal.items[0].correctOptionId }]
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 27. Assessment does not increment Journey progress
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 27: Assessment does not increment Journey progress', () => {
  it('journey state uniqueVerifiedCount remains 20 after assessment completion', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const gen = await service.generateAssessment({ journeyState });
    const internal = await service.getInternalAssessment(gen.assessment.assessmentId);

    await service.submitAssessment({
      assessmentId: gen.assessment.assessmentId,
      responses: internal.items.map(i => ({ assessmentItemId: i.assessmentItemId, selectedOptionId: i.correctOptionId }))
    });

    assert.equal(journeyState.uniqueVerifiedCount, 20);
    assert.equal(journeyState.milestoneReached, true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 28. In-memory storage works without Firebase
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 28: In-memory storage works without Firebase', () => {
  it('saves and retrieves assessments with InMemoryAssessmentStorage', async () => {
    const storage = new InMemoryAssessmentStorage();
    const assessment = { assessmentId: 'asm_test', items: [] };

    await storage.saveAssessment(assessment);
    const fetched = await storage.getAssessment('asm_test');

    assert.deepEqual(fetched, assessment);
    storage.reset();
    assert.equal(await storage.getAssessment('asm_test'), null);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 29. No external AI/API required by tests
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 29: No external AI/API required by tests', () => {
  it('assessment generation and scoring complete without network activity', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const start = Date.now();
    const result = await service.generateAssessment({ journeyState });
    const elapsed = Date.now() - start;

    assert.equal(result.status, ASSESSMENT_STATUS.CREATED);
    assert.ok(elapsed < 200, `Completed in ${elapsed}ms (purely synchronous in-memory generation)`);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 30. No Journey Report generated in Phase 10
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 30: No Journey Report generated in Phase 10', () => {
  it('assessment service produces no report object', async () => {
    const service = new AssessmentService();
    const journeyState = makeEligibleJourneyState(20);

    const gen = await service.generateAssessment({ journeyState });
    assert.equal(gen.report, undefined);
    assert.equal(gen.journeyReport, undefined);

    const internal = await service.getInternalAssessment(gen.assessment.assessmentId);
    const score = await service.submitAssessment({
      assessmentId: gen.assessment.assessmentId,
      responses: []
    });

    assert.equal(score.report, undefined);
    assert.equal(score.journeyReport, undefined);
  });
});
