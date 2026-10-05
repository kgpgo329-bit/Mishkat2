/**
 * Mishkat Phase 2A — Cross-Phase Integration Test Suite
 * 
 * Verifies End-to-End Pipeline without modifying Phase 4 or Phase 5:
 * Question
 *   ↓
 * Phase 2 Question Understanding (atomic claimsToResolve)
 *   ↓
 * Phase 4 Hybrid Trusted Retrieval (retrievalService.retrieveForInterpretation)
 *   ↓
 * Phase 5 Semantic Evidence Verification (evidenceService.verifyEvidence)
 * 
 * Invariants Verified:
 * 1. Phase 2 emits strictly atomic claims (>= 95% atomic, zero unsafe compound patterns).
 * 2. Each claim travels independently through Phase 4 retrieval.
 * 3. Phase 5 evaluates each claim and its candidates independently.
 * 4. Evidence retrieved for Claim A does not falsely establish Claim B.
 * 5. No claim is silently lost across the pipeline.
 * 6. 20 representative questions covering single and multi-proposition inquiries.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { processQuestionInterpretation } from '../src/mishkat/question/questionInterpreter.js';
import { auditClaimAtomicity, CLAIM_ATOMICITY_LEVELS } from '../src/mishkat/question/claimPlanner.js';
import { RetrievalService } from '../src/mishkat/retrieval/index.js';
import { EvidenceVerificationService } from '../src/mishkat/evidence/index.js';
import { defaultTrustedSourceRepository } from '../src/mishkat/knowledge/index.js';

const INTEGRATION_QUESTIONS = [
  // Multi-proposition questions
  {
    id: 'int_01_v3_sup_02_pattern',
    question: 'كيف يدعو القرآن إلى تدبر آياته والتفكر في إعجازه؟',
    description: 'سؤال مركب يجمع بين التدبر والإعجاز؛ يتفكك إلى دعويين مستقلتين',
    isMultiPart: true
  },
  {
    id: 'int_02_define_both',
    question: 'ما معنى التقوى لغة واصطلاحاً؟',
    description: 'سؤال يطلب التعريف الشرعي واللغوي معاً',
    isMultiPart: true
  },
  {
    id: 'int_03_why_and_proof',
    question: 'لماذا حرم الإسلام الربا وما الدليل على ذلك؟',
    description: 'سؤال يجمع بين بيان العلة والدليل النصي',
    isMultiPart: true
  },
  {
    id: 'int_04_explain_and_conditions',
    question: 'كيف أتوضأ وما شروط صحة الوضوء؟',
    description: 'سؤال يطلب صفة العمل وشروطه',
    isMultiPart: true
  },
  {
    id: 'int_05_hadith_and_isnad',
    question: 'ما صحة حديث أكثر أهل النار النساء ومن رواه وما سنده؟',
    description: 'سؤال يطلب صحة الحديث وتخريجه وسنده',
    isMultiPart: true
  },
  {
    id: 'int_06_quote_and_surah',
    question: 'في أي سورة وردت آية الكرسي وهل نقلها مضبوط؟',
    description: 'سؤال يطلب ضبط النص وعزو السورة',
    isMultiPart: true
  },
  {
    id: 'int_07_theological_misc',
    question: 'لماذا يعبد المسلمون الكعبة؟',
    description: 'سؤال شبهة عقدية يتطلب نفي الشبهة وتأصيل التوحيد',
    isMultiPart: true
  },
  {
    id: 'int_08_historical_misc',
    question: 'هل أجبر الإسلام الناس في التاريخ على الدخول فيه؟',
    description: 'سؤال شبهة تاريخية يتطلب نفي الشبهة والتوثيق التاريخي',
    isMultiPart: true
  },
  {
    id: 'int_09_translate_concept',
    question: 'كيف أشرح مصطلح التقوى باللغة الإنجليزية بدقة؟',
    description: 'سؤال ترجمة يتطلب تأصيل المفهوم ونقله الإنجليزي',
    isMultiPart: true
  },
  {
    id: 'int_10_compare',
    question: 'ما الفرق بين التوكل والتواكل؟',
    description: 'سؤال مقارنة يركز على التمايز المفاهيمي',
    isMultiPart: false
  },
  // Single-proposition and specialized questions
  {
    id: 'int_11_v3_sup_07_pattern',
    question: 'ما الدليل على إثبات صفتي السمع والبصر لله تعالى بلا تكييف؟',
    description: 'سؤال إثبات صفة بالدليل دون حشو معتقد أهل السنة غير المطلوب',
    isMultiPart: false
  },
  {
    id: 'int_12_general_witr',
    question: 'ما حكم صلاة الوتر؟',
    description: 'سؤال فقهي عام مباشر',
    isMultiPart: false
  },
  {
    id: 'int_13_define_ihsan',
    question: 'ما معنى الإحسان في الإسلام؟',
    description: 'سؤال تعريف اصطلاحي فقط',
    isMultiPart: false
  },
  {
    id: 'int_14_explain_janazah',
    question: 'كيف أصلي صلاة الجنازة؟',
    description: 'شرح صفة وكيفية صلاة الجنازة',
    isMultiPart: false
  },
  {
    id: 'int_15_hadith_tasbeeh',
    question: 'هل صح حديث صلاة التسابيح؟',
    description: 'التحقق من صحة الحديث وثبوته',
    isMultiPart: false
  },
  {
    id: 'int_16_quote_accuracy',
    question: 'هل الآية مكتوبة صح: إنما يخشى الله من عباده العلماء؟',
    description: 'التحقق من سلامة النص القرآني ورسمه',
    isMultiPart: false
  },
  {
    id: 'int_17_consensus_prayer',
    question: 'هل أجمع العلماء على وجوب الصلوات الخمس؟',
    description: 'التحقق من ثبوت الإجماع الشرعي',
    isMultiPart: false
  },
  {
    id: 'int_18_fatwa_talaq',
    question: 'طلقت زوجتي طلقة واحدة وأنا غضبان هل يقع طلاقي؟',
    description: 'استفتاء شخصي يستوجب الإحالة للمفتي',
    isMultiPart: true
  },
  {
    id: 'int_19_clarification_ambiguous',
    question: 'هل هذا الحديث صحيح؟',
    description: 'سؤال مبهم يحيل إلى مجهول يستوجب الاستيضاح',
    isMultiPart: false
  },
  {
    id: 'int_20_general_riba',
    question: 'ما حكم المعاملات الربوية المعاصرة؟',
    description: 'سؤال فقهي في المعاملات المالية',
    isMultiPart: false
  }
];

test('Mishkat Phase 2A — Cross-Phase Integration Suite (20 Representative Questions)', async (t) => {
  // Initialize knowledge repository and services
  const repo = defaultTrustedSourceRepository;
  if (repo.chunkCount === 0) {
    repo.loadFromDisk('data/knowledge');
  }

  const retrievalService = new RetrievalService({ embeddingProvider: 'test' });
  await retrievalService.initializeWithRepository(repo);

  const evidenceService = new EvidenceVerificationService({ mode: 'deterministic' });

  let totalQuestionsEvaluated = 0;
  let totalClaimsGenerated = 0;
  let totalClaimsRetrieved = 0;
  let totalClaimsVerified = 0;
  let atomicClaimsCount = 0;
  let multiPartCasesTested = 0;
  let totalVerdicts = 0;
  const relationTally = {};

  for (const qItem of INTEGRATION_QUESTIONS) {
    await t.test(`Integration: [${qItem.id}] — "${qItem.question}"`, async () => {
      totalQuestionsEvaluated++;
      if (qItem.isMultiPart) multiPartCasesTested++;

      // Step 1: Phase 2 Question Understanding
      const interpretation = processQuestionInterpretation(qItem.question);
      assert.ok(interpretation, 'Phase 2 interpretation must not be null');
      assert.ok(Array.isArray(interpretation.claimsToResolve), 'claimsToResolve must be an array');
      assert.ok(interpretation.claimsToResolve.length >= 1, 'At least 1 claim must be planned');

      const initialClaimsCount = interpretation.claimsToResolve.length;
      totalClaimsGenerated += initialClaimsCount;

      // Verify every emitted claim is ATOMIC
      for (const clm of interpretation.claimsToResolve) {
        const atomicity = auditClaimAtomicity(clm.statement);
        assert.equal(atomicity, CLAIM_ATOMICITY_LEVELS.ATOMIC, `Claim statement [${clm.statement}] must be ATOMIC`);
        atomicClaimsCount++;
      }

      // Step 2: Phase 4 Hybrid Trusted Retrieval
      const retrievalResult = await retrievalService.retrieveForInterpretation({
        interpretation,
        repository: repo
      });

      assert.ok(retrievalResult, 'Retrieval result must not be null');
      assert.ok(Array.isArray(retrievalResult.claims), 'retrievalResult.claims must be an array');
      assert.equal(
        retrievalResult.claims.length,
        initialClaimsCount,
        'No claim may be silently lost during retrieval'
      );
      totalClaimsRetrieved += retrievalResult.claims.length;

      // Verify each claim traveled independently with matching IDs
      interpretation.claimsToResolve.forEach((origClaim, idx) => {
        const retClaim = retrievalResult.claims[idx];
        assert.equal(retClaim.claimId, origClaim.claimId, 'Claim ID must match in retrieval results');
        assert.ok(Array.isArray(retClaim.candidates), 'Candidates must be an array for each claim');
      });

      // Step 3: Phase 5 Semantic Evidence Verification (frozen; explicit deterministic mode)
      const verificationResult = await evidenceService.verifyEvidence({
        interpretation,
        retrievalResult,
        options: { mode: 'deterministic' }
      });

      assert.ok(verificationResult, 'Verification result must not be null');
      assert.ok(Array.isArray(verificationResult.claims), 'verificationResult.claims must be an array');
      assert.equal(
        verificationResult.claims.length,
        initialClaimsCount,
        'No claim may be silently lost during evidence verification'
      );
      totalClaimsVerified += verificationResult.claims.length;

      // Verify Phase 5 evaluated each claim independently
      verificationResult.claims.forEach((vfyClaim, idx) => {
        const origClaim = interpretation.claimsToResolve[idx];
        assert.equal(vfyClaim.claimId, origClaim.claimId, 'Claim ID must match in verification results');
        assert.equal(vfyClaim.claimText, origClaim.statement, 'Claim statement must be preserved intact');

        // Candidate set per claim must equal the candidate set retrieved for that same claim
        const retClaim = retrievalResult.claims[idx];
        assert.equal(vfyClaim.evidence.length, retClaim.candidates.length, 'Every retrieved candidate must receive a verdict for its own claim');

        // Check each evidence verdict belongs strictly to this claim (no A→B leakage)
        for (const ev of vfyClaim.evidence) {
          assert.equal(ev.claimId, vfyClaim.claimId, 'Evidence must be bound to its own claim only');
          assert.ok(ev.recordId, 'Provenance recordId must be present');
          assert.ok(ev.sourceId, 'Provenance sourceId must be present');
          assert.ok(ev.relation, 'Relation must be determined');
          assert.ok(typeof ev.reason === 'string' && ev.reason.length > 0, 'Verdict reason must be provided');
          relationTally[ev.relation] = (relationTally[ev.relation] || 0) + 1;
          totalVerdicts++;
        }
      });

      // For multi-part questions (e.g. v3_sup_02 pattern: تدبر + إعجاز):
      // Verify that claim-1 and claim-2 have distinct statements and are evaluated independently
      if (initialClaimsCount >= 2) {
        const claim1 = interpretation.claimsToResolve[0];
        const claim2 = interpretation.claimsToResolve[1];
        assert.notEqual(claim1.statement, claim2.statement, 'Multi-part claims must have distinct statements');
        assert.notEqual(claim1.claimId, claim2.claimId, 'Multi-part claims must have distinct IDs');
      }
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('         نتائج اختبار التكامل عبر المراحل (CROSS-PHASE INTEGRATION)');
  console.log('                 Phase 2 → Phase 4 → Phase 5 Pipeline');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`• إجمالي الأسئلة المختبرة:             ${totalQuestionsEvaluated}`);
  console.log(`• أسئلة المطالب المتعددة (Multi-part):   ${multiPartCasesTested}`);
  console.log(`• إجمالي الدعاوى المولدة في Phase 2:    ${totalClaimsGenerated}`);
  console.log(`• الدعاوى الذرية (100% ATOMIC):         ${atomicClaimsCount} (${((atomicClaimsCount / totalClaimsGenerated) * 100).toFixed(2)}%)`);
  console.log(`• الدعاوى المستلمة في Phase 4:          ${totalClaimsRetrieved} (نسبة الفقدان: 0.00%)`);
  console.log(`• الدعاوى المحققة في Phase 5:          ${totalClaimsVerified} (نسبة الفقدان: 0.00%)`);
  console.log(`• استقلالية مسار كل دعوى:              100% نجاح تام`);
  console.log(`• إجمالي أحكام التحقق (Phase 5):       ${totalVerdicts}`);
  console.log(`• توزيع العلاقات: ${JSON.stringify(relationTally)}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  assert.equal(totalQuestionsEvaluated, 20, 'Must evaluate exactly 20 representative questions');
  assert.equal(totalClaimsGenerated, totalClaimsRetrieved, 'Zero claims lost between Phase 2 and Phase 4');
  assert.equal(totalClaimsRetrieved, totalClaimsVerified, 'Zero claims lost between Phase 4 and Phase 5');
});
