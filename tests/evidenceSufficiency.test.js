/**
 * Mishkat Phase 6: Evidence Sufficiency Unit & Integration Test Suite
 * 
 * Strict deterministic validation of all 17 required Phase 6 scenarios:
 * 1. Single material claim + valid DIRECT support -> SUPPORTED / SUFFICIENT / ANSWERED
 * 2. Valid SUPPORTING evidence aggregation (>= 2 distinct pieces -> SUPPORTED)
 * 3. CONTEXTUAL-only evidence -> not SUPPORTED (PARTIAL)
 * 4. INCIDENTAL-only evidence -> not SUPPORTED (UNSUPPORTED / INSUFFICIENT)
 * 5. UNRELATED-only evidence -> not SUPPORTED (UNSUPPORTED / INSUFFICIENT)
 * 6. DIRECT contradiction -> UNSUPPORTED / INSUFFICIENT with contradiction flagged
 * 7. DIRECT support + DIRECT contradiction -> conflict / not SUFFICIENT (PARTIAL)
 * 8. Multiple material claims all supported -> SUFFICIENT / ANSWERED
 * 9. Multiple material claims with one missing/unsupported -> PARTIAL / PARTIAL
 * 10. All material claims unsupported -> INSUFFICIENT / INSUFFICIENT
 * 11. No evidence -> INSUFFICIENT / INSUFFICIENT
 * 12. Personal fatwa -> REFER_TO_AUTHORITY priority routing
 * 13. Missing referent / needs clarification -> NEEDS_CLARIFICATION priority routing
 * 14. Material VERIFICATION_ERROR -> SERVICE_ERROR priority routing
 * 15. Duplicate evidence -> deduplicated, does not inflate support
 * 16. Identifiers & provenance preservation
 * 17. Phase 5 DIRECT contradiction semantics preserved correctly
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EvidenceSufficiencyService,
  evaluateEvidenceSufficiency,
  CLAIM_SUFFICIENCY_STATUS,
  OVERALL_SUFFICIENCY,
  SUFFICIENCY_ROUTING,
  deduplicateEvidence,
  evaluateClaimSufficiency
} from '../src/mishkat/sufficiency/index.js';

describe('Mishkat Phase 6: Evidence Sufficiency Test Battery', () => {
  const service = new EvidenceSufficiencyService();

  // Helper to build realistic mock evidence item
  function makeMockEvidence(overrides = {}) {
    return {
      evidenceId: overrides.evidenceId || `ev_${Math.random().toString(36).substring(2, 8)}`,
      claimId: overrides.claimId || 'claim-1',
      chunkId: overrides.chunkId || 'chk_mock_1',
      recordId: overrides.recordId || 'rec_mock_1',
      sourceId: overrides.sourceId || 'src_mock',
      sourceName: overrides.sourceName || 'مصدر معتمد',
      sourceUrl: overrides.sourceUrl || 'https://example.com/source',
      domain: overrides.domain || 'QURAN',
      title: overrides.title || 'عنوان الدليل',
      section: overrides.section || 'باب التوحيد',
      text: overrides.text || 'نص الدليل الشرعي المعتمد',
      evidenceType: overrides.evidenceType || 'QURANIC_CANONICAL_TEXT',
      reference: overrides.reference || { surahNumber: 112, ayahNumber: 1 },
      attribution: overrides.attribution || { scholar: null },
      relation: overrides.relation || 'DIRECT',
      answersExactClaim: overrides.answersExactClaim ?? true,
      supportsClaim: overrides.supportsClaim ?? true,
      contradictsClaim: overrides.contradictsClaim ?? false,
      preservesQuestionIntent: overrides.preservesQuestionIntent ?? true,
      confidence: overrides.confidence ?? 0.95,
      reason: overrides.reason || 'دليل قطعي الدلالة',
      verificationStatus: overrides.verificationStatus || 'VERIFIED',
      verificationMode: overrides.verificationMode || 'DETERMINISTIC_VERIFICATION'
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Single material claim + valid DIRECT support
  // ─────────────────────────────────────────────────────────────
  it('1. should evaluate Single material claim + valid DIRECT support as SUPPORTED / SUFFICIENT / ANSWERED', () => {
    const interpretation = {
      originalQuestion: 'ما الدليل على وحدانية الله؟',
      isPersonalFatwa: false,
      needsClarification: false,
      claimsToResolve: [
        {
          claimId: 'claim-1',
          statement: 'قل هو الله أحد دليل قطعي على وحدانية الله المطلقة',
          importance: 'CORE'
        }
      ]
    };

    const verificationResult = {
      verificationId: 'vfy_001',
      queryId: 'qret_001',
      claims: [
        {
          claimId: 'claim-1',
          evidence: [
            makeMockEvidence({
              claimId: 'claim-1',
              relation: 'DIRECT',
              supportsClaim: true,
              contradictsClaim: false
            })
          ]
        }
      ]
    };

    const result = service.evaluateSufficiency({ interpretation, verificationResult });

    assert.equal(result.overallSufficiency, OVERALL_SUFFICIENCY.SUFFICIENT);
    assert.equal(result.routing, SUFFICIENCY_ROUTING.ANSWERED);
    assert.equal(result.claims.length, 1);
    assert.equal(result.claims[0].status, CLAIM_SUFFICIENCY_STATUS.SUPPORTED);
    assert.equal(result.claims[0].metrics.directSupportCount, 1);
    assert.equal(result.claims[0].hasContradiction, false);
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Valid SUPPORTING evidence aggregation
  // ─────────────────────────────────────────────────────────────
  it('2. should evaluate multiple distinct SUPPORTING evidence items as SUPPORTED via aggregation', () => {
    const interpretation = {
      originalQuestion: 'ما فضل بر الوالدين في السنة النبوية؟',
      claimsToResolve: [
        {
          claimId: 'claim-birr',
          statement: 'بر الوالدين من أعظم القربات وأفضل الأعمال بعد الصلاة في السنة النبوية',
          importance: 'CORE'
        }
      ]
    };

    const verificationResult = {
      claims: [
        {
          claimId: 'claim-birr',
          evidence: [
            makeMockEvidence({
              evidenceId: 'ev_hadith_1',
              chunkId: 'chk_hadith_1',
              relation: 'SUPPORTING',
              supportsClaim: true,
              contradictsClaim: false,
              text: 'أي العمل أحب إلى الله؟ قال: الصلاة على وقتها، قلت: ثم أي؟ قال: ثم بر الوالدين'
            }),
            makeMockEvidence({
              evidenceId: 'ev_hadith_2',
              chunkId: 'chk_hadith_2',
              relation: 'SUPPORTING',
              supportsClaim: true,
              contradictsClaim: false,
              text: 'رضا الرب في رضا الوالد وسخط الرب في سخط الوالد'
            })
          ]
        }
      ]
    };

    const result = service.evaluateSufficiency({ interpretation, verificationResult });

    assert.equal(result.overallSufficiency, OVERALL_SUFFICIENCY.SUFFICIENT);
    assert.equal(result.routing, SUFFICIENCY_ROUTING.ANSWERED);
    assert.equal(result.claims[0].status, CLAIM_SUFFICIENCY_STATUS.SUPPORTED);
    assert.equal(result.claims[0].metrics.supportingCount, 2);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. CONTEXTUAL-only evidence -> not SUPPORTED (PARTIAL)
  // ─────────────────────────────────────────────────────────────
  it('3. should evaluate CONTEXTUAL-only evidence as PARTIAL and NEVER SUPPORTED', () => {
    const interpretation = {
      originalQuestion: 'ما شروط عقد الاستصناع في الفقه الإسلامي؟',
      claimsToResolve: [
        {
          claimId: 'claim-istisna',
          statement: 'شروط صحة عقد الاستصناع في المذاهب الفقهية الأربعة',
          importance: 'CORE'
        }
      ]
    };

    const verificationResult = {
      claims: [
        {
          claimId: 'claim-istisna',
          evidence: [
            makeMockEvidence({
              relation: 'CONTEXTUAL',
              supportsClaim: true,
              contradictsClaim: false,
              text: 'عقد الاستصناع من عقود المعاوضات المالية وتجوز فيه المعاملات لحاجة الناس'
            })
          ]
        }
      ]
    };

    const result = service.evaluateSufficiency({ interpretation, verificationResult });

    assert.notEqual(result.claims[0].status, CLAIM_SUFFICIENCY_STATUS.SUPPORTED);
    assert.equal(result.claims[0].status, CLAIM_SUFFICIENCY_STATUS.PARTIAL);
    assert.equal(result.overallSufficiency, OVERALL_SUFFICIENCY.PARTIAL);
    assert.equal(result.routing, SUFFICIENCY_ROUTING.PARTIAL);
  });

  // ─────────────────────────────────────────────────────────────
  // 4. INCIDENTAL-only evidence -> not SUPPORTED (UNSUPPORTED)
  // ─────────────────────────────────────────────────────────────
  it('4. should evaluate INCIDENTAL-only evidence as UNSUPPORTED and NEVER SUPPORTED', () => {
    const interpretation = {
      originalQuestion: 'ما تعريف الفتنة اصطلاحاً؟',
      claimsToResolve: [
        {
          claimId: 'claim-fitnah',
          statement: 'تعريف الفتنة اصطلاحا عند علماء الشريعة',
          importance: 'CORE'
        }
      ]
    };

    const verificationResult = {
      claims: [
        {
          claimId: 'claim-fitnah',
          evidence: [
            makeMockEvidence({
              relation: 'INCIDENTAL',
              supportsClaim: false,
              contradictsClaim: false,
              text: 'وفيه تحريم الكذب لما يؤدي إليه من الفتنة بين المسلمين'
            })
          ]
        }
      ]
    };

    const result = service.evaluateSufficiency({ interpretation, verificationResult });

    assert.notEqual(result.claims[0].status, CLAIM_SUFFICIENCY_STATUS.SUPPORTED);
    assert.equal(result.claims[0].status, CLAIM_SUFFICIENCY_STATUS.UNSUPPORTED);
    assert.equal(result.overallSufficiency, OVERALL_SUFFICIENCY.INSUFFICIENT);
    assert.equal(result.routing, SUFFICIENCY_ROUTING.INSUFFICIENT);
  });

  // ─────────────────────────────────────────────────────────────
  // 5. UNRELATED-only evidence -> not SUPPORTED (UNSUPPORTED)
  // ─────────────────────────────────────────────────────────────
  it('5. should evaluate UNRELATED-only evidence as UNSUPPORTED and INSUFFICIENT', () => {
    const interpretation = {
      originalQuestion: 'ما مواقيت الصلاة؟',
      claimsToResolve: [
        {
          claimId: 'claim-salat',
          statement: 'تحديد مواقيت الصلوات الخمس اليومية',
          importance: 'CORE'
        }
      ]
    };

    const verificationResult = {
      claims: [
        {
          claimId: 'claim-salat',
          evidence: [
            makeMockEvidence({
              relation: 'UNRELATED',
              supportsClaim: false,
              contradictsClaim: false,
              text: 'شروط تذكية بهيمة الأنعام في الفقه الإسلامي'
            })
          ]
        }
      ]
    };

    const result = service.evaluateSufficiency({ interpretation, verificationResult });

    assert.equal(result.claims[0].status, CLAIM_SUFFICIENCY_STATUS.UNSUPPORTED);
    assert.equal(result.overallSufficiency, OVERALL_SUFFICIENCY.INSUFFICIENT);
    assert.equal(result.routing, SUFFICIENCY_ROUTING.INSUFFICIENT);
  });

  // ─────────────────────────────────────────────────────────────
  // 6. DIRECT contradiction
  // ─────────────────────────────────────────────────────────────
  it('6. should evaluate DIRECT contradiction as explicitly contradicted and UNSUPPORTED', () => {
    const interpretation = {
      originalQuestion: 'هل الربا جائز بالتراضي؟',
      claimsToResolve: [
        {
          claimId: 'claim-riba-halal',
          statement: 'الربا حلال وجائز شرعاً إذا تراضى الطرفان',
          importance: 'CORE'
        }
      ]
    };

    const verificationResult = {
      claims: [
        {
          claimId: 'claim-riba-halal',
          evidence: [
            makeMockEvidence({
              relation: 'DIRECT',
              supportsClaim: false,
              contradictsClaim: true,
              text: 'وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا'
            })
          ]
        }
      ]
    };

    const result = service.evaluateSufficiency({ interpretation, verificationResult });

    assert.equal(result.claims[0].status, CLAIM_SUFFICIENCY_STATUS.UNSUPPORTED);
    assert.equal(result.claims[0].hasContradiction, true);
    assert.equal(result.claims[0].metrics.directContradictionCount, 1);
    assert.equal(result.claims[0].metrics.directSupportCount, 0);
    assert.equal(result.overallSufficiency, OVERALL_SUFFICIENCY.INSUFFICIENT);
    assert.equal(result.routing, SUFFICIENCY_ROUTING.INSUFFICIENT);
  });

  // ─────────────────────────────────────────────────────────────
  // 7. DIRECT support + DIRECT contradiction -> conflict / not SUFFICIENT
  // ─────────────────────────────────────────────────────────────
  it('7. should evaluate DIRECT support + DIRECT contradiction as conflicted and NOT SUFFICIENT', () => {
    const interpretation = {
      originalQuestion: 'هل تصح الصلاة في المقبرة؟',
      claimsToResolve: [
        {
          claimId: 'claim-maqbara',
          statement: 'صحة الصلاة في المقبرة مطلقا',
          importance: 'CORE'
        }
      ]
    };

    const verificationResult = {
      claims: [
        {
          claimId: 'claim-maqbara',
          evidence: [
            makeMockEvidence({
              evidenceId: 'ev_direct_sup',
              chunkId: 'chk_earth_mosque',
              relation: 'DIRECT',
              supportsClaim: true,
              contradictsClaim: false,
              text: 'جعلت لي الأرض مسجدا وطهورا'
            }),
            makeMockEvidence({
              evidenceId: 'ev_direct_contra',
              chunkId: 'chk_except_graveyard',
              relation: 'DIRECT',
              supportsClaim: false,
              contradictsClaim: true,
              text: 'الأرض كلها مسجد إلا المقبرة والحمام'
            })
          ]
        }
      ]
    };

    const result = service.evaluateSufficiency({ interpretation, verificationResult });

    assert.notEqual(result.overallSufficiency, OVERALL_SUFFICIENCY.SUFFICIENT);
    assert.equal(result.overallSufficiency, OVERALL_SUFFICIENCY.PARTIAL);
    assert.equal(result.routing, SUFFICIENCY_ROUTING.PARTIAL);
    assert.equal(result.claims[0].hasConflict, true);
    assert.equal(result.claims[0].hasContradiction, true);
    assert.equal(result.claims[0].status, CLAIM_SUFFICIENCY_STATUS.PARTIAL);
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Multiple material claims all supported -> SUFFICIENT
  // ─────────────────────────────────────────────────────────────
  it('8. should evaluate Multiple material claims all supported as SUFFICIENT / ANSWERED', () => {
    const interpretation = {
      originalQuestion: 'ما حكم قراءة الفاتحة وسورة الإخلاص في الركعة الأولى؟',
      claimsToResolve: [
        {
          claimId: 'claim-fatihah',
          statement: 'وجوب قراءة سورة الفاتحة في كل ركعة من ركعات الصلاة',
          importance: 'CORE'
        },
        {
          claimId: 'claim-ikhlas',
          statement: 'مشروعية قراءة سورة بعد الفاتحة في الركعة الأولى',
          importance: 'CORE'
        }
      ]
    };

    const verificationResult = {
      claims: [
        {
          claimId: 'claim-fatihah',
          evidence: [
            makeMockEvidence({
              claimId: 'claim-fatihah',
              relation: 'DIRECT',
              supportsClaim: true,
              contradictsClaim: false,
              text: 'لا صلاة لمن لم يقرأ بفاتحة الكتاب'
            })
          ]
        },
        {
          claimId: 'claim-ikhlas',
          evidence: [
            makeMockEvidence({
              claimId: 'claim-ikhlas',
              relation: 'DIRECT',
              supportsClaim: true,
              contradictsClaim: false,
              text: 'كان يقرأ في الركعتين الأوليين بفاتحة الكتاب وسورتين'
            })
          ]
        }
      ]
    };

    const result = service.evaluateSufficiency({ interpretation, verificationResult });

    assert.equal(result.overallSufficiency, OVERALL_SUFFICIENCY.SUFFICIENT);
    assert.equal(result.routing, SUFFICIENCY_ROUTING.ANSWERED);
    assert.equal(result.claims.length, 2);
    assert.equal(result.claims[0].status, CLAIM_SUFFICIENCY_STATUS.SUPPORTED);
    assert.equal(result.claims[1].status, CLAIM_SUFFICIENCY_STATUS.SUPPORTED);
    assert.equal(result.summary.supportedClaims, 2);
    assert.equal(result.summary.unsupportedClaims, 0);
  });

  // ─────────────────────────────────────────────────────────────
  // 9. Multiple material claims with one missing/unsupported -> PARTIAL
  // ─────────────────────────────────────────────────────────────
  it('9. should evaluate Multiple material claims with one unsupported as PARTIAL / PARTIAL', () => {
    const interpretation = {
      originalQuestion: 'ما حكم الزكاة وما هي شروطها في العملات الرقمية الحديثة؟',
      claimsToResolve: [
        {
          claimId: 'claim-zakat-obligation',
          statement: 'وجوب الزكاة في الأموال الزكوية',
          importance: 'CORE'
        },
        {
          claimId: 'claim-crypto-rules',
          statement: 'شروط وجوب الزكاة ونصابها المحدد في العملات المشفرة',
          importance: 'CORE'
        }
      ]
    };

    const verificationResult = {
      claims: [
        {
          claimId: 'claim-zakat-obligation',
          evidence: [
            makeMockEvidence({
              claimId: 'claim-zakat-obligation',
              relation: 'DIRECT',
              supportsClaim: true,
              contradictsClaim: false,
              text: 'وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ'
            })
          ]
        },
        {
          claimId: 'claim-crypto-rules',
          evidence: [] // zero evidence retrieved
        }
      ]
    };

    const result = service.evaluateSufficiency({ interpretation, verificationResult });

    assert.equal(result.overallSufficiency, OVERALL_SUFFICIENCY.PARTIAL);
    assert.equal(result.routing, SUFFICIENCY_ROUTING.PARTIAL);
    assert.equal(result.claims[0].status, CLAIM_SUFFICIENCY_STATUS.SUPPORTED);
    assert.equal(result.claims[1].status, CLAIM_SUFFICIENCY_STATUS.UNSUPPORTED);
  });

  // ─────────────────────────────────────────────────────────────
  // 10. All material claims unsupported -> INSUFFICIENT
  // ─────────────────────────────────────────────────────────────
  it('10. should evaluate All material claims unsupported as INSUFFICIENT / INSUFFICIENT', () => {
    const interpretation = {
      originalQuestion: 'سؤال غير مستوفى بالأدلة',
      claimsToResolve: [
        {
          claimId: 'claim-1',
          statement: 'ادعاء أول غير مثبت',
          importance: 'CORE'
        },
        {
          claimId: 'claim-2',
          statement: 'ادعاء ثان غير مثبت',
          importance: 'CORE'
        }
      ]
    };

    const verificationResult = {
      claims: [
        {
          claimId: 'claim-1',
          evidence: [makeMockEvidence({ relation: 'UNRELATED', supportsClaim: false })]
        },
        {
          claimId: 'claim-2',
          evidence: [makeMockEvidence({ relation: 'INCIDENTAL', supportsClaim: false })]
        }
      ]
    };

    const result = service.evaluateSufficiency({ interpretation, verificationResult });

    assert.equal(result.overallSufficiency, OVERALL_SUFFICIENCY.INSUFFICIENT);
    assert.equal(result.routing, SUFFICIENCY_ROUTING.INSUFFICIENT);
    assert.equal(result.claims[0].status, CLAIM_SUFFICIENCY_STATUS.UNSUPPORTED);
    assert.equal(result.claims[1].status, CLAIM_SUFFICIENCY_STATUS.UNSUPPORTED);
  });

  // ─────────────────────────────────────────────────────────────
  // 11. No evidence at all -> INSUFFICIENT
  // ─────────────────────────────────────────────────────────────
  it('11. should evaluate No evidence as INSUFFICIENT / INSUFFICIENT', () => {
    const interpretation = {
      originalQuestion: 'مسألة خارج النطاق المعرفي تماماً',
      claimsToResolve: [
        {
          claimId: 'claim-ood',
          statement: 'دعوى تفصيلية في فيزياء الكم المعاصرة',
          importance: 'CORE'
        }
      ]
    };

    const verificationResult = {
      claims: [
        {
          claimId: 'claim-ood',
          evidence: []
        }
      ]
    };

    const result = service.evaluateSufficiency({ interpretation, verificationResult });

    assert.equal(result.overallSufficiency, OVERALL_SUFFICIENCY.INSUFFICIENT);
    assert.equal(result.routing, SUFFICIENCY_ROUTING.INSUFFICIENT);
    assert.equal(result.claims[0].status, CLAIM_SUFFICIENCY_STATUS.UNSUPPORTED);
    assert.equal(result.claims[0].metrics.totalEvidence, 0);
  });

  // ─────────────────────────────────────────────────────────────
  // 12. Personal fatwa -> REFER_TO_AUTHORITY
  // ─────────────────────────────────────────────────────────────
  it('12. should immediately route Personal fatwa to REFER_TO_AUTHORITY regardless of evidence', () => {
    const interpretation = {
      originalQuestion: 'طلقت زوجتي طلقة واحدة في طهر جامعتها فيه وأنا غضبان هل يقع طلاقي؟',
      isPersonalFatwa: true,
      needsClarification: false,
      claimsToResolve: [
        {
          claimId: 'claim-fatwa',
          statement: 'حكم وقوع طلاق الغضبان في طهر جامع فيه',
          importance: 'CORE'
        }
      ]
    };

    const verificationResult = {
      claims: [
        {
          claimId: 'claim-fatwa',
          evidence: [
            makeMockEvidence({ relation: 'DIRECT', supportsClaim: true })
          ]
        }
      ]
    };

    const result = service.evaluateSufficiency({ interpretation, verificationResult });

    assert.equal(result.routing, SUFFICIENCY_ROUTING.REFER_TO_AUTHORITY);
    assert.equal(result.overallSufficiency, OVERALL_SUFFICIENCY.INSUFFICIENT);
    assert.ok(result.reason.includes('فتوى شخصية خاصة'));
  });

  // ─────────────────────────────────────────────────────────────
  // 13. Missing referent / needs clarification -> NEEDS_CLARIFICATION
  // ─────────────────────────────────────────────────────────────
  it('13. should immediately route Ambiguous questions to NEEDS_CLARIFICATION regardless of evidence', () => {
    const interpretation = {
      originalQuestion: 'هل هذا الحديث صحيح؟',
      isPersonalFatwa: false,
      needsClarification: true,
      clarificationReason: 'السؤال مبهم يفتقر إلى متن الحديث أو راويه أو سنده المراد التحقق منه.',
      claimsToResolve: []
    };

    const verificationResult = {
      claims: []
    };

    const result = service.evaluateSufficiency({ interpretation, verificationResult });

    assert.equal(result.routing, SUFFICIENCY_ROUTING.NEEDS_CLARIFICATION);
    assert.equal(result.overallSufficiency, OVERALL_SUFFICIENCY.INSUFFICIENT);
    assert.ok(result.reason.includes('السؤال مبهم'));
  });

  // ─────────────────────────────────────────────────────────────
  // 14. Material VERIFICATION_ERROR -> SERVICE_ERROR
  // ─────────────────────────────────────────────────────────────
  it('14. should route Material VERIFICATION_ERROR to SERVICE_ERROR instead of UNSUPPORTED', () => {
    const interpretation = {
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

    const verificationResult = {
      claims: [
        {
          claimId: 'claim-khuff',
          evidence: [
            makeMockEvidence({
              evidenceId: 'ev_err_1',
              relation: null,
              verificationStatus: 'VERIFICATION_ERROR',
              supportsClaim: false,
              contradictsClaim: false,
              reason: 'فشل التحقق عبر الذكاء الاصطناعي بسبب نفاد محاولات إعادة الاتصال.'
            })
          ]
        }
      ]
    };

    const result = service.evaluateSufficiency({ interpretation, verificationResult });

    assert.equal(result.routing, SUFFICIENCY_ROUTING.SERVICE_ERROR);
    assert.equal(result.claims[0].hasVerificationError, true);
    assert.equal(result.claims[0].isBlockedByServiceError, true);
    assert.ok(result.reason.includes('خطأ تشغيلي'));
  });

  // ─────────────────────────────────────────────────────────────
  // 15. Duplicate evidence -> must not inflate support
  // ─────────────────────────────────────────────────────────────
  it('15. should deduplicate evidence and not inflate a single supporting piece into SUPPORTED', () => {
    const claim = {
      claimId: 'claim-dup-test',
      statement: 'دعوى اختبار التكرار',
      importance: 'CORE'
    };

    // A single supporting evidence item duplicated 3 times with same chunkId
    const duplicatedEvidence = [
      makeMockEvidence({
        evidenceId: 'ev_dup_1',
        chunkId: 'chk_duplicate_fixed',
        relation: 'SUPPORTING',
        supportsClaim: true,
        contradictsClaim: false
      }),
      makeMockEvidence({
        evidenceId: 'ev_dup_1', // duplicate evidenceId
        chunkId: 'chk_duplicate_fixed',
        relation: 'SUPPORTING',
        supportsClaim: true,
        contradictsClaim: false
      }),
      makeMockEvidence({
        evidenceId: 'ev_dup_alt',
        chunkId: 'chk_duplicate_fixed', // duplicate chunkId
        relation: 'SUPPORTING',
        supportsClaim: true,
        contradictsClaim: false
      })
    ];

    const evalResult = evaluateClaimSufficiency({
      claim,
      evidence: duplicatedEvidence
    });

    // Without deduplication, 3 pieces would become SUPPORTED.
    // With strict deduplication, only 1 unique piece remains -> PARTIAL!
    assert.equal(evalResult.metrics.totalEvidence, 3);
    assert.equal(evalResult.metrics.deduplicatedEvidence, 1);
    assert.equal(evalResult.metrics.duplicateCount, 2);
    assert.equal(evalResult.metrics.supportingCount, 1);
    assert.equal(evalResult.status, CLAIM_SUFFICIENCY_STATUS.PARTIAL, 'Must remain PARTIAL because duplicate did not inflate to >= 2');
  });

  // ─────────────────────────────────────────────────────────────
  // 16. Identifiers/provenance preserved
  // ─────────────────────────────────────────────────────────────
  it('16. should strictly preserve upstream claimId, evidenceId, chunkId, recordId, sourceId, and reference metadata', () => {
    const claim = {
      claimId: 'c_prov_007',
      statement: 'إثبات الحفاظ على سلسلة الإسناد المعرفي',
      importance: 'CORE'
    };

    const evidence = [
      makeMockEvidence({
        evidenceId: 'ev_prov_alpha',
        claimId: 'c_prov_007',
        chunkId: 'chk_dorar_aqeedah_1',
        recordId: 'rec_dorar_aqeedah',
        sourceId: 'src_dorar_aqeedah',
        sourceName: 'الموسوعة العقدية - الدرر السنية',
        sourceUrl: 'https://dorar.net/aqeedah',
        title: 'أركان الإيمان',
        section: 'الإيمان بالله',
        reference: { book: 'الموسوعة العقدية', volume: 1, page: 45 },
        attribution: { author: 'فريق الدرر السنية' },
        relation: 'DIRECT',
        supportsClaim: true
      })
    ];

    const evalResult = evaluateClaimSufficiency({ claim, evidence });

    assert.equal(evalResult.claimId, 'c_prov_007');
    assert.equal(evalResult.supportingEvidence.length, 1);
    const ev = evalResult.supportingEvidence[0];
    assert.equal(ev.evidenceId, 'ev_prov_alpha');
    assert.equal(ev.chunkId, 'chk_dorar_aqeedah_1');
    assert.equal(ev.recordId, 'rec_dorar_aqeedah');
    assert.equal(ev.sourceId, 'src_dorar_aqeedah');
    assert.equal(ev.sourceName, 'الموسوعة العقدية - الدرر السنية');
    assert.equal(ev.sourceUrl, 'https://dorar.net/aqeedah');
    assert.deepEqual(ev.reference, { book: 'الموسوعة العقدية', volume: 1, page: 45 });
    assert.deepEqual(ev.attribution, { author: 'فريق الدرر السنية' });
  });

  // ─────────────────────────────────────────────────────────────
  // 17. Phase 5 DIRECT contradiction semantics preserved correctly
  // ─────────────────────────────────────────────────────────────
  it('17. should preserve Phase 5 DIRECT contradiction semantics and separate relation from polarity', () => {
    const claim = {
      claimId: 'c_contra_sem',
      statement: 'حديث موضوع مكذوب يُدعى صحته',
      importance: 'CORE'
    };

    const evidence = [
      makeMockEvidence({
        relation: 'DIRECT',
        supportsClaim: false,
        contradictsClaim: true,
        reason: 'نص التخريج يثبت حكم المحدثين بوضع الحديث وبطلانه'
      })
    ];

    const evalResult = evaluateClaimSufficiency({ claim, evidence });

    // Must be classified under contradictingEvidence, not supportingEvidence
    assert.equal(evalResult.supportingEvidence.length, 0);
    assert.equal(evalResult.contradictingEvidence.length, 1);
    assert.equal(evalResult.hasContradiction, true);
    assert.equal(evalResult.hasConflict, false);
    assert.equal(evalResult.status, CLAIM_SUFFICIENCY_STATUS.UNSUPPORTED);
    assert.ok(evalResult.reason.includes('تدحض وتناقض'));
  });
});
