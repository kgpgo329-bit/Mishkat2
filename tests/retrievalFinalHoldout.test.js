/**
 * Mishkat Phase 4: Final Fresh Holdout Validation Suite
 * 
 * STRICT TEST INTEGRITY:
 * - 20 brand-new, unseen questions.
 * - Realistic colloquial Saudi Arabic and formal Classical Arabic.
 * - 15 In-Domain + 5 Negative / Out-of-Domain / Unsupported cases.
 * - Expected labels NEVER enter the retrieval query.
 * - Uses ONLY the 33 existing production KnowledgeChunks.
 * - ZERO post-run tuning or code modification permitted.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTrustedSourceRepository } from '../src/mishkat/knowledge/TrustedSourceRepository.js';
import { RetrievalService } from '../src/mishkat/retrieval/RetrievalService.js';

describe('Mishkat Phase 4: Final Fresh Holdout Benchmark (First Run)', () => {
  let service;
  let repo;

  before(async () => {
    repo = defaultTrustedSourceRepository;
    if (repo.chunkCount === 0) {
      repo.loadFromDisk('data/knowledge');
    }
    service = new RetrievalService();
    await service.initializeWithRepository(repo);
    // Warm up embedding cache
    await service.retrieveForInterpretation({
      interpretation: {
        originalQuestion: 'تحمية الفهرس قبل الاختبار',
        task: 'GENERAL',
        claimsToResolve: [{ statement: 'تحمية', importance: 'CORE' }]
      },
      repository: repo
    });
  });

  const HOLDOUT_SCENARIOS = [
    // 1. Colloquial Hadith Verification (Hadith Jibril / Bukhari 50)
    {
      id: 'hld_01_hadith_jibril',
      name: 'سالفة حديث جبريل في مراتب الدين',
      question: 'وش سالفة حديث جبريل يوم سأل النبي عن الإسلام والإيمان والإحسان؟ أبي أتأكد منه',
      task: 'VERIFY_HADITH',
      topic: 'الحديث والعقيدة',
      claims: [
        {
          statement: 'حديث جبريل يبين مراتب الدين الثلاثة الإسلام والإيمان والإحسان وهو مخرج في صحيح البخاري',
          requiredEvidenceType: 'HADITH_ISNAD_STATUS'
        }
      ],
      expectedChunks: ['rec_hadith_bukhari_50_chk_0'],
      expectedDomains: ['HADITH']
    },
    // 2. Colloquial Hadith Authenticity (Hubb al-Watan)
    {
      id: 'hld_02_watani_hadith',
      name: 'صحة مقولة حب الوطن من الإيمان',
      question: 'دايم أسمع الناس يقولون حب الوطن من الإيمان، هل هذا حديث صحيح عن الرسول؟',
      task: 'VERIFY_HADITH',
      topic: 'الحديث الشريف وتخريجه',
      claims: [
        {
          statement: 'مقولة حب الوطن من الإيمان ليست حديثا صحيحا عن النبي بل موضوع أو لا أصل له',
          requiredEvidenceType: 'HADITH_ISNAD_STATUS'
        }
      ],
      expectedChunks: ['rec_hadith_dorar_watani_chk_0'],
      expectedDomains: ['HADITH']
    },
    // 3. Colloquial Quran / Fiqh (Riba Prohibition - Baqarah 275)
    {
      id: 'hld_03_riba_prohibition',
      name: 'تحريم الربا والفرق بينه وبين البيع',
      question: 'ليه الربا محرم بالقرآن مع إنه تجارة وتراضي بين الطرفين؟',
      task: 'WHY',
      topic: 'المعاملات المالية والقرآن',
      claims: [
        {
          statement: 'القرآن الكريم نص صراحة على إحلال البيع وتحريم الربا في سورة البقرة آية 275',
          requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
        }
      ],
      expectedChunks: ['rec_quran_2_275_chk_0'],
      expectedDomains: ['QURAN']
    },
    // 4. Colloquial Terminology (Barakah)
    {
      id: 'hld_04_barakah_definition',
      name: 'معنى البركة في الاصطلاح الشرعي',
      question: 'وش المقصود بالبركة لما نقول الله يبارك لك وش معناها لغة وشرعا؟',
      task: 'DEFINE_TERM',
      topic: 'المفاهيم والمصطلحات الشرعية',
      claims: [
        {
          statement: 'البركة تعني لغة النماء والزيادة واللزوم واصطلاحا ثبوت الخير الإلهي في الشيء',
          requiredEvidenceType: 'LEXICAL_DEFINITION'
        }
      ],
      expectedChunks: ['rec_term_jamhara_barakah_chk_0'],
      expectedDomains: ['TERMINOLOGY']
    },
    // 5. Formal Quran (Human Brotherhood / Equality - Hujurat 13)
    {
      id: 'hld_05_human_brotherhood',
      name: 'وحدة الأصل البشري والتفاضل بالتقوى',
      question: 'ما هي الآية التي تقرر وحدة الأصل البشري وأن التفاضل بالتقوى لا بالأنساب؟',
      task: 'EXPLORE_TOPIC',
      topic: 'حقوق الإنسان في القرآن',
      claims: [
        {
          statement: 'سورة الحجرات آية 13 تقرر أن الله خلق الناس شعوبا وقبائل لتعارفوا وأن أكرمكم عند الله أتقاكم',
          requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
        }
      ],
      expectedChunks: ['rec_quran_49_13_chk_0'],
      expectedDomains: ['QURAN']
    },
    // 6. Formal Terminology (Iffah / Moral Restraint)
    {
      id: 'hld_06_iffah_definition',
      name: 'التعريف الشرعي للعفة ومجالاتها',
      question: 'ما هو التعريف الشرعي للعفة وما هي مجالاتها في الأخلاق الإسلامية؟',
      task: 'DEFINE_TERM',
      topic: 'الأخلاق والمصطلحات الشرعية',
      claims: [
        {
          statement: 'العفة لغة الكف والامتناع واصطلاحا هيئة للنفس تمنعها من غلبة الشهوة وضبط الرغبات بالشرع',
          requiredEvidenceType: 'LEXICAL_DEFINITION'
        }
      ],
      expectedChunks: ['rec_term_jamhara_iffah_chk_0'],
      expectedDomains: ['TERMINOLOGY']
    },
    // 7. Colloquial Doubt Refutation (Quranic Origin / Borrowing)
    {
      id: 'hld_07_quran_origin_doubt',
      name: 'شبهة اقتباس القرآن من كتب السابقين',
      question: 'فيه شبهة تقول إن النبي اقتبس القرآن من رهبان النصارى أو كتب الأقدمين، كيف نرد عليها؟',
      task: 'REFUTE_DOUBT',
      topic: 'رد الشبهات حول الوحي',
      claims: [
        {
          statement: 'دعوى أن القرآن مقتبس من كتب السابقين شبهة باطلة دحضها القرآن لكون النبي أميا ولإعجاز نظمه',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ],
      expectedChunks: ['rec_misc_bayyinat_quran_origin_chk_0'],
      expectedDomains: ['MISCONCEPTIONS']
    },
    // 8. Formal Quran (Qiblah Change - Baqarah 144)
    {
      id: 'hld_08_qiblah_change',
      name: 'آية تحويل القبلة إلى المسجد الحرام',
      question: 'أين نجد النص القرآني الخاص بتحويل القبلة من بيت المقدس إلى الكعبة المشرفة؟',
      task: 'VERIFY_QURAN',
      topic: 'القرآن الكريم وأحكام الصلاة',
      claims: [
        {
          statement: 'قوله تعالى قد نرى تقلب وجهك في السماء فلنولينك قبلة ترضاها في سورة البقرة آية 144 ينص على تحويل القبلة',
          requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
        }
      ],
      expectedChunks: ['rec_quran_2_144_chk_0'],
      expectedDomains: ['QURAN']
    },
    // 9. Colloquial Aqeedah (Tawheed 3 Categories)
    {
      id: 'hld_09_tawheed_categories',
      name: 'أقسام التوحيد الثلاثة واستقراؤها',
      question: 'وش أقسام التوحيد الثلاثة اللي دايما يدرسونها، وكيف تم استقراؤها من القرآن؟',
      task: 'EXPLAIN_CONCEPT',
      topic: 'العقيدة وأقسام التوحيد',
      claims: [
        {
          statement: 'التوحيد ينقسم بالاستقراء إلى توحيد الربوبية وتوحيد الألوهية وتوحيد الأسماء والصفات',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ],
      expectedChunks: ['rec_aqeedah_dorar_tawheed_pillars_chk_0'],
      expectedDomains: ['AQEEDAH']
    },
    // 10. Formal Tafsir (Surah Al-Ikhlas & As-Samad)
    {
      id: 'hld_10_ikhlas_tafsir',
      name: 'تفسير سورة الإخلاص ومعنى الصمد',
      question: 'ما هو تفسير الصمد وما الفضل العظيم الوارد في سورة الإخلاص؟',
      task: 'EXPLAIN_CONCEPT',
      topic: 'تفسير القرآن الكريم',
      claims: [
        {
          statement: 'تفسير سورة الإخلاص يبين أن الصمد هو السيد المقصود في الحوائج الذي لا جوف له وأنها تعدل ثلث القرآن',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ],
      expectedChunks: ['rec_tafsir_dorar_ikhlas_chk_0', 'rec_quran_112_2_chk_0'],
      expectedDomains: ['TAFSIR', 'QURAN']
    },
    // 11. Formal Terminology (Shirk Definition)
    {
      id: 'hld_11_shirk_definition',
      name: 'تعريف مصطلح الشرك لغة واصطلاحا',
      question: 'ما هو حد الشرك الأكبر والأصغر وما الفارق الدقيق بينهما في التعريف الاصطلاحي؟',
      task: 'DEFINE_TERM',
      topic: 'المصطلحات العقدية',
      claims: [
        {
          statement: 'الشرك لغة المقارنة والنصيب واصطلاحا صرف شيء من خصائص الله أو العبادة لغيره سبحانه',
          requiredEvidenceType: 'LEXICAL_DEFINITION'
        }
      ],
      expectedChunks: ['rec_term_jamhara_shirk_chk_0'],
      expectedDomains: ['TERMINOLOGY']
    },
    // 12. Colloquial Hadith Verification (Pillars of Islam / Bukhari 8)
    {
      id: 'hld_12_bukhari_pillars',
      name: 'تخريج حديث بني الإسلام على خمس',
      question: 'هل حديث بني الإسلام على خمس متفق عليه، ووش هي أركان الإسلام المذكورة فيه؟',
      task: 'VERIFY_HADITH',
      topic: 'الحديث وأركان الإسلام',
      claims: [
        {
          statement: 'حديث بني الإسلام على خمس مروي في صحيح البخاري عن ابن عمر بإسناد صحيح',
          requiredEvidenceType: 'HADITH_ISNAD_STATUS'
        }
      ],
      expectedChunks: ['rec_hadith_bukhari_8_chk_0'],
      expectedDomains: ['HADITH']
    },
    // 13. Formal Dawah / Dialogue (Nahl 125 & Methodology)
    {
      id: 'hld_13_dawah_methodology',
      name: 'منهجية الدعوة بالحكمة والموعظة الحسنة',
      question: 'ما هي الأصول الشرعية في دعوة غير المسلمين ومجادلتهم بالحسنى كما رسمها القرآن؟',
      task: 'EXPLORE_TOPIC',
      topic: 'منهجية الدعوة والحوار',
      claims: [
        {
          statement: 'القرآن يأمر في سورة النحل 125 بالدعوة بالحكمة والموعظة الحسنة ومجادلة المخالفين بالتي هي أحسن',
          requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
        }
      ],
      expectedChunks: ['rec_quran_16_125_chk_0', 'rec_dawah_center_methodology_chk_0'],
      expectedDomains: ['QURAN', 'DAWAH']
    },
    // 14. Formal Quran / Textual Coherence (Nisa 82)
    {
      id: 'hld_14_quran_coherence',
      name: 'نفي الاختلاف والتناقض عن القرآن الكريم',
      question: 'ما الدليل القرآني على خلو القرآن من أي تناقض أو اختلاف بين آياته؟',
      task: 'EXPLORE_TOPIC',
      topic: 'إعجاز القرآن ونفي التناقض',
      claims: [
        {
          statement: 'قوله تعالى في سورة النساء آية 82 أفلا يتدبرون القرآن ولو كان من عند غير الله لوجدوا فيه اختلافا كثيرا',
          requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
        }
      ],
      expectedChunks: ['rec_quran_4_82_chk_0'],
      expectedDomains: ['QURAN']
    },
    // 15. Colloquial / Personal Fatwa Boundary (Divorce oath)
    {
      id: 'hld_15_personal_fatwa_divorce',
      name: 'ضوابط الفتوى في مسائل الطلاق الخاصة',
      question: 'زوجي حلف علي بالطلاق ثلاث مرات وأنا غضبانة، هل وقع الطلاق أو لا؟',
      task: 'PERSONAL_FATWA',
      topic: 'مسائل الأحوال الشخصية والطلاق',
      claims: [
        {
          statement: 'فتاوى الطلاق والنوازل الفردية تتطلب معرفة ملابسات المستفتي ولا يفتى فيها إلا عبر الهيئات الإفتائية المعتمدة',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ],
      expectedChunks: ['rec_fiqh_dorar_fatwa_rules_chk_0'],
      expectedDomains: ['FIQH']
    },
    // 16. Negative / Out-of-Domain 1: Cryptocurrencies & Blockchain
    {
      id: 'hld_16_crypto_ood',
      name: 'خارج النطاق: تعدين البيتكوين وخوارزمية إثبات العمل',
      question: 'كيف يتم تعدين عملة البيتكوين وما هي خوارزمية إثبات العمل Proof of Work؟',
      task: 'GENERAL',
      topic: 'التقنية المالية والعملات الرقمية',
      claims: [
        {
          statement: 'تعدين البيتكوين يعتمد على خوارزمية SHA256 وإثبات العمل البرمجي',
          requiredEvidenceType: 'TEXTUAL_EVIDENCE'
        }
      ],
      isNegativeOrOutOfDomain: true
    },
    // 17. Negative / Out-of-Domain 2: Pharmacology & Medicine Dosage
    {
      id: 'hld_17_medicine_ood',
      name: 'خارج النطاق: جرعات عقار الباراسيتامول للأطفال',
      question: 'ما هي الجرعة الدوائية الموصى بها لعقار الباراسيتامول للأطفال حسب الوزن؟',
      task: 'GENERAL',
      topic: 'الطب والصيدلة السريرية',
      claims: [
        {
          statement: 'جرعة الباراسيتامول للأطفال تحسب بمعدل 15 ملغ لكل كيلوغرام كل 6 ساعات',
          requiredEvidenceType: 'TEXTUAL_EVIDENCE'
        }
      ],
      isNegativeOrOutOfDomain: true
    },
    // 18. Negative / Out-of-Domain 3: Automotive Mechanical Engineering
    {
      id: 'hld_18_turbo_ood',
      name: 'خارج النطاق: الفرق الميكانيكي بين التيربو والسوبرتشارج',
      question: 'وش الفرق بين محركات التيربو ومحركات السوبرتشارج في عزم دوران السيارات الرياضية؟',
      task: 'GENERAL',
      topic: 'هندسة السيارات والميكانيكا',
      claims: [
        {
          statement: 'التيربو يستغل غازات العادم بينما السوبرتشارج متصل مباشرة بعمود الكرنك الميكانيكي',
          requiredEvidenceType: 'TEXTUAL_EVIDENCE'
        }
      ],
      isNegativeOrOutOfDomain: true
    },
    // 19. Negative / Out-of-Domain 4: Astrophysics & Stellar Black Holes
    {
      id: 'hld_19_blackhole_ood',
      name: 'خارج النطاق: فيزياء تشكل الثقوب السوداء النجمية',
      question: 'كيف يتشكل الثقب الأسود النجمي عند انهيار النجوم العملاقة بعد مرحلة السوبرنوفا؟',
      task: 'GENERAL',
      topic: 'علم الفلك والفيزياء الفلكية',
      claims: [
        {
          statement: 'الثقب الأسود النجمي يتكون عندما تنهار كتلة النواة النجمية تحت تأثير جاذبيتها الفائقة',
          requiredEvidenceType: 'TEXTUAL_EVIDENCE'
        }
      ],
      isNegativeOrOutOfDomain: true
    },
    // 20. Negative Unsupported: Complex Inheritance Math Calculation
    {
      id: 'hld_20_inheritance_math_unsupported',
      name: 'غير مغطى: حساب الفرائض والمناسخات الرياضية المعقدة',
      question: 'توفي رجل عن زوجة وبنتين وأخت شقيقة، كيف تقسم التركة وفق حساب الفرائض والمناسخات الرياضية؟',
      task: 'EXPLAIN_CONCEPT',
      topic: 'علم الفرائض وحساب التركات الرياضي',
      claims: [
        {
          statement: 'مسألة الميراث هاته تحسب بعول الفريضة وأصل المسألة الرياضي وتوزيع سهام الورثة',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ],
      isNegativeOrOutOfDomain: true
    }
  ];

  it('should run full holdout evaluation on 20 unseen scenarios', async () => {
    let recallAt1 = 0;
    let recallAt3 = 0;
    let recallAt5 = 0;
    let sumReciprocalRank = 0;
    let domainAccAt1 = 0;
    let zeroResultSuccess = 0;
    let totalDuplicates = 0;
    let provenanceViolations = 0;

    const latencies = [];
    const failures = [];
    const detailedResults = [];

    const inDomainScenarios = HOLDOUT_SCENARIOS.filter(s => !s.isNegativeOrOutOfDomain);
    const negativeScenarios = HOLDOUT_SCENARIOS.filter(s => s.isNegativeOrOutOfDomain);

    for (const scenario of HOLDOUT_SCENARIOS) {
      const startTime = performance.now();

      const result = await service.retrieveForInterpretation({
        interpretation: {
          originalQuestion: scenario.question,
          task: scenario.task,
          topic: scenario.topic,
          subtopics: [],
          userGoal: scenario.question,
          claimsToResolve: scenario.claims.map((c, i) => ({
            claimId: `hld_claim_${i}`,
            statement: c.statement,
            importance: 'CORE',
            requiredEvidenceType: c.requiredEvidenceType
          })),
          requestedEvidence: [scenario.claims[0].requiredEvidenceType]
        },
        repository: repo
      });

      const elapsed = performance.now() - startTime;
      latencies.push(elapsed);

      const claimResult = result.claims[0];
      const candidates = claimResult ? claimResult.candidates : [];

      // Check duplicates
      const seenIds = new Set();
      for (const cand of candidates) {
        if (seenIds.has(cand.chunkId)) {
          totalDuplicates++;
        }
        seenIds.add(cand.chunkId);

        // Check provenance integrity contract
        if (!cand.chunkId || !cand.recordId || !cand.sourceId || !cand.sourceName || !cand.domain || !cand.text) {
          provenanceViolations++;
        }
      }

      if (scenario.isNegativeOrOutOfDomain) {
        // Negative / OOD must yield 0 results
        const isZero = candidates.length === 0;
        if (isZero) {
          zeroResultSuccess++;
        } else {
          failures.push({
            scenario,
            type: 'FALSE_POSITIVE_ON_NEGATIVE',
            top5: candidates.slice(0, 5),
            reason: `Expected 0 results for negative/OOD scenario, but retriever returned ${candidates.length} candidates.`
          });
        }
        detailedResults.push({
          id: scenario.id,
          name: scenario.name,
          isNegative: true,
          success: isZero,
          candidatesCount: candidates.length,
          top1Chunk: candidates[0]?.chunkId || 'NONE (EMPTY [])',
          latency: elapsed
        });
      } else {
        const topChunkIds = candidates.map(c => c.chunkId);
        const topCandidate = candidates[0];

        let matchRank = 0;
        for (let i = 0; i < topChunkIds.length; i++) {
          if (scenario.expectedChunks.includes(topChunkIds[i])) {
            matchRank = i + 1;
            break;
          }
        }

        if (matchRank === 1) recallAt1++;
        if (matchRank > 0 && matchRank <= 3) recallAt3++;
        if (matchRank > 0 && matchRank <= 5) recallAt5++;
        if (matchRank > 0) sumReciprocalRank += (1.0 / matchRank);

        const domainMatch = topCandidate && scenario.expectedDomains.includes(topCandidate.domain);
        if (domainMatch) domainAccAt1++;

        const isSuccess = matchRank === 1;
        if (!isSuccess) {
          failures.push({
            scenario,
            type: matchRank === 0 ? 'MISSING_FROM_TOP5' : `SUBOPTIMAL_RANK_${matchRank}`,
            top5: candidates.slice(0, 5),
            reason: matchRank === 0
              ? 'Target chunk not found in Top-5 candidates.'
              : `Target chunk retrieved at rank ${matchRank} instead of #1.`
          });
        }

        detailedResults.push({
          id: scenario.id,
          name: scenario.name,
          isNegative: false,
          success: isSuccess,
          matchRank,
          top1Chunk: topCandidate?.chunkId || 'NONE',
          top1Domain: topCandidate?.domain || 'NONE',
          scores: topCandidate?.scores || {},
          latency: elapsed
        });
      }
    }

    const nInDomain = inDomainScenarios.length;
    const nNegative = negativeScenarios.length;

    const r1Rate = recallAt1 / nInDomain;
    const r3Rate = recallAt3 / nInDomain;
    const r5Rate = recallAt5 / nInDomain;
    const mrr = sumReciprocalRank / nInDomain;
    const domainRate = domainAccAt1 / nInDomain;
    const zeroRate = zeroResultSuccess / nNegative;

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const meanLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    // Log complete diagnostics report
    console.log('\n======================================================');
    console.log('       MISHKAT PHASE 4 FINAL FRESH HOLDOUT RESULTS    ');
    console.log('                 (FRESH HOLDOUT FIRST RUN)            ');
    console.log('======================================================');
    console.log(`Total Scenarios:                  ${HOLDOUT_SCENARIOS.length} (15 In-Domain + 5 Negative/OOD)`);
    console.log(`Recall@1:                         ${(r1Rate * 100).toFixed(2)}% (${recallAt1}/${nInDomain})`);
    console.log(`Recall@3:                         ${(r3Rate * 100).toFixed(2)}% (${recallAt3}/${nInDomain})`);
    console.log(`Recall@5:                         ${(r5Rate * 100).toFixed(2)}% (${recallAt5}/${nInDomain})`);
    console.log(`Mean Reciprocal Rank (MRR):       ${mrr.toFixed(4)}`);
    console.log(`Domain Accuracy@1:                ${(domainRate * 100).toFixed(2)}% (${domainAccAt1}/${nInDomain})`);
    console.log(`Zero-Result Accuracy:             ${(zeroRate * 100).toFixed(2)}% (${zeroResultSuccess}/${nNegative})`);
    console.log(`Duplicate Candidates Count:       ${totalDuplicates}`);
    console.log(`Provenance Violations:            ${provenanceViolations}`);
    console.log(`Latency p50:                      ${p50.toFixed(2)} ms`);
    console.log(`Latency p95:                      ${p95.toFixed(2)} ms`);
    console.log(`Mean Latency:                     ${meanLatency.toFixed(2)} ms`);
    console.log('======================================================');

    console.log('\n--- DETAILED SCENARIO SUMMARY ---');
    for (const d of detailedResults) {
      if (d.isNegative) {
        console.log(`[${d.success ? 'PASS' : 'FAIL'}] ${d.id} | Negative/OOD | Result: ${d.top1Chunk} | Latency: ${d.latency.toFixed(1)}ms`);
      } else {
        console.log(`[${d.success ? 'PASS' : 'FAIL'}] ${d.id} | Rank: ${d.matchRank} | Top: ${d.top1Chunk} (${d.top1Domain}) | Latency: ${d.latency.toFixed(1)}ms`);
      }
    }

    if (failures.length > 0) {
      console.log('\n--- FAILURE BREAKDOWN ---');
      for (const f of failures) {
        console.log(`\nFailure on [${f.scenario.id}] ${f.scenario.name}:`);
        console.log(`Question: ${f.scenario.question}`);
        console.log(`Claim: ${f.scenario.claims[0].statement}`);
        console.log(`Expected Chunks: ${JSON.stringify(f.scenario.expectedChunks)}`);
        console.log(`Expected Domains: ${JSON.stringify(f.scenario.expectedDomains)}`);
        console.log(`Type: ${f.type}`);
        console.log(`Reason: ${f.reason}`);
        console.log('Actual Top Candidates:');
        for (const c of f.top5) {
          console.log(`  - Chunk: ${c.chunkId} (${c.domain}) | finalScore: ${c.scores?.finalScore} | lexicalScore: ${c.scores?.lexicalScore} | semanticScore: ${c.scores?.semanticScore}`);
        }
      }
    } else {
      console.log('\n>>> ZERO FAILURES! All 20 fresh holdout scenarios passed flawlessly.');
    }
    console.log('======================================================\n');

    // Structural assertions
    assert.equal(totalDuplicates, 0, 'No candidate should be duplicated in any result');
    assert.equal(provenanceViolations, 0, 'All candidates must strictly preserve provenance contract');
    assert.ok(r1Rate >= 0.80, `Recall@1 must be >= 80% (got ${(r1Rate * 100).toFixed(1)}%)`);
    assert.ok(mrr >= 0.85, `MRR must be >= 0.85 (got ${mrr.toFixed(4)})`);
    assert.ok(zeroRate >= 0.80, `Zero-result accuracy must be >= 80% (got ${(zeroRate * 100).toFixed(1)}%)`);
  });
});
