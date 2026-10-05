/**
 * Mishkat Phase 8: Deep Learning — Deterministic Test Suite (18 scenarios)
 *
 * All tests are fully deterministic and mockable — no external API required.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

import { generateDeepLearningFollowUps, DeepLearningService } from '../src/mishkat/deeplearning/DeepLearningService.js';
import { normalizeArabic, deduplicateFollowUps } from '../src/mishkat/deeplearning/followUpDeduplicator.js';
import { checkDeepLearningActivation } from '../src/mishkat/deeplearning/activationGate.js';
import { DEEP_LEARNING_STATUS, FOLLOW_UP_ORIGIN, DEEP_LEARNING_CONFIG } from '../src/mishkat/deeplearning/deepLearningTypes.js';

// ── Shared fixtures ──────────────────────────────────────────────────────────

const GOOD_SUFFICIENCY = {
  sufficiencyId: 'suf_test',
  overallSufficiency: 'SUFFICIENT',
  routing: 'ANSWERED',
  claims: [
    {
      claimId: 'cl_1',
      status: 'SUPPORTED',
      supportingEvidence: [
        { evidenceId: 'ev_1', chunkId: 'ck_1', sourceId: 'src_1', supportsClaim: true }
      ]
    }
  ]
};

const GOOD_ANSWER = {
  answerStatus: 'ANSWERED',
  answerText: 'الحكم الشرعي في هذه المسألة هو الإباحة.',
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
  groundingVerification: {
    status: 'VERIFIED',
    isFullyGrounded: true,
    groundedClaims: 1,
    ungroundedClaims: 0
  },
  citations: [{ chunkId: 'ck_1', sourceId: 'src_1', sourceName: 'صحيح البخاري', text: 'نص الحديث' }],
  sources: [{ sourceId: 'src_1', sourceName: 'صحيح البخاري', sourceUrl: '' }]
};

const GOOD_INTERPRETATION = {
  questionText: 'ما حكم الصلاة في الإسلام؟',
  task: 'LEGAL_RULING',
  claimsToResolve: [{ claimId: 'cl_1', claim: 'الصلاة واجبة' }]
};

const MOCK_SUGGESTIONS = [
  {
    followUpId: 'fl_aaa01',
    question: 'ما شروط صحة الصلاة؟',
    origin: FOLLOW_UP_ORIGIN,
    parentRecordId: null,
    relatedOriginalClaimIds: ['cl_1'],
    relatedAnswerClaimIds: ['ac_1'],
    relatedEvidenceIds: ['ev_1'],
    relatedSourceIds: ['src_1'],
    rationale: 'استكشاف شروط الصلاة'
  },
  {
    followUpId: 'fl_aaa02',
    question: 'ما أركان الصلاة؟',
    origin: FOLLOW_UP_ORIGIN,
    parentRecordId: null,
    relatedOriginalClaimIds: ['cl_1'],
    relatedAnswerClaimIds: ['ac_1'],
    relatedEvidenceIds: ['ev_1'],
    relatedSourceIds: ['src_1'],
    rationale: 'استكشاف أركان الصلاة'
  },
  {
    followUpId: 'fl_aaa03',
    question: 'هل هناك خلاف بين العلماء في وجوب الصلاة؟',
    origin: FOLLOW_UP_ORIGIN,
    parentRecordId: null,
    relatedOriginalClaimIds: ['cl_1'],
    relatedAnswerClaimIds: ['ac_1'],
    relatedEvidenceIds: ['ev_1'],
    relatedSourceIds: ['src_1'],
    rationale: 'استكشاف الخلاف العلمي'
  }
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeParams(overrides = {}) {
  return {
    interpretation: GOOD_INTERPRETATION,
    sufficiencyResult: GOOD_SUFFICIENCY,
    answerResult: GOOD_ANSWER,
    options: { mockSuggestions: MOCK_SUGGESTIONS },
    ...overrides
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Scenario 1: Fully verified ANSWERED → suggestions allowed (SUCCESS)
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 8 — Scenario 1: Fully verified ANSWERED produces SUCCESS', () => {
  it('returns status SUCCESS with suggestions', async () => {
    const result = await generateDeepLearningFollowUps(makeParams());
    assert.equal(result.status, DEEP_LEARNING_STATUS.SUCCESS);
    assert.ok(Array.isArray(result.suggestions));
    assert.ok(result.suggestions.length >= DEEP_LEARNING_CONFIG.MIN_SUGGESTIONS);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 2: PARTIAL answer → GATED
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 8 — Scenario 2: PARTIAL answer routing → GATED', () => {
  it('returns GATED when routing is PARTIAL', async () => {
    const result = await generateDeepLearningFollowUps(makeParams({
      sufficiencyResult: { ...GOOD_SUFFICIENCY, overallSufficiency: 'PARTIAL', routing: 'PARTIAL' }
    }));
    assert.equal(result.status, DEEP_LEARNING_STATUS.GATED);
    assert.deepEqual(result.suggestions, []);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 3: INSUFFICIENT sufficiency → GATED
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 8 — Scenario 3: INSUFFICIENT sufficiency → GATED', () => {
  it('returns GATED when sufficiency is INSUFFICIENT', async () => {
    const result = await generateDeepLearningFollowUps(makeParams({
      sufficiencyResult: { ...GOOD_SUFFICIENCY, overallSufficiency: 'INSUFFICIENT', routing: 'INSUFFICIENT' }
    }));
    assert.equal(result.status, DEEP_LEARNING_STATUS.GATED);
    assert.deepEqual(result.suggestions, []);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 4: NEEDS_CLARIFICATION routing → GATED
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 8 — Scenario 4: NEEDS_CLARIFICATION routing → GATED', () => {
  it('returns GATED when routing is NEEDS_CLARIFICATION', async () => {
    const result = await generateDeepLearningFollowUps(makeParams({
      sufficiencyResult: { ...GOOD_SUFFICIENCY, routing: 'NEEDS_CLARIFICATION' }
    }));
    assert.equal(result.status, DEEP_LEARNING_STATUS.GATED);
    assert.deepEqual(result.suggestions, []);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 5: REFER_TO_AUTHORITY routing → GATED
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 8 — Scenario 5: REFER_TO_AUTHORITY routing → GATED', () => {
  it('returns GATED when routing is REFER_TO_AUTHORITY', async () => {
    const result = await generateDeepLearningFollowUps(makeParams({
      sufficiencyResult: { ...GOOD_SUFFICIENCY, routing: 'REFER_TO_AUTHORITY' }
    }));
    assert.equal(result.status, DEEP_LEARNING_STATUS.GATED);
    assert.deepEqual(result.suggestions, []);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 6: SERVICE_ERROR answerStatus → GATED
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 8 — Scenario 6: SERVICE_ERROR answerStatus → GATED', () => {
  it('returns GATED when answerStatus is SERVICE_ERROR', async () => {
    const result = await generateDeepLearningFollowUps(makeParams({
      answerResult: { ...GOOD_ANSWER, answerStatus: 'SERVICE_ERROR' }
    }));
    assert.equal(result.status, DEEP_LEARNING_STATUS.GATED);
    assert.deepEqual(result.suggestions, []);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 7: Failed grounding verification → GATED
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 8 — Scenario 7: Failed grounding verification → GATED', () => {
  it('returns GATED when isFullyGrounded is false', async () => {
    const result = await generateDeepLearningFollowUps(makeParams({
      answerResult: {
        ...GOOD_ANSWER,
        groundingVerification: { status: 'PARTIALLY_VERIFIED', isFullyGrounded: false, groundedClaims: 0, ungroundedClaims: 1 }
      }
    }));
    assert.equal(result.status, DEEP_LEARNING_STATUS.GATED);
  });

  it('returns GATED when grounding status is UNVERIFIED', async () => {
    const result = await generateDeepLearningFollowUps(makeParams({
      answerResult: {
        ...GOOD_ANSWER,
        groundingVerification: { status: 'UNVERIFIED', isFullyGrounded: false, groundedClaims: 0, ungroundedClaims: 1 }
      }
    }));
    assert.equal(result.status, DEEP_LEARNING_STATUS.GATED);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 8: Suggestions contain NO prefilled answers
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 8 — Scenario 8: Suggestions contain no prefilled answers', () => {
  it('each suggestion has only question text, no embedded answer/verdict fields', async () => {
    const result = await generateDeepLearningFollowUps(makeParams());
    for (const s of result.suggestions) {
      // Must NOT have answer, verdict, ruling, or conclusion fields
      assert.equal(s.answer, undefined, 'suggestion must not have answer field');
      assert.equal(s.verdict, undefined, 'suggestion must not have verdict field');
      assert.equal(s.ruling, undefined, 'suggestion must not have ruling field');
      assert.equal(s.conclusion, undefined, 'suggestion must not have conclusion field');
      assert.equal(typeof s.question, 'string', 'suggestion must have a question string');
      assert.ok(s.question.trim().length > 0, 'question must be non-empty');
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 9: Suggestions contain no unsupported verdict assumptions
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 8 — Scenario 9: Suggestions do not assert unsupported verdicts', () => {
  it('mock suggestions pass through without acquiring verdict fields', async () => {
    const result = await generateDeepLearningFollowUps(makeParams());
    assert.equal(result.status, DEEP_LEARNING_STATUS.SUCCESS);
    for (const s of result.suggestions) {
      // Question text must end with '?' (interrogative, not declarative verdict)
      const q = s.question.trim();
      assert.ok(q.endsWith('؟') || q.endsWith('?'),
        `Suggestion "${q}" must be a question (end with ؟ or ?)`);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 10: Exact duplicate suggestions removed
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 8 — Scenario 10: Exact duplicate suggestions are removed', () => {
  it('deduplicator removes exact duplicates', async () => {
    const dupSuggestions = [
      { followUpId: 'fl_d1', question: 'ما حكم الصوم؟', origin: FOLLOW_UP_ORIGIN, parentRecordId: null, relatedOriginalClaimIds: [], relatedAnswerClaimIds: [], relatedEvidenceIds: [], relatedSourceIds: [], rationale: '' },
      { followUpId: 'fl_d2', question: 'ما حكم الصوم؟', origin: FOLLOW_UP_ORIGIN, parentRecordId: null, relatedOriginalClaimIds: [], relatedAnswerClaimIds: [], relatedEvidenceIds: [], relatedSourceIds: [], rationale: '' }
    ];
    const result = await generateDeepLearningFollowUps(makeParams({
      options: { mockSuggestions: dupSuggestions }
    }));
    const questions = result.suggestions.map(s => s.question);
    const unique = new Set(questions);
    assert.equal(unique.size, questions.length, 'No exact duplicate questions should remain');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 11: Normalized duplicate suggestions removed
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 8 — Scenario 11: Normalized Arabic duplicates are removed', () => {
  it('deduplicator removes diacritic/hamza variant duplicates', () => {
    const original = 'ما حكم الصلاة؟';
    const suggestions = [
      { followUpId: 'fl_n1', question: 'ما حُكمُ الصَّلاةِ؟', origin: FOLLOW_UP_ORIGIN, parentRecordId: null, relatedOriginalClaimIds: [], relatedAnswerClaimIds: [], relatedEvidenceIds: [], relatedSourceIds: [], rationale: '' },
      { followUpId: 'fl_n2', question: 'ما حكم الصلاة؟', origin: FOLLOW_UP_ORIGIN, parentRecordId: null, relatedOriginalClaimIds: [], relatedAnswerClaimIds: [], relatedEvidenceIds: [], relatedSourceIds: [], rationale: '' }
    ];
    const { accepted, rejected } = deduplicateFollowUps(original, suggestions);
    // Both normalize to same text, and also match the original question
    // First should be rejected as duplicate of original, second ditto
    assert.equal(accepted.length + rejected.length, 2);
    // At minimum: not all should be accepted (some normalization rejection should occur)
    // The original question check should eliminate both
    assert.ok(accepted.length < 2, 'At least one normalized duplicate should be rejected');
  });

  it('normalizeArabic removes tashkeel and unifies hamza', () => {
    assert.equal(normalizeArabic('إِسْلامٌ'), normalizeArabic('اسلام'));
    assert.equal(normalizeArabic('أَحْكَامُ'), normalizeArabic('احكام'));
    assert.equal(normalizeArabic('آدَاب'), normalizeArabic('اداب'));
  });

  it('normalizeArabic unifies taa marbuta and alef maqsura', () => {
    assert.equal(normalizeArabic('الصلاة'), normalizeArabic('الصلاه'));
    assert.equal(normalizeArabic('على'), normalizeArabic('علي'));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 12: Original question not simply repeated
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 8 — Scenario 12: Original question is not repeated as a suggestion', () => {
  it('deduplicator rejects a suggestion that restates the original question', async () => {
    const originalQ = 'ما حكم الصلاة في الإسلام؟';
    const restatement = [
      { followUpId: 'fl_r1', question: originalQ, origin: FOLLOW_UP_ORIGIN, parentRecordId: null, relatedOriginalClaimIds: [], relatedAnswerClaimIds: [], relatedEvidenceIds: [], relatedSourceIds: [], rationale: '' }
    ];
    const result = await generateDeepLearningFollowUps(makeParams({
      interpretation: { ...GOOD_INTERPRETATION, questionText: originalQ },
      options: { mockSuggestions: restatement }
    }));
    // Should be EMPTY because restatement is rejected and only 0 suggestions remain
    assert.ok(
      result.status === DEEP_LEARNING_STATUS.EMPTY || result.suggestions.every(s => s.question !== originalQ),
      'Original question must not appear as a suggestion'
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 13: Grounding lineage preserved
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 8 — Scenario 13: Grounding lineage metadata preserved in suggestions', () => {
  it('suggestions carry relatedOriginalClaimIds, relatedAnswerClaimIds, relatedEvidenceIds, relatedSourceIds', async () => {
    const result = await generateDeepLearningFollowUps(makeParams());
    assert.equal(result.status, DEEP_LEARNING_STATUS.SUCCESS);
    for (const s of result.suggestions) {
      assert.ok(Array.isArray(s.relatedOriginalClaimIds), 'relatedOriginalClaimIds must be array');
      assert.ok(Array.isArray(s.relatedAnswerClaimIds), 'relatedAnswerClaimIds must be array');
      assert.ok(Array.isArray(s.relatedEvidenceIds), 'relatedEvidenceIds must be array');
      assert.ok(Array.isArray(s.relatedSourceIds), 'relatedSourceIds must be array');
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 14: origin === 'DEEP_LEARNING'
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 8 — Scenario 14: Every suggestion has origin === DEEP_LEARNING', () => {
  it('origin field equals DEEP_LEARNING constant', async () => {
    const result = await generateDeepLearningFollowUps(makeParams());
    assert.equal(result.status, DEEP_LEARNING_STATUS.SUCCESS);
    for (const s of result.suggestions) {
      assert.equal(s.origin, FOLLOW_UP_ORIGIN, `Expected origin ${FOLLOW_UP_ORIGIN}, got ${s.origin}`);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 15: parentRecordId contract — null, no Journey record created
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 8 — Scenario 15: parentRecordId is null (no Journey record created)', () => {
  it('all suggestions have parentRecordId === null', async () => {
    const result = await generateDeepLearningFollowUps(makeParams());
    assert.equal(result.status, DEEP_LEARNING_STATUS.SUCCESS);
    for (const s of result.suggestions) {
      assert.equal(s.parentRecordId, null, 'parentRecordId must be null — no Journey record created in Phase 8');
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 16: funnelFollowUpAsNewQuestion() produces plain question object
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 8 — Scenario 16: funnelFollowUpAsNewQuestion produces plain question object', () => {
  it('returns { question, origin, parentRecordId } with no shortcut pipeline fields', async () => {
    const service = new DeepLearningService();
    const suggestion = MOCK_SUGGESTIONS[0];
    const funneled = service.funnelFollowUpAsNewQuestion(suggestion);

    assert.equal(typeof funneled.question, 'string');
    assert.equal(funneled.question, suggestion.question);
    assert.equal(funneled.origin, FOLLOW_UP_ORIGIN);
    assert.equal(funneled.parentRecordId, null);

    // Must NOT include any shortcut pipeline fields
    assert.equal(funneled.answer, undefined);
    assert.equal(funneled.answerText, undefined);
    assert.equal(funneled.evidence, undefined);
    assert.equal(funneled.sufficiency, undefined);
    assert.equal(funneled.verified, undefined);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 17: No Knowledge Journey record / database mutation in Phase 8
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 8 — Scenario 17: No Knowledge Journey record created', () => {
  it('result object contains no journeyId, recordId, or journey-mutating fields', async () => {
    const result = await generateDeepLearningFollowUps(makeParams());
    assert.equal(result.journeyId, undefined, 'Must not create journeyId');
    assert.equal(result.recordId, undefined, 'Must not create recordId');
    assert.equal(result.journeyRecord, undefined, 'Must not create journeyRecord');
    for (const s of result.suggestions) {
      assert.equal(s.journeyId, undefined);
      assert.equal(s.journeyRecord, undefined);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Scenario 18: AI generation boundary is mockable (no external API required)
// ════════════════════════════════════════════════════════════════════════════
describe('Phase 8 — Scenario 18: AI generation boundary is mockable', () => {
  it('accepts options.mockSuggestions and does not call external API', async () => {
    let externalCallMade = false;
    const result = await generateDeepLearningFollowUps({
      interpretation: GOOD_INTERPRETATION,
      sufficiencyResult: GOOD_SUFFICIENCY,
      answerResult: GOOD_ANSWER,
      options: {
        mockSuggestions: MOCK_SUGGESTIONS,
        generatorOverride: async () => {
          externalCallMade = true; // This should NOT be called when mockSuggestions is set
          return [];
        }
      }
    });
    assert.equal(externalCallMade, false, 'generatorOverride must not be called when mockSuggestions is provided');
    assert.equal(result.status, DEEP_LEARNING_STATUS.SUCCESS);
  });

  it('accepts options.generatorOverride for DI / future Gemini integration', async () => {
    let overrideCalled = false;
    const customSuggestions = [
      {
        followUpId: 'fl_override_1',
        question: 'ما الحكم الشرعي للزكاة؟',
        origin: FOLLOW_UP_ORIGIN,
        parentRecordId: null,
        relatedOriginalClaimIds: [],
        relatedAnswerClaimIds: [],
        relatedEvidenceIds: [],
        relatedSourceIds: [],
        rationale: 'custom generator'
      }
    ];
    const result = await generateDeepLearningFollowUps({
      interpretation: GOOD_INTERPRETATION,
      sufficiencyResult: GOOD_SUFFICIENCY,
      answerResult: GOOD_ANSWER,
      options: {
        generatorOverride: async (ctx, opts) => {
          overrideCalled = true;
          return customSuggestions;
        }
      }
    });
    assert.equal(overrideCalled, true, 'generatorOverride must be called when no mockSuggestions');
    assert.equal(result.status, DEEP_LEARNING_STATUS.SUCCESS);
    assert.equal(result.suggestions[0].question, 'ما الحكم الشرعي للزكاة؟');
  });
});
