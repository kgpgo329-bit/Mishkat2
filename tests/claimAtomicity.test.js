/**
 * Mishkat Phase 2A — Dedicated Claim Atomicity Development Test Suite
 * 
 * Verifies:
 * 1. Strict Claim Atomicity: ONE proposition = ONE claim item (Target: >= 95% atomic, <= 5% compound).
 * 2. ZERO known unsafe compound-claim patterns across the 8 affected task families:
 *    - DEFINE (No conjoining sharia + linguistic unless asked)
 *    - WHY (No conjoining wisdom + broad maqasid)
 *    - EXPLAIN (No conjoining procedure + conditions + sub-rulings)
 *    - VERIFY_HADITH (No conjoining authenticity + takhrij + isnad)
 *    - CORRECT_QUOTE (No conjoining orthography + surah location)
 *    - MISCONCEPTION (No conjoining sharia + historical)
 *    - TRANSLATE_CONCEPT (No conjoining sharia definition + linguistic origin)
 *    - COMPARE (Clear distinction without broad conjoining)
 * 3. User-intent preservation: DECOMPOSE, DO NOT ENRICH.
 * 4. Minimal Claim Set: No superfluous claims added.
 * 5. Structural patterns discovered in audit:
 *    - v3_sup_02 pattern (تدبر + إعجاز decomposed into 2 atomic claims)
 *    - v3_sup_07 pattern (إثبات الصفتين without unasked sectarian enrichment)
 * 6. Personal Fatwa and Clarification preservation.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { processQuestionInterpretation, TASK_FAMILIES } from '../src/mishkat/question/questionInterpreter.js';
import { auditClaimAtomicity, CLAIM_ATOMICITY_LEVELS } from '../src/mishkat/question/claimPlanner.js';
import { validateQuestionInterpretation } from '../src/mishkat/question/questionValidator.js';

const TEST_CASES = [
  // 1. Simple atomic question
  {
    id: 'atom_01_simple',
    question: 'ما حكم صلاة الوتر؟',
    expectedTask: TASK_FAMILIES.GENERAL,
    minClaims: 1,
    maxClaims: 1,
    description: 'سؤال بسيط ومباشر يولد دعوى ذرية واحدة'
  },
  // 2. Multi-part legitimate question
  {
    id: 'atom_02_multipart_define',
    question: 'ما معنى التقوى لغة واصطلاحاً؟',
    expectedTask: TASK_FAMILIES.DEFINE,
    minClaims: 2,
    maxClaims: 2,
    description: 'سؤال يطلب صراحة المعنى اللغوي والاصطلاحي معاً فيقسم إلى دعويين ذريتين'
  },
  // 3. DEFINE
  {
    id: 'atom_03_define_single',
    question: 'ما معنى الإحسان في الإسلام؟',
    expectedTask: TASK_FAMILIES.DEFINE,
    minClaims: 1,
    maxClaims: 1,
    description: 'تعريف اصطلاحي فقط دون إقحام المعنى اللغوي غير المطلوب'
  },
  {
    id: 'atom_04_define_linguistic',
    question: 'ما معنى الصلاة لغة؟',
    expectedTask: TASK_FAMILIES.DEFINE,
    minClaims: 1,
    maxClaims: 1,
    description: 'تعريف لغوي فقط دون إقحام التعريف الاصطلاحي'
  },
  // 4. WHY
  {
    id: 'atom_05_why_single',
    question: 'لماذا حرم الإسلام الربا؟',
    expectedTask: TASK_FAMILIES.WHY,
    minClaims: 1,
    maxClaims: 1,
    description: 'بيان حكمة/علة التحريم دون حشو مقاصد عامة غير مطلوبة'
  },
  {
    id: 'atom_06_why_with_proof',
    question: 'لماذا فرضت زكاة الفطر طعاماً وما الدليل على ذلك؟',
    expectedTask: TASK_FAMILIES.WHY,
    minClaims: 2,
    maxClaims: 2,
    description: 'سؤال يجمع بين الحكمة والدليل النصي فيقسم إلى دعويين'
  },
  // 5. EXPLAIN
  {
    id: 'atom_07_explain_single',
    question: 'كيف أصلي صلاة الجنازة؟',
    expectedTask: TASK_FAMILIES.EXPLAIN,
    minClaims: 1,
    maxClaims: 1,
    description: 'شرح الكيفية فقط دون دمج الشروط والأحكام التفصيلية في ذات الدعوى'
  },
  {
    id: 'atom_08_explain_with_conditions',
    question: 'كيف أتوضأ وما شروط صحة الوضوء؟',
    expectedTask: TASK_FAMILIES.EXPLAIN,
    minClaims: 2,
    maxClaims: 2,
    description: 'سؤال يطلب الكيفية والشروط صراحة فيقسم إلى دعويين'
  },
  // 6. VERIFY_HADITH
  {
    id: 'atom_09_hadith_single',
    question: 'هل صح حديث صلاة التسابيح؟',
    expectedTask: TASK_FAMILIES.VERIFY_HADITH,
    minClaims: 1,
    maxClaims: 1,
    description: 'التحقق من ثبوت الحديث وصحته كدعوى ذرية واحدة دون دمج الإسناد والتخريج'
  },
  {
    id: 'atom_10_hadith_with_isnad',
    question: 'ما صحة حديث أكثر أهل النار النساء ومن رواه وما سنده؟',
    expectedTask: TASK_FAMILIES.VERIFY_HADITH,
    minClaims: 2,
    maxClaims: 3,
    description: 'سؤال يستفهم عن الصحة ومخرج الحديث وسنده فيقسم إلى دعاوى ذرية مستقلة'
  },
  // 7. CORRECT_QUOTE
  {
    id: 'atom_11_quran_correct',
    question: 'هل الآية مكتوبة صح: إنما يخشى الله من عباده العلماء؟',
    expectedTask: TASK_FAMILIES.CORRECT_QUOTE,
    minClaims: 2,
    maxClaims: 2,
    description: 'التحقق من صحة النص القرآني وضبطه مع تصويب اللحن كدعاوى ذرية'
  },
  {
    id: 'atom_12_quran_surah_location',
    question: 'في أي سورة وردت آية الكرسي وهل نقلها مضبوط؟',
    expectedTask: TASK_FAMILIES.CORRECT_QUOTE,
    minClaims: 2,
    maxClaims: 2,
    description: 'ضبط النص القرآني وعزو السورة كدعويين مستقلتين'
  },
  // 8. MISCONCEPTION
  {
    id: 'atom_13_misc_theological',
    question: 'لماذا يعبد المسلمون الكعبة؟',
    expectedTask: TASK_FAMILIES.MISCONCEPTION,
    minClaims: 2,
    maxClaims: 2,
    description: 'نفي الافتراض الباطل وإثبات التوحيد دون خلط تاريخي'
  },
  {
    id: 'atom_14_misc_historical',
    question: 'هل أجبر الإسلام الناس في التاريخ على الدخول فيه؟',
    expectedTask: TASK_FAMILIES.MISCONCEPTION,
    minClaims: 2,
    maxClaims: 2,
    description: 'نفي الشبهة وإثبات الواقع التاريخي الموثق دون خلط فقهي'
  },
  // 9. TRANSLATE_CONCEPT
  {
    id: 'atom_15_translate',
    question: 'كيف أشرح مصطلح التقوى باللغة الإنجليزية بدقة؟',
    expectedTask: TASK_FAMILIES.TRANSLATE_CONCEPT,
    minClaims: 2,
    maxClaims: 2,
    description: 'تحرير المفهوم الشرعي أولاً ثم المقابل الإنجليزي دون دمج اللغوي والاصطلاحي'
  },
  // 10. COMPARE
  {
    id: 'atom_16_compare',
    question: 'ما الفرق بين التوكل والتواكل؟',
    expectedTask: TASK_FAMILIES.COMPARE,
    minClaims: 1,
    maxClaims: 2,
    description: 'بيان الفروق الجوهرية والتمايز المفاهيمي'
  },
  // 11. PERSONAL_FATWA
  {
    id: 'atom_17_fatwa',
    question: 'طلقت زوجتي طلقة واحدة وأنا غضبان هل يقع طلاقي؟',
    expectedTask: TASK_FAMILIES.PERSONAL_FATWA,
    minClaims: 2,
    maxClaims: 2,
    description: 'سلامة تصنيف الفتوى الشخصية والإحالة للجهات الرسمية'
  },
  // 12. CLARIFICATION
  {
    id: 'atom_18_clarification',
    question: 'هل هذا الحديث صحيح؟',
    expectedTask: TASK_FAMILIES.VERIFY_HADITH,
    needsClarification: true,
    minClaims: 1,
    maxClaims: 1,
    description: 'سؤال مبهم يحيل إلى مجهول يستوجب الاستيضاح دون اختلاق دعاوى'
  },
  // 13. Structural Regression Case: v3_sup_02 pattern (تدبر + إعجاز)
  {
    id: 'atom_19_v3_sup_02_pattern',
    question: 'كيف يدعو القرآن إلى تدبر آياته والتفكر في إعجازه؟',
    expectedTask: TASK_FAMILIES.EXPLAIN,
    minClaims: 2,
    maxClaims: 2,
    mustContainTopics: ['تدبر', 'إعجاز'],
    description: 'تفكيك دعوى التدبر والإعجاز إلى دعويين ذريتين مستقلتين تماماً'
  },
  // 14. Structural Regression Case: v3_sup_07 pattern (إثبات الصفتين بلا إقحام مذهبي)
  {
    id: 'atom_20_v3_sup_07_pattern',
    question: 'ما الدليل على إثبات صفتي السمع والبصر لله تعالى بلا تكييف؟',
    expectedTask: TASK_FAMILIES.GENERAL,
    minClaims: 1,
    maxClaims: 2,
    forbiddenPhrases: ['معتقد أهل السنة', 'مذهب أهل السنة'],
    description: 'قصر الدعوى على إثبات الصفتين بالدليل دون حشو عبارة "معتقد أهل السنة" غير المطلوبة'
  }
];

test('Mishkat Phase 2A — Dedicated Claim Atomicity Development Suite', async (t) => {
  let totalClaims = 0;
  let atomicClaims = 0;
  let compoundClaims = 0;
  let ambiguousClaims = 0;
  const violations = [];

  for (const tc of TEST_CASES) {
    await t.test(`Case [${tc.id}]: ${tc.question}`, () => {
      const result = processQuestionInterpretation(tc.question);

      // 1. Task classification preservation
      if (tc.expectedTask) {
        assert.equal(result.task, tc.expectedTask, `Task must match expected: ${tc.expectedTask}`);
      }

      // 2. Clarification preservation
      if (tc.needsClarification) {
        assert.equal(result.needsClarification, true, 'Clarification flag must be true');
        assert.ok(result.clarificationReason, 'Clarification reason must be present');
      }

      // 3. Personal fatwa preservation
      if (tc.expectedTask === 'PERSONAL_FATWA') {
        assert.equal(result.isPersonalFatwa, true, 'isPersonalFatwa must be true');
      }

      // 4. Schema validation
      const validation = validateQuestionInterpretation(result, tc.question);
      assert.equal(validation.isValid, true, `Validation failed: ${validation.errors.join(', ')}`);

      // 5. Claim count bounds
      const claims = result.claimsToResolve;
      assert.ok(claims && claims.length >= tc.minClaims, `Claims count (${claims?.length}) below minimum (${tc.minClaims})`);
      if (tc.maxClaims) {
        assert.ok(claims.length <= tc.maxClaims, `Claims count (${claims.length}) above maximum (${tc.maxClaims})`);
      }

      // 6. Inspect atomicity of each claim
      for (const clm of claims) {
        totalClaims++;
        const atomicity = auditClaimAtomicity(clm.statement);
        if (atomicity === CLAIM_ATOMICITY_LEVELS.ATOMIC) {
          atomicClaims++;
        } else if (atomicity === CLAIM_ATOMICITY_LEVELS.COMPOUND) {
          compoundClaims++;
          violations.push({ id: tc.id, statement: clm.statement, reason: 'COMPOUND' });
        } else {
          ambiguousClaims++;
          violations.push({ id: tc.id, statement: clm.statement, reason: 'AMBIGUOUS' });
        }

        // Statement quality
        assert.ok(clm.statement.split(' ').length >= 3, 'Claim statement must have at least 3 words');
        assert.ok(['CORE', 'SECONDARY'].includes(clm.importance), 'Importance must be CORE or SECONDARY');
        assert.ok(clm.requiredEvidenceType, 'Evidence type must be specified');
      }

      // 7. Forbidden phrases check (e.g. unasked enrichment)
      if (tc.forbiddenPhrases) {
        for (const clm of claims) {
          for (const phrase of tc.forbiddenPhrases) {
            assert.ok(
              !clm.statement.includes(phrase),
              `Claim statement [${clm.statement}] must NOT contain unasked enrichment [${phrase}]`
            );
          }
        }
      }

      // 8. Specific required coverage (e.g. v3_sup_02 pattern)
      if (tc.mustContainTopics) {
        for (const topicWord of tc.mustContainTopics) {
          const found = claims.some(c => c.statement.includes(topicWord));
          assert.ok(found, `Claims must cover the requested topic [${topicWord}] independently`);
        }
      }
    });
  }

  const atomicPercentage = (atomicClaims / totalClaims) * 100;
  const compoundPercentage = (compoundClaims / totalClaims) * 100;

  console.log('\n───────────────────────────────────────────────────────────────────');
  console.log('              نتائج اختبار الذرية (CLAIM ATOMICITY AUDIT)');
  console.log('───────────────────────────────────────────────────────────────────');
  console.log(`• إجمالي الأسئلة المختبرة:       ${TEST_CASES.length}`);
  console.log(`• إجمالي الدعاوى الناتجة:        ${totalClaims}`);
  console.log(`• الدعاوى الذرية (ATOMIC):       ${atomicClaims} (${atomicPercentage.toFixed(2)}%) [الهدف >= 95%]`);
  console.log(`• الدعاوى المركبة (COMPOUND):    ${compoundClaims} (${compoundPercentage.toFixed(2)}%) [الهدف <= 5%]`);
  console.log(`• الدعاوى المبهمة (AMBIGUOUS):   ${ambiguousClaims} (0.00%)`);
  console.log(`• الأنماط المركبة غير الآمنة:   ${violations.length} [المستهدف الصارم: 0]`);
  console.log('───────────────────────────────────────────────────────────────────\n');

  assert.ok(atomicPercentage >= 95, `Atomic claims percentage (${atomicPercentage.toFixed(2)}%) must be >= 95%`);
  assert.ok(compoundPercentage <= 5, `Compound claims percentage (${compoundPercentage.toFixed(2)}%) must be <= 5%`);
  assert.equal(violations.length, 0, `Known unsafe compound patterns must be ZERO: ${JSON.stringify(violations)}`);
});
