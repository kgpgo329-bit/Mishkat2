/**
 * Mishkat Phase 7: Grounded Answer Generation & Claim Grounding Verification Tests
 * 
 * Strict deterministic validation of all 17 required Phase 7 scenarios:
 * 1. ANSWERED + fully grounded generated answer -> accepted
 * 2. PARTIAL sufficiency -> only supported portion answered
 * 3. INSUFFICIENT -> generator is not called
 * 4. NEEDS_CLARIFICATION -> generator is not called
 * 5. REFER_TO_AUTHORITY -> no personalized fatwa generated
 * 6. SERVICE_ERROR -> generator is not called
 * 7. Generated answer containing one unsupported secondary claim -> removed/regenerated
 * 8. Generated answer containing unsupported CENTRAL claim -> downgrade; never return fully answered
 * 9. Fabricated source/citation attempt -> rejected
 * 10. Duplicate citations -> deduplicated
 * 11. Citation references evidence actually used
 * 12. DIRECT contradiction remains represented correctly and is not rewritten as support
 * 13. Quran/hadith source text integrity
 * 14. Translation distinguishes source-supported meaning from AI-generated translation
 * 15. Grounding mappings preserve: answerClaim -> originalClaim -> evidence -> source
 * 16. Bounded regeneration prevents infinite loops
 * 17. No Knowledge Journey record is created by Phase 7
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GroundedAnswerService,
  generateGroundedAnswer,
  ANSWER_STATUS,
  GROUNDING_STATUS,
  GROUNDING_VERIFICATION_STATE
} from '../src/mishkat/answer/index.js';

describe('Mishkat Phase 7: Grounded Answer Generation & Grounding Verification Battery', () => {
  const service = new GroundedAnswerService();

  // Helper to build realistic mock evidence item
  function makeMockEvidence(overrides = {}) {
    return {
      evidenceId: overrides.evidenceId || `ev_${Math.random().toString(36).substring(2, 8)}`,
      claimId: overrides.claimId || 'c_01',
      chunkId: overrides.chunkId || 'chk_quran_112_1',
      recordId: overrides.recordId || 'rec_quran_112_1',
      sourceId: overrides.sourceId || 'src_quran_complex',
      sourceName: overrides.sourceName || 'القرآن الكريم (مجمع الملك فهد لطباعة المصحف الشريف)',
      sourceUrl: overrides.sourceUrl || 'https://qurancomplex.gov.sa',
      domain: overrides.domain || 'QURAN',
      title: overrides.title || 'سورة الإخلاص',
      section: overrides.section || 'الآية 1',
      text: overrides.text || 'قُلْ هُوَ اللَّهُ أَحَدٌ',
      evidenceType: overrides.evidenceType || 'QURANIC_CANONICAL_TEXT',
      reference: overrides.reference || { surahNumber: 112, ayahNumber: 1 },
      attribution: overrides.attribution || { scholar: null },
      relation: overrides.relation || 'DIRECT',
      answersExactClaim: overrides.answersExactClaim ?? true,
      supportsClaim: overrides.supportsClaim ?? true,
      contradictsClaim: overrides.contradictsClaim ?? false,
      preservesQuestionIntent: overrides.preservesQuestionIntent ?? true,
      confidence: overrides.confidence ?? 0.98,
      reason: overrides.reason || 'نص قطعي الدلالة',
      verificationStatus: 'VERIFIED',
      verificationMode: 'DETERMINISTIC_VERIFICATION'
    };
  }

  // Helper to create mock Phase 6 sufficiency result
  function makeMockSufficiencyResult(overrides = {}) {
    return {
      sufficiencyId: overrides.sufficiencyId || 'suf_test_01',
      overallSufficiency: overrides.overallSufficiency || 'SUFFICIENT',
      routing: overrides.routing || 'ANSWERED',
      reason: overrides.reason || 'جميع الادعاءات الأساسية مستوفاة',
      claims: overrides.claims || [],
      summary: overrides.summary || {
        totalClaims: 1,
        materialClaims: 1,
        supportedClaims: 1,
        partialClaims: 0,
        unsupportedClaims: 0,
        hasConflict: false,
        hasUnresolvedContradiction: false,
        hasVerificationError: false
      }
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 1. ANSWERED + fully grounded generated answer -> accepted
  // ─────────────────────────────────────────────────────────────
  it('1. should accept fully grounded answer when routing is ANSWERED', async () => {
    const interpretation = {
      originalQuestion: 'ما الدليل على وحدانية الله في سورة الإخلاص؟',
      task: 'VERIFY_QURAN',
      claimsToResolve: [
        {
          claimId: 'c_01',
          statement: 'قل هو الله أحد تثبت وحدانية الله تعالى بنص قطعي',
          importance: 'CORE'
        }
      ]
    };

    const ev = makeMockEvidence({
      claimId: 'c_01',
      chunkId: 'rec_quran_112_1_chk_0',
      text: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
      relation: 'DIRECT',
      supportsClaim: true
    });

    const sufficiencyResult = makeMockSufficiencyResult({
      routing: 'ANSWERED',
      overallSufficiency: 'SUFFICIENT',
      claims: [
        {
          claimId: 'c_01',
          claimText: 'قل هو الله أحد تثبت وحدانية الله تعالى بنص قطعي',
          importance: 'CORE',
          status: 'SUPPORTED',
          supportingEvidence: [ev]
        }
      ]
    });

    const result = await service.generateGroundedAnswer({ interpretation, sufficiencyResult });

    assert.equal(result.answerStatus, ANSWER_STATUS.ANSWERED);
    assert.ok(result.answerText.length > 0);
    assert.equal(result.groundingVerification.isFullyGrounded, true);
    assert.equal(result.groundingVerification.status, GROUNDING_VERIFICATION_STATE.VERIFIED);
    assert.equal(result.groundingVerification.ungroundedClaims, 0);
    assert.ok(result.citations.length >= 1);
    assert.equal(result.citations[0].chunkId, 'rec_quran_112_1_chk_0');
  });

  // ─────────────────────────────────────────────────────────────
  // 2. PARTIAL sufficiency -> only supported portion answered
  // ─────────────────────────────────────────────────────────────
  it('2. should answer ONLY supported portion when sufficiency is PARTIAL and explicitly note incompleteness', async () => {
    const interpretation = {
      originalQuestion: 'ما حكم الزكاة وما هي مقاديرها التفصيلية في العملات المشفرة الحديثة؟',
      task: 'EXPLORE_TOPIC',
      claimsToResolve: [
        {
          claimId: 'c_zakat_base',
          statement: 'وجوب إيتاء الزكاة كركن من أركان الإسلام',
          importance: 'CORE'
        },
        {
          claimId: 'c_crypto_details',
          statement: 'المقادير التفصيلية لنصاب العملات المشفرة المعاصرة',
          importance: 'CORE'
        }
      ]
    };

    const ev = makeMockEvidence({
      claimId: 'c_zakat_base',
      chunkId: 'rec_quran_2_43_chk_0',
      text: 'وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ',
      relation: 'DIRECT',
      supportsClaim: true
    });

    const sufficiencyResult = makeMockSufficiencyResult({
      routing: 'PARTIAL',
      overallSufficiency: 'PARTIAL',
      claims: [
        {
          claimId: 'c_zakat_base',
          claimText: 'وجوب إيتاء الزكاة كركن من أركان الإسلام',
          importance: 'CORE',
          status: 'SUPPORTED',
          supportingEvidence: [ev]
        },
        {
          claimId: 'c_crypto_details',
          claimText: 'المقادير التفصيلية لنصاب العملات المشفرة المعاصرة',
          importance: 'CORE',
          status: 'UNSUPPORTED',
          supportingEvidence: []
        }
      ]
    });

    const result = await service.generateGroundedAnswer({ interpretation, sufficiencyResult });

    assert.equal(result.answerStatus, ANSWER_STATUS.PARTIAL);
    // Must contain explicit warning about missing portion
    assert.ok(result.answerText.includes('تنبيه: الأدلة الشرعية الموثقة المتوفرة كافية'));
    assert.ok(result.answerText.includes('وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ'));
    // Only supported claim was grounded
    assert.equal(result.citations.length, 1);
    assert.equal(result.citations[0].chunkId, 'rec_quran_2_43_chk_0');
  });

  // ─────────────────────────────────────────────────────────────
  // 3. INSUFFICIENT -> generator is not called
  // ─────────────────────────────────────────────────────────────
  it('3. should NOT call generator and return safe refusal when sufficiency is INSUFFICIENT', async () => {
    let generatorCalled = false;
    const interpretation = {
      originalQuestion: 'سؤال خارج التغطية المعرفية',
      claimsToResolve: []
    };
    const sufficiencyResult = makeMockSufficiencyResult({
      routing: 'INSUFFICIENT',
      overallSufficiency: 'INSUFFICIENT'
    });

    const result = await service.generateGroundedAnswer({
      interpretation,
      sufficiencyResult,
      options: {
        generatorOverride: () => {
          generatorCalled = true;
          return 'إجابة مولدة بالخطأ';
        }
      }
    });

    assert.equal(generatorCalled, false, 'Generator must NOT be called on INSUFFICIENT routing');
    assert.equal(result.answerStatus, ANSWER_STATUS.INSUFFICIENT);
    assert.ok(result.answerText.includes('لم تتوافر في المصادر المعتمدة المتاحة أدلة'));
    assert.equal(result.citations.length, 0);
  });

  // ─────────────────────────────────────────────────────────────
  // 4. NEEDS_CLARIFICATION -> generator is not called
  // ─────────────────────────────────────────────────────────────
  it('4. should NOT call generator and return clarification request when routing is NEEDS_CLARIFICATION', async () => {
    let generatorCalled = false;
    const interpretation = {
      originalQuestion: 'هل هذا الحديث صحيح؟',
      needsClarification: true,
      clarificationReason: 'السؤال يفتقر إلى متن الحديث المراد تخريجه وبيان صحته.'
    };
    const sufficiencyResult = makeMockSufficiencyResult({
      routing: 'NEEDS_CLARIFICATION',
      overallSufficiency: 'INSUFFICIENT',
      reason: interpretation.clarificationReason
    });

    const result = await service.generateGroundedAnswer({
      interpretation,
      sufficiencyResult,
      options: {
        generatorOverride: () => {
          generatorCalled = true;
          return 'إجابة مولدة بالخطأ';
        }
      }
    });

    assert.equal(generatorCalled, false, 'Generator must NOT be called on NEEDS_CLARIFICATION routing');
    assert.equal(result.answerStatus, ANSWER_STATUS.NEEDS_CLARIFICATION);
    assert.ok(result.answerText.includes('نرجو التكرم بتوضيح السؤال'));
    assert.ok(result.answerText.includes('يفتقر إلى متن الحديث'));
    assert.equal(result.citations.length, 0);
  });

  // ─────────────────────────────────────────────────────────────
  // 5. REFER_TO_AUTHORITY -> no personalized fatwa generated
  // ─────────────────────────────────────────────────────────────
  it('5. should NOT generate personalized fatwa and direct to official authority when routing is REFER_TO_AUTHORITY', async () => {
    let generatorCalled = false;
    const interpretation = {
      originalQuestion: 'طلقت زوجتي طلقة واحدة في طهر جامعتها فيه وأنا غضبان هل يقع طلاقي؟',
      isPersonalFatwa: true
    };
    const sufficiencyResult = makeMockSufficiencyResult({
      routing: 'REFER_TO_AUTHORITY',
      overallSufficiency: 'INSUFFICIENT'
    });

    const result = await service.generateGroundedAnswer({
      interpretation,
      sufficiencyResult,
      options: {
        generatorOverride: () => {
          generatorCalled = true;
          return 'فتوى مولدة';
        }
      }
    });

    assert.equal(generatorCalled, false, 'Generator must NOT be called on REFER_TO_AUTHORITY routing');
    assert.equal(result.answerStatus, ANSWER_STATUS.REFER_TO_AUTHORITY);
    assert.ok(result.answerText.includes('دور الإفتاء الرسمية المعتمدة'));
    assert.ok(!result.answerText.includes('يقع طلاقك') && !result.answerText.includes('لا يقع طلاقك'));
    assert.equal(result.citations.length, 0);
  });

  // ─────────────────────────────────────────────────────────────
  // 6. SERVICE_ERROR -> generator is not called
  // ─────────────────────────────────────────────────────────────
  it('6. should NOT call generator and return service unavailable when routing is SERVICE_ERROR', async () => {
    let generatorCalled = false;
    const interpretation = {
      originalQuestion: 'سؤال واجه خطأ تحقق',
      claimsToResolve: []
    };
    const sufficiencyResult = makeMockSufficiencyResult({
      routing: 'SERVICE_ERROR',
      overallSufficiency: 'INSUFFICIENT'
    });

    const result = await service.generateGroundedAnswer({
      interpretation,
      sufficiencyResult,
      options: {
        generatorOverride: () => {
          generatorCalled = true;
          return 'إجابة مولدة';
        }
      }
    });

    assert.equal(generatorCalled, false, 'Generator must NOT be called on SERVICE_ERROR routing');
    assert.equal(result.answerStatus, ANSWER_STATUS.SERVICE_ERROR);
    assert.ok(result.answerText.includes('خلل تقني مؤقت في خدمة التحقق'));
    assert.equal(result.citations.length, 0);
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Generated answer containing one unsupported secondary claim -> removed
  // ─────────────────────────────────────────────────────────────
  it('7. should filter out unsupported secondary claim and keep grounded answer', async () => {
    const interpretation = {
      originalQuestion: 'ما حكم صلاة العيد؟',
      task: 'EXPLORE_TOPIC',
      claimsToResolve: [
        { claimId: 'c_eid_rule', statement: 'مشروعية صلاة العيد', importance: 'CORE' }
      ]
    };

    const ev = makeMockEvidence({
      claimId: 'c_eid_rule',
      chunkId: 'chk_eid_1',
      text: 'صلاة العيدين سنة مؤكدة عند جمهور الفقهاء',
      relation: 'DIRECT',
      supportsClaim: true
    });

    const sufficiencyResult = makeMockSufficiencyResult({
      routing: 'ANSWERED',
      claims: [
        {
          claimId: 'c_eid_rule',
          claimText: 'مشروعية صلاة العيد',
          importance: 'CORE',
          status: 'SUPPORTED',
          supportingEvidence: [ev]
        }
      ]
    });

    // Generator produces primary grounded claim + 1 unsupported secondary claim
    const mockAnswer = 'صلاة العيدين سنة مؤكدة عند جمهور الفقهاء. ويسن في بعض البلدان توزيع الحلوى في المساجد.';

    const result = await service.generateGroundedAnswer({
      interpretation,
      sufficiencyResult,
      options: {
        mockAnswerText: mockAnswer,
        groundingOverrides: {
          ans_claim_1: {
            groundingStatus: GROUNDING_STATUS.GROUNDED,
            originalClaimId: 'c_eid_rule',
            chunkIds: ['chk_eid_1']
          },
          ans_claim_2: {
            groundingStatus: GROUNDING_STATUS.UNGROUNDED,
            originalClaimId: null,
            reason: 'توزيع الحلوى مسألة عرفية لا دليل عليها في الحزمة'
          }
        },
        explicitClaims: [
          { claimId: 'ans_claim_1', statement: 'صلاة العيدين سنة مؤكدة عند جمهور الفقهاء', importance: 'CORE' },
          { claimId: 'ans_claim_2', statement: 'ويسن في بعض البلدان توزيع الحلوى في المساجد', importance: 'SECONDARY' }
        ]
      }
    });

    // Secondary ungrounded claim was removed from final verified claims
    assert.equal(result.answerStatus, ANSWER_STATUS.ANSWERED);
    assert.equal(result.groundingVerification.isFullyGrounded, true);
    assert.equal(result.answerClaims.length, 1);
    assert.equal(result.answerClaims[0].claimId, 'ans_claim_1');
    assert.equal(result.answerClaims[0].groundingStatus, GROUNDING_STATUS.GROUNDED);
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Generated answer containing unsupported CENTRAL claim -> downgrade
  // ─────────────────────────────────────────────────────────────
  it('8. should DOWNGRADE status to PARTIAL and never return fully ANSWERED when central claim is ungrounded', async () => {
    const interpretation = {
      originalQuestion: 'ما الدليل على مسألة معينة؟',
      claimsToResolve: [
        { claimId: 'c_main', statement: 'دعوى رئيسية', importance: 'CORE' }
      ]
    };

    const ev = makeMockEvidence({
      claimId: 'c_main',
      chunkId: 'chk_valid_1',
      text: 'نص صحيح مقارب',
      relation: 'DIRECT',
      supportsClaim: true
    });

    const sufficiencyResult = makeMockSufficiencyResult({
      routing: 'ANSWERED',
      claims: [
        {
          claimId: 'c_main',
          claimText: 'دعوى رئيسية',
          importance: 'CORE',
          status: 'SUPPORTED',
          supportingEvidence: [ev]
        }
      ]
    });

    const result = await service.generateGroundedAnswer({
      interpretation,
      sufficiencyResult,
      options: {
        mockAnswerText: 'دعوى مختلقة لم تدعمها الأدلة إطلاقاً.',
        groundingOverrides: {
          ans_claim_1: {
            groundingStatus: GROUNDING_STATUS.UNGROUNDED,
            reason: 'دعوى رئيسية لم تثبتها الأدلة'
          }
        },
        explicitClaims: [
          { claimId: 'ans_claim_1', statement: 'دعوى مختلقة لم تدعمها الأدلة إطلاقاً', importance: 'CORE' }
        ]
      }
    });

    assert.notEqual(result.answerStatus, ANSWER_STATUS.ANSWERED, 'Must NOT be ANSWERED when central claim is ungrounded');
    assert.equal(result.answerStatus, ANSWER_STATUS.PARTIAL);
    assert.equal(result.diagnostics.downgraded, true);
  });

  // ─────────────────────────────────────────────────────────────
  // 9. Fabricated source/citation attempt -> rejected
  // ─────────────────────────────────────────────────────────────
  it('9. should strictly reject proposed citations from fabricated sources absent from accepted evidence', async () => {
    const interpretation = {
      originalQuestion: 'سؤال مع اقتراح مصدر مختلق',
      claimsToResolve: [{ claimId: 'c_01', statement: 'دعوى', importance: 'CORE' }]
    };

    const validEv = makeMockEvidence({
      chunkId: 'chk_valid_authentic_chunk',
      sourceId: 'src_dorar',
      sourceName: 'الدرر السنية'
    });

    const sufficiencyResult = makeMockSufficiencyResult({
      routing: 'ANSWERED',
      claims: [
        {
          claimId: 'c_01',
          status: 'SUPPORTED',
          supportingEvidence: [validEv]
        }
      ]
    });

    // Propose 1 valid citation and 1 fabricated citation
    const proposedCitations = [
      { chunkId: 'chk_valid_authentic_chunk', sourceName: 'الدرر السنية' },
      { chunkId: 'chk_fake_fabricated_chunk', sourceName: 'كتاب وهمي غير موجود' }
    ];

    const result = await service.generateGroundedAnswer({
      interpretation,
      sufficiencyResult,
      options: {
        proposedCitations
      }
    });

    assert.equal(result.diagnostics.rejectedCitationCount, 1, 'Fabricated citation must be rejected');
    assert.equal(result.citations.length, 1);
    assert.equal(result.citations[0].chunkId, 'chk_valid_authentic_chunk');
    assert.ok(result.citations.every(c => c.chunkId !== 'chk_fake_fabricated_chunk'));
  });

  // ─────────────────────────────────────────────────────────────
  // 10. Duplicate citations -> deduplicated
  // ─────────────────────────────────────────────────────────────
  it('10. should deduplicate repeated references to the same chunkId into a single citation record', async () => {
    const interpretation = {
      originalQuestion: 'سؤال لاختبار تكرار الاستشهاد',
      claimsToResolve: [{ claimId: 'c_01', statement: 'دعوى مكررة', importance: 'CORE' }]
    };

    const validEv = makeMockEvidence({
      chunkId: 'chk_single_instance_chunk',
      sourceId: 'src_bukhari',
      sourceName: 'صحيح البخاري'
    });

    const sufficiencyResult = makeMockSufficiencyResult({
      routing: 'ANSWERED',
      claims: [
        {
          claimId: 'c_01',
          status: 'SUPPORTED',
          supportingEvidence: [validEv]
        }
      ]
    });

    // Propose the same chunk 3 times
    const proposedCitations = [
      { chunkId: 'chk_single_instance_chunk' },
      { chunkId: 'chk_single_instance_chunk' },
      { chunkId: 'chk_single_instance_chunk' }
    ];

    const result = await service.generateGroundedAnswer({
      interpretation,
      sufficiencyResult,
      options: {
        proposedCitations
      }
    });

    assert.equal(result.citations.length, 1, 'Duplicate citations must be collapsed into exactly 1');
    assert.equal(result.citations[0].chunkId, 'chk_single_instance_chunk');
  });

  // ─────────────────────────────────────────────────────────────
  // 11. Citation references evidence actually used
  // ─────────────────────────────────────────────────────────────
  it('11. should ONLY cite evidence that was actually used to ground an answer claim', async () => {
    const interpretation = {
      originalQuestion: 'سؤال متعدد الأدلة',
      claimsToResolve: [{ claimId: 'c_01', statement: 'دعوى', importance: 'CORE' }]
    };

    const usedEv = makeMockEvidence({
      chunkId: 'chk_actually_used',
      text: 'النص المستخدم فعلاً في الإجابة'
    });
    const unusedEv = makeMockEvidence({
      chunkId: 'chk_unused_in_answer',
      text: 'نص إضافي في الحزمة لكنه لم يستخدم في صياغة الإجابة'
    });

    const sufficiencyResult = makeMockSufficiencyResult({
      routing: 'ANSWERED',
      claims: [
        {
          claimId: 'c_01',
          status: 'SUPPORTED',
          supportingEvidence: [usedEv, unusedEv]
        }
      ]
    });

    const result = await service.generateGroundedAnswer({
      interpretation,
      sufficiencyResult,
      options: {
        mockAnswerText: 'الجواب مستند إلى النص المستخدم فعلاً في الإجابة.',
        groundingOverrides: {
          ans_claim_1: {
            groundingStatus: GROUNDING_STATUS.GROUNDED,
            chunkIds: ['chk_actually_used']
          }
        },
        explicitClaims: [
          { claimId: 'ans_claim_1', statement: 'النص المستخدم فعلاً في الإجابة', importance: 'CORE' }
        ]
      }
    });

    assert.equal(result.citations.length, 1);
    assert.equal(result.citations[0].chunkId, 'chk_actually_used');
    assert.ok(result.citations.every(c => c.chunkId !== 'chk_unused_in_answer'));
  });

  // ─────────────────────────────────────────────────────────────
  // 12. DIRECT contradiction remains represented correctly
  // ─────────────────────────────────────────────────────────────
  it('12. should NOT rewrite a DIRECT contradiction as support', async () => {
    const interpretation = {
      originalQuestion: 'هل الربا جائز بالتراضي؟',
      claimsToResolve: [{ claimId: 'c_riba', statement: 'جواز الربا بالتراضي', importance: 'CORE' }]
    };

    const ev = makeMockEvidence({
      claimId: 'c_riba',
      chunkId: 'chk_riba_haram',
      text: 'وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا',
      relation: 'DIRECT',
      supportsClaim: false,
      contradictsClaim: true
    });

    const sufficiencyResult = makeMockSufficiencyResult({
      routing: 'INSUFFICIENT',
      overallSufficiency: 'INSUFFICIENT',
      claims: [
        {
          claimId: 'c_riba',
          status: 'UNSUPPORTED',
          hasContradiction: true,
          contradictingEvidence: [ev],
          supportingEvidence: []
        }
      ]
    });

    const result = await service.generateGroundedAnswer({ interpretation, sufficiencyResult });

    // Routing gate halts generation and avoids falsifying contradiction as support
    assert.equal(result.answerStatus, ANSWER_STATUS.INSUFFICIENT);
    assert.ok(!result.answerText.includes('الربا حلال'));
    assert.equal(result.citations.length, 0);
  });

  // ─────────────────────────────────────────────────────────────
  // 13. Quran/hadith source text integrity
  // ─────────────────────────────────────────────────────────────
  it('13. should preserve Quran and Hadith text verbatim without model-memory alteration', async () => {
    const interpretation = {
      originalQuestion: 'ما نص آية التوحيد في سورة الإخلاص؟',
      task: 'VERIFY_QURAN',
      claimsToResolve: [{ claimId: 'c_quran', statement: 'نص الآية الكريمة', importance: 'CORE' }]
    };

    const exactQuranText = 'قُلْ هُوَ اللَّهُ أَحَدٌ';
    const ev = makeMockEvidence({
      chunkId: 'chk_ikhlas_verbatim',
      text: exactQuranText,
      domain: 'QURAN'
    });

    const sufficiencyResult = makeMockSufficiencyResult({
      routing: 'ANSWERED',
      claims: [
        {
          claimId: 'c_quran',
          status: 'SUPPORTED',
          supportingEvidence: [ev]
        }
      ]
    });

    const result = await service.generateGroundedAnswer({ interpretation, sufficiencyResult });

    assert.ok(result.answerText.includes(`«${exactQuranText}»`), 'Quranic text must be quoted verbatim from evidence chunk');
    assert.equal(result.citations[0].text, exactQuranText);
  });

  // ─────────────────────────────────────────────────────────────
  // 14. Translation distinguishes source-supported meaning from AI-generated translation
  // ─────────────────────────────────────────────────────────────
  it('14. should distinguish source-supported meaning from AI-generated translation in concept translation', async () => {
    const interpretation = {
      originalQuestion: 'كيف أترجم مصطلح التقوى باللغة الإنجليزية بدقة؟',
      task: 'TRANSLATE_CONCEPT',
      claimsToResolve: [
        { claimId: 'c_trans', statement: 'المعنى الشرعي لمصطلح التقوى وترجمته', importance: 'CORE' }
      ]
    };

    const ev = makeMockEvidence({
      chunkId: 'chk_taqwa_term',
      domain: 'TERMINOLOGY',
      title: 'التقوى',
      text: 'التقوى هي امتثال الأوامر واجتناب النواهي ووقاية النفس من عذاب الله',
      reference: { englishTerm: 'Piety / God-consciousness' }
    });

    const sufficiencyResult = makeMockSufficiencyResult({
      routing: 'ANSWERED',
      claims: [
        {
          claimId: 'c_trans',
          status: 'SUPPORTED',
          supportingEvidence: [ev]
        }
      ]
    });

    const result = await service.generateGroundedAnswer({ interpretation, sufficiencyResult });

    assert.equal(result.answerStatus, ANSWER_STATUS.ANSWERED);
    // Must contain both distinct structural sections
    assert.ok(result.answerText.includes('المعنى الشرعي المعتمد من المصادر:'));
    assert.ok(result.answerText.includes('الترجمة المقترحة والبيان الدلالي'));
    assert.ok(result.answerText.includes('امتثال الأوامر واجتناب النواهي'));
    assert.ok(result.answerText.includes('Piety / God-consciousness'));
  });

  // ─────────────────────────────────────────────────────────────
  // 15. Grounding mappings preserve: answerClaim -> originalClaim -> evidence -> source
  // ─────────────────────────────────────────────────────────────
  it('15. should preserve full lineage mapping: answerClaim -> originalClaim -> evidence -> source', async () => {
    const interpretation = {
      originalQuestion: 'ما فضل إماطة الأذى عن الطريق؟',
      claimsToResolve: [
        { claimId: 'orig_claim_ada', statement: 'إماطة الأذى عن الطريق صدقة وشعبة من شعب الإيمان', importance: 'CORE' }
      ]
    };

    const ev = makeMockEvidence({
      evidenceId: 'ev_ada_101',
      chunkId: 'chk_hadith_ada_1',
      sourceId: 'src_hadith_bukhari',
      sourceName: 'صحيح البخاري',
      text: 'وتميط الأذى عن الطريق صدقة'
    });

    const sufficiencyResult = makeMockSufficiencyResult({
      routing: 'ANSWERED',
      claims: [
        {
          claimId: 'orig_claim_ada',
          status: 'SUPPORTED',
          supportingEvidence: [ev]
        }
      ]
    });

    const result = await service.generateGroundedAnswer({
      interpretation,
      sufficiencyResult,
      options: {
        mockAnswerText: 'إماطة الأذى عن الطريق من الصدقات المعتبرة شرعاً.',
        groundingOverrides: {
          ans_claim_1: {
            groundingStatus: GROUNDING_STATUS.GROUNDED,
            originalClaimId: 'orig_claim_ada',
            evidenceIds: ['ev_ada_101'],
            chunkIds: ['chk_hadith_ada_1'],
            sourceIds: ['src_hadith_bukhari']
          }
        },
        explicitClaims: [
          { claimId: 'ans_claim_1', statement: 'إماطة الأذى عن الطريق من الصدقات المعتبرة شرعاً', importance: 'CORE' }
        ]
      }
    });

    assert.equal(result.answerClaims.length, 1);
    const claimMapping = result.answerClaims[0];
    assert.equal(claimMapping.claimId, 'ans_claim_1');
    assert.equal(claimMapping.originalClaimId, 'orig_claim_ada');
    assert.deepEqual(claimMapping.evidenceIds, ['ev_ada_101']);
    assert.deepEqual(claimMapping.chunkIds, ['chk_hadith_ada_1']);
    assert.deepEqual(claimMapping.sourceIds, ['src_hadith_bukhari']);
  });

  // ─────────────────────────────────────────────────────────────
  // 16. Bounded regeneration prevents infinite loops
  // ─────────────────────────────────────────────────────────────
  it('16. should strictly bound regeneration attempts to MAX_REGENERATION_ATTEMPTS and terminate', async () => {
    let callCount = 0;
    const interpretation = {
      originalQuestion: 'سؤال لاختبار حلقة التوليد المغلقة',
      claimsToResolve: [{ claimId: 'c_01', statement: 'دعوى', importance: 'CORE' }]
    };

    const ev = makeMockEvidence({ chunkId: 'chk_loop_test' });
    const sufficiencyResult = makeMockSufficiencyResult({
      routing: 'ANSWERED',
      claims: [{ claimId: 'c_01', status: 'SUPPORTED', supportingEvidence: [ev] }]
    });

    const result = await service.generateGroundedAnswer({
      interpretation,
      sufficiencyResult,
      options: {
        generatorOverride: () => {
          callCount++;
          return 'إجابة تصر على دعوى غير مؤصلة في كل محاولة.';
        },
        groundingOverrides: {
          ans_claim_1: {
            groundingStatus: GROUNDING_STATUS.UNGROUNDED,
            reason: 'دعوى غير مسندة في جميع المحاولات'
          }
        },
        explicitClaims: [
          { claimId: 'ans_claim_1', statement: 'دعوى غير مؤصلة', importance: 'CORE' }
        ]
      }
    });

    // 1 initial attempt + 2 retry attempts = 3 total calls max
    assert.ok(callCount <= 3, `Expected at most 3 generator calls, got ${callCount}`);
    assert.equal(result.diagnostics.downgraded, true);
    assert.equal(result.answerStatus, ANSWER_STATUS.PARTIAL);
  });

  // ─────────────────────────────────────────────────────────────
  // 17. No Knowledge Journey record is created by Phase 7
  // ─────────────────────────────────────────────────────────────
  it('17. should NOT create any Knowledge Journey records, assessment items, or database entries', async () => {
    const interpretation = {
      originalQuestion: 'ما أركان الإسلام؟',
      claimsToResolve: [{ claimId: 'c_pillars', statement: 'أركان الإسلام خمسة', importance: 'CORE' }]
    };

    const ev = makeMockEvidence({ chunkId: 'chk_hadith_jibril' });
    const sufficiencyResult = makeMockSufficiencyResult({
      routing: 'ANSWERED',
      claims: [{ claimId: 'c_pillars', status: 'SUPPORTED', supportingEvidence: [ev] }]
    });

    const result = await service.generateGroundedAnswer({ interpretation, sufficiencyResult });

    // Strict invariant: no journey properties in result contract
    assert.equal(result.journeyRecord, undefined);
    assert.equal(result.assessment, undefined);
    assert.equal(result.deepLearningQuestions, undefined);
    assert.ok(result.answerStatus);
    assert.ok(result.answerText);
    assert.ok(result.answerClaims);
    assert.ok(result.groundingVerification);
    assert.ok(result.citations);
    assert.ok(result.sources);
    assert.ok(result.diagnostics);
  });
});
