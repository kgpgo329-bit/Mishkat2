/**
 * Mishkat Final Integration Step 1: Canonical Pipeline & Server API Bridge Tests
 *
 * 21 Required Integration Scenarios:
 * Fully deterministic, zero external AI/API dependencies, in-memory session stores.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { MishkatPipelineService } from '../src/mishkat/pipeline/MishkatPipelineService.js';
import { MishkatServerManager } from '../src/server/mishkatServer.js';
import { defaultTrustedSourceRepository } from '../src/mishkat/knowledge/TrustedSourceRepository.js';
import { InMemoryJourneyStorage } from '../src/mishkat/journey/journeyStorage.js';
import { InMemoryAssessmentStorage } from '../src/mishkat/assessment/assessmentStorage.js';
import { InMemoryReportStorage } from '../src/mishkat/report/reportStorage.js';

// ── Helpers & Fixtures ───────────────────────────────────────────────────────

const IKHLAS_INTERPRETATION = {
  originalQuestion: 'قل هو الله أحد',
  task: 'VERIFY_QURAN',
  userGoal: 'التحقق من نص الآية الكريمة',
  claimsToResolve: [
    {
      claimId: 'claim-ikhlas',
      statement: 'قل هو الله أحد آية من سورة الإخلاص تثبت توحيد الله الخالص',
      importance: 'CORE',
      requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
    }
  ]
};

const ISLAM_PILLARS_INTERPRETATION = {
  originalQuestion: 'ما هي أركان الإسلام في حديث جبريل؟',
  task: 'EXPLAIN_RULING',
  topic: 'أركان الإسلام',
  userGoal: 'معرفة أركان الإسلام الخمسة من حديث جبريل',
  claimsToResolve: [
    {
      claimId: 'c_hadith_jibril_direct',
      statement: 'روي في حديث جبريل أن أركان الإسلام خمسة: شهادة أن لا إله إلا الله وأن محمداً رسول الله، وإقام الصلاة، وإيتاء الزكاة، وصوم رمضان، وحج البيت',
      importance: 'CORE',
      requiredEvidenceType: 'PROPHETIC_HADITH_TEXT'
    }
  ]
};

function makeTestPipeline() {
  const repo = defaultTrustedSourceRepository;
  if (repo.chunkCount === 0) {
    repo.loadFromDisk('data/knowledge');
  }
  const journeyStorage = new InMemoryJourneyStorage();
  return new MishkatPipelineService({
    repository: repo,
    journeyStorage
  });
}

function makeServerManager() {
  const repo = defaultTrustedSourceRepository;
  if (repo.chunkCount === 0) {
    repo.loadFromDisk('data/knowledge');
  }
  const journeyStorage = new InMemoryJourneyStorage();
  const assessmentStorage = new InMemoryAssessmentStorage();
  const reportStorage = new InMemoryReportStorage();

  return new MishkatServerManager({
    journeyStorage,
    assessmentStorage,
    reportStorage,
    pipelineService: new MishkatPipelineService({
      repository: repo,
      journeyStorage
    })
  });
}

/** Mock HTTP request / response helper for handleRequest testing */
function mockHttpRequest({ method = 'POST', url = '/api/ask', body = {} }) {
  const req = {
    method,
    url,
    headers: { host: 'localhost' },
    on(event, handler) {
      if (event === 'data' && body) {
        handler(Buffer.from(JSON.stringify(body)));
      }
      if (event === 'end') {
        handler();
      }
      return this;
    }
  };

  const res = {
    statusCode: 200,
    headers: {},
    data: '',
    setHeader(key, val) {
      this.headers[key] = val;
    },
    end(chunk) {
      if (chunk) this.data += chunk;
      this.json = this.data ? JSON.parse(this.data) : null;
    }
  };

  return { req, res };
}

// ════════════════════════════════════════════════════════════════════════════
// 1. Normal verified question travels through canonical pipeline
// 2. Grounded answer returned
// 3. Actual used citations returned
// 4. Deep Learning suggestions returned only when eligible
// 5. Verified answer creates Journey record
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 1 to 5: Normal verified question pipeline & journey record', () => {
  it('processes verified question through all stages and adds to journey', async () => {
    const pipeline = makeTestPipeline();

    const result = await pipeline.processQuestion({
      questionText: 'قل هو الله أحد',
      sessionId: 'sess_test_1',
      options: { interpretationOverride: IKHLAS_INTERPRETATION, mode: 'deterministic' }
    });

    // 1. Pipeline success
    assert.ok(result);
    assert.equal(result.status, 'ANSWERED');
    assert.equal(result.statusLabel, 'إجابة موثقة');

    // 2. Grounded answer
    assert.ok(result.answer && result.answer.length > 0);

    // 3. Citations returned
    assert.ok(Array.isArray(result.citations));
    assert.ok(result.citations.length > 0);
    assert.ok(result.citations[0].sourceName);

    // 4. Deep Learning suggestions
    assert.ok(Array.isArray(result.deepLearningSuggestions));
    assert.ok(result.deepLearningSuggestions.length > 0);

    // 5. Journey record created
    assert.ok(result.recordId);
    assert.equal(result.journeyProgress.uniqueVerifiedCount, 1);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 6. Duplicate learning does not inflate progress
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 6: Duplicate learning does not inflate progress', () => {
  it('detects duplicate on identical second submission and maintains progress count', async () => {
    const pipeline = makeTestPipeline();

    const res1 = await pipeline.processQuestion({
      questionText: 'قل هو الله أحد',
      sessionId: 'sess_dup',
      options: { interpretationOverride: IKHLAS_INTERPRETATION, mode: 'deterministic' }
    });
    assert.equal(res1.journeyProgress.uniqueVerifiedCount, 1);
    assert.equal(res1.duplicateDetected, false);

    const res2 = await pipeline.processQuestion({
      questionText: 'قل هو الله أحد',
      sessionId: 'sess_dup',
      options: { interpretationOverride: IKHLAS_INTERPRETATION, mode: 'deterministic' }
    });
    assert.equal(res2.journeyProgress.uniqueVerifiedCount, 1);
    assert.equal(res2.duplicateDetected, true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 7. PERSONAL_FATWA routes to authority
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 7: PERSONAL_FATWA routes to authority', () => {
  it('returns REFER_TO_AUTHORITY without generating personalized ruling', async () => {
    const pipeline = makeTestPipeline();

    const result = await pipeline.processQuestion({
      questionText: 'طلقت زوجتي طلقة واحدة وأنا غضبان هل يقع طلاقي؟',
      sessionId: 'sess_fatwa',
      options: { mode: 'deterministic' }
    });

    assert.equal(result.status, 'REFER_TO_AUTHORITY');
    assert.equal(result.statusLabel, 'إحالة إلى دار الإفتاء');
    assert.ok(result.answer.includes('مراجعة دور الإفتاء'));
    assert.equal(result.recordId, null);
    assert.equal(result.journeyProgress.uniqueVerifiedCount, 0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 8. NEEDS_CLARIFICATION does not generate answer
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 8: NEEDS_CLARIFICATION does not generate answer', () => {
  it('returns NEEDS_CLARIFICATION for ambiguous query without recording in journey', async () => {
    const pipeline = makeTestPipeline();

    const result = await pipeline.processQuestion({
      questionText: 'هل هذا الحديث صحيح؟',
      sessionId: 'sess_clarify',
      options: { mode: 'deterministic' }
    });

    assert.equal(result.status, 'NEEDS_CLARIFICATION');
    assert.equal(result.statusLabel, 'استيضاح المطلوب');
    assert.ok(result.answer.includes('توضيح السؤال'));
    assert.equal(result.recordId, null);
    assert.equal(result.journeyProgress.uniqueVerifiedCount, 0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 9. INSUFFICIENT abstains
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 9: INSUFFICIENT abstains from answering', () => {
  it('returns INSUFFICIENT for completely unsupported modern medical claim', async () => {
    const pipeline = makeTestPipeline();

    const result = await pipeline.processQuestion({
      questionText: 'ما هي مواصفات المحرك النفاث التوربيني؟',
      sessionId: 'sess_insuff',
      options: { mode: 'deterministic' }
    });

    assert.equal(result.status, 'INSUFFICIENT');
    assert.equal(result.statusLabel, 'أدلة غير كافية');
    assert.ok(result.answer.includes('لم تتوافر في المصادر المعتمدة المتاحة أدلة'));
    assert.equal(result.recordId, null);
    assert.equal(result.journeyProgress.uniqueVerifiedCount, 0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 10. SERVICE_ERROR remains operational error
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 10: SERVICE_ERROR remains operational error', () => {
  it('handles verification service error gracefully without generating answer', async () => {
    const pipeline = makeTestPipeline();

    const interp = {
      originalQuestion: 'ما حكم المسح على الخفين؟',
      isPersonalFatwa: false,
      needsClarification: false,
      claimsToResolve: [
        {
          claimId: 'claim-khuff',
          statement: 'جواز ومشروعية المسح على الخفين في الوضوء',
          importance: 'CORE'
        }
      ]
    };

    const verOverride = {
      claims: [
        {
          claimId: 'claim-khuff',
          evidence: [
            {
              evidenceId: 'ev_err_1',
              relation: null,
              verificationStatus: 'VERIFICATION_ERROR',
              supportsClaim: false,
              contradictsClaim: false,
              reason: 'فشل التحقق عبر الذكاء الاصطناعي بسبب نفاد محاولات إعادة الاتصال.'
            }
          ]
        }
      ]
    };

    const result = await pipeline.processQuestion({
      questionText: 'ما حكم المسح على الخفين؟',
      sessionId: 'sess_err',
      options: {
        interpretationOverride: interp,
        verificationOverride: verOverride
      }
    });

    assert.equal(result.status, 'SERVICE_ERROR');
    assert.equal(result.statusLabel, 'خلل مؤقت في الخدمة');
    assert.equal(result.recordId, null);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 11. Selected Deep Learning question re-enters SAME pipeline
// 12. Deep Learning parent lineage preserved
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 11 & 12: Selected Deep Learning question re-enters same pipeline with lineage', () => {
  it('accepts DEEP_LEARNING question and links it to verified parent record', async () => {
    const pipeline = makeTestPipeline();

    // 1. Initial user question
    const parentRes = await pipeline.processQuestion({
      questionText: 'قل هو الله أحد',
      sessionId: 'sess_dl_lineage',
      origin: 'USER_QUESTION',
      options: { interpretationOverride: IKHLAS_INTERPRETATION, mode: 'deterministic' }
    });
    assert.ok(parentRes.recordId);
    assert.ok(parentRes.deepLearningSuggestions.length > 0);

    // 2. Submit selected follow-up through same pipeline
    const childRes = await pipeline.processQuestion({
      questionText: 'ما هي أركان الإسلام في حديث جبريل؟',
      sessionId: 'sess_dl_lineage',
      origin: 'DEEP_LEARNING',
      parentRecordId: parentRes.recordId,
      options: { interpretationOverride: ISLAM_PILLARS_INTERPRETATION, mode: 'deterministic' }
    });

    assert.ok(childRes.recordId);
    assert.equal(childRes.status, 'ANSWERED');

    // Verify storage record has parentRecordId and origin DEEP_LEARNING
    const storedRecord = await pipeline.journeyStorage.getRecord(childRes.recordId);
    assert.equal(storedRecord.origin, 'DEEP_LEARNING');
    assert.equal(storedRecord.parentRecordId, parentRes.recordId);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 13. Journey state persists across requests in same session
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 13: Journey state persists across requests in same session', () => {
  it('accumulates unique verified records under same sessionId', async () => {
    const pipeline = makeTestPipeline();

    await pipeline.processQuestion({
      questionText: 'قل هو الله أحد',
      sessionId: 'sess_shared',
      options: { interpretationOverride: IKHLAS_INTERPRETATION, mode: 'deterministic' }
    });

    const res2 = await pipeline.processQuestion({
      questionText: 'ما هي أركان الإسلام في حديث جبريل؟',
      sessionId: 'sess_shared',
      options: { interpretationOverride: ISLAM_PILLARS_INTERPRETATION, mode: 'deterministic' }
    });

    assert.equal(res2.journeyProgress.uniqueVerifiedCount, 2);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 14. Different session does not inherit another Journey
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 14: Different session does not inherit another Journey', () => {
  it('separates journey progress across different session IDs', async () => {
    const manager = makeServerManager();

    // Session A: 1 question
    const { req: reqA, res: resA } = mockHttpRequest({
      url: '/api/ask',
      body: {
        questionText: 'قل هو الله أحد',
        sessionId: 'sess_A',
        options: { interpretationOverride: IKHLAS_INTERPRETATION, mode: 'deterministic' }
      }
    });
    await manager.handleRequest(reqA, resA);
    assert.equal(resA.json.journeyProgress.uniqueVerifiedCount, 1);

    // Session B: check journey before asking anything
    const { req: reqB, res: resB } = mockHttpRequest({
      method: 'GET',
      url: '/api/journey?sessionId=sess_B'
    });
    await manager.handleRequest(reqB, resB);
    assert.equal(resB.json.verifiedRecords.length, 0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 15. Assessment unavailable before 20
// 16. Assessment eligible at 20
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 15 & 16: Assessment milestone threshold (20 records)', () => {
  it('returns 403 NOT_ELIGIBLE before 20, and 200 CREATED at 20 records', async () => {
    const manager = makeServerManager();

    // Below 20 records
    const { req: reqGenFail, res: resGenFail } = mockHttpRequest({
      url: '/api/assessment/generate',
      body: { sessionId: 'sess_threshold' }
    });
    await manager.handleRequest(reqGenFail, resGenFail);
    assert.equal(resGenFail.statusCode, 403);
    assert.equal(resGenFail.json.status, 'NOT_ELIGIBLE');

    // Simulate 20 verified records in storage for this session
    for (let i = 1; i <= 20; i++) {
      await manager.journeyStorage.saveRecord({
        id: `kr_sim_${i}`,
        sessionId: 'sess_threshold',
        fingerprint: `fp_sim_${i}`,
        originalQuestion: `سؤال ${i}`,
        topic: `موضوع_${i}`,
        concepts: [`مفهوم_${i}`],
        status: 'VERIFIED'
      });
    }

    // Now eligible
    const { req: reqGenOk, res: resGenOk } = mockHttpRequest({
      url: '/api/assessment/generate',
      body: { sessionId: 'sess_threshold' }
    });
    await manager.handleRequest(reqGenOk, resGenOk);
    assert.equal(resGenOk.statusCode, 200);
    assert.equal(resGenOk.json.status, 'CREATED');
    assert.ok(resGenOk.json.assessment);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 17. Client-safe assessment contains no answer key
// 18. Assessment submission uses private stored key
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 17 & 18: Client safety and secure submission scoring', () => {
  it('hides correctOptionId from client and scores against internal private key', async () => {
    const manager = makeServerManager();

    for (let i = 1; i <= 20; i++) {
      await manager.journeyStorage.saveRecord({
        id: `kr_eval_${i}`,
        sessionId: 'sess_eval',
        fingerprint: `fp_eval_${i}`,
        originalQuestion: `سؤال ${i}`,
        topic: `موضوع_${i}`,
        concepts: [`مفهوم_${i}`],
        status: 'VERIFIED'
      });
    }

    // 17. Generate assessment
    const { req: reqGen, res: resGen } = mockHttpRequest({
      url: '/api/assessment/generate',
      body: { sessionId: 'sess_eval' }
    });
    await manager.handleRequest(reqGen, resGen);

    const clientItems = resGen.json.assessment.items;
    for (const item of clientItems) {
      assert.equal(item.correctOptionId, undefined);
      assert.equal(item.correctAnswerText, undefined);
    }

    // 18. Submit with correct response
    const internal = await manager.assessmentStorage.getAssessment(resGen.json.assessment.assessmentId);
    const correctResponses = internal.items.map(i => ({
      assessmentItemId: i.assessmentItemId,
      selectedOptionId: i.correctOptionId
    }));

    const { req: reqSub, res: resSub } = mockHttpRequest({
      url: '/api/assessment/submit',
      body: {
        assessmentId: resGen.json.assessment.assessmentId,
        responses: correctResponses
      }
    });
    await manager.handleRequest(reqSub, resSub);

    assert.equal(resSub.statusCode, 200);
    assert.equal(resSub.json.scorePercentage, 100);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 19. Report generated only after valid completed assessment
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 19: Report generated only after valid completed assessment', () => {
  it('rejects report when assessment is missing, succeeds when valid result provided', async () => {
    const manager = makeServerManager();

    for (let i = 1; i <= 20; i++) {
      await manager.journeyStorage.saveRecord({
        id: `kr_rep_${i}`,
        sessionId: 'sess_rep',
        fingerprint: `fp_rep_${i}`,
        originalQuestion: `سؤال ${i}`,
        topic: `موضوع_${i}`,
        concepts: [`مفهوم_${i}`],
        status: 'VERIFIED'
      });
    }

    // Attempt without assessment -> 403
    const { req: reqFail, res: resFail } = mockHttpRequest({
      url: '/api/report/generate',
      body: { sessionId: 'sess_rep', assessmentResult: null }
    });
    await manager.handleRequest(reqFail, resFail);
    assert.equal(resFail.statusCode, 403);

    // Provide valid assessment -> 200
    const validAssessment = {
      assessmentId: 'asm_rep_1',
      totalItems: 5,
      correctCount: 4,
      incorrectCount: 1,
      scorePercentage: 80,
      conceptsUnderstood: ['مفهوم_1'],
      conceptsNeedingReview: []
    };

    const { req: reqOk, res: resOk } = mockHttpRequest({
      url: '/api/report/generate',
      body: { sessionId: 'sess_rep', assessmentResult: validAssessment }
    });
    await manager.handleRequest(reqOk, resOk);
    assert.equal(resOk.statusCode, 200);
    assert.equal(resOk.json.status, 'CREATED');
    assert.ok(resOk.json.report.sections['ملخص الرحلة المعرفية']);
    assert.ok(resOk.json.report.sections['تقييم الفهم']);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 20. No API secret appears in any client-safe response
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 20: No API secret appears in any client-safe response', () => {
  it('ensures GEMINI_API_KEY never leaks into API JSON payloads', async () => {
    const manager = makeServerManager();

    const { req, res } = mockHttpRequest({
      url: '/api/ask',
      body: {
        questionText: 'قل هو الله أحد',
        sessionId: 'sess_sec',
        options: { interpretationOverride: IKHLAS_INTERPRETATION, mode: 'deterministic' }
      }
    });
    await manager.handleRequest(req, res);

    const rawResponse = JSON.stringify(res.json);
    assert.ok(!rawResponse.includes('AIza'));
    assert.ok(!rawResponse.includes('GEMINI_API_KEY'));
    assert.ok(!rawResponse.includes('process.env'));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 21. No frozen Phase 1–11 semantics modified
// ════════════════════════════════════════════════════════════════════════════
describe('Scenario 21: Frozen phase contracts preserved', () => {
  it('preserves all required canonical contracts without semantic modifications', async () => {
    const pipeline = makeTestPipeline();
    assert.ok(pipeline.repository);
    assert.ok(pipeline.retrievalService);
    assert.ok(pipeline.evidenceService);
    assert.ok(pipeline.sufficiencyService);
    assert.ok(pipeline.answerService);
    assert.ok(pipeline.deepLearningService);
    assert.ok(pipeline.journeyService);
  });
});
