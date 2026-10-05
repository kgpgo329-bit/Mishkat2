/**
 * Mishkat Phase 4: Hybrid Trusted Retrieval — Untouched Blind Test Suite
 * 
 * Strict compliance with Sections 25 & 26:
 * - 15 untouched evaluation scenarios representing diverse Islamic domains & tasks
 * - Validates:
 *   1. Canonical Quranic verses
 *   2. Hadith authenticity / grading
 *   3. Core Fiqh concepts and rules
 *   4. Classical Aqeedah doctrines and safeguards
 *   5. Critical Seerah / Historical facts
 *   6. Canonical terminology definitions
 *   7. Contemporary dawah & rights principles
 *   8. Refutation of widespread doubts / misconceptions
 *   9. Zero-result handling for completely irrelevant / out-of-domain queries
 * 
 * Evaluates Metrics:
 * - Recall@1, Recall@3, Recall@5
 * - Mean Reciprocal Rank (MRR)
 * - Domain Accuracy@1
 * - Out-of-Domain Zero-Result Accuracy
 * - Latency (p50, p95, mean)
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTrustedSourceRepository } from '../src/mishkat/knowledge/TrustedSourceRepository.js';
import { RetrievalService } from '../src/mishkat/retrieval/RetrievalService.js';

describe('Mishkat Phase 4: Untouched Blind Retrieval Benchmark', () => {
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
        originalQuestion: 'دفعة تحمية للاختبار',
        task: 'GENERAL',
        claimsToResolve: [{ statement: 'تحمية', importance: 'CORE' }]
      },
      repository: repo
    });
  });

  const BLIND_SCENARIOS = [
    {
      id: 'sc_01_surah_ikhlas',
      name: 'سورة الإخلاص - توحيد خالص وتنزيه',
      question: 'قل هو الله أحد الله الصمد',
      task: 'VERIFY_QURAN',
      topic: 'القرآن الكريم',
      claims: [
        {
          statement: 'قل هو الله أحد آية من سورة الإخلاص تبين توحيد الله وتنزيهه',
          requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
        }
      ],
      expectedChunks: ['rec_quran_112_1_chk_0', 'rec_tafsir_dorar_ikhlas_chk_0'],
      expectedDomains: ['QURAN', 'TAFSIR']
    },
    {
      id: 'sc_02_hadith_niyyah',
      name: 'حديث إنما الأعمال بالنيات',
      question: 'هل حديث إنما الأعمال بالنيات صحيح وفي أي كتاب؟',
      task: 'VERIFY_HADITH',
      topic: 'الحديث الشريف',
      claims: [
        {
          statement: 'حديث إنما الأعمال بالنيات مروي في صحيح البخاري عن عمر بن الخطاب وهو صحيح متفق عليه',
          requiredEvidenceType: 'HADITH_ISNAD_STATUS'
        }
      ],
      expectedChunks: ['rec_hadith_bukhari_1_chk_0'],
      expectedDomains: ['HADITH']
    },
    {
      id: 'sc_03_hadith_qudsi_zulm',
      name: 'الحديث القدسي في تحريم الظلم',
      question: 'يا عبادي إني حرمت الظلم على نفسي وجعلته بينكم محرما',
      task: 'VERIFY_HADITH',
      topic: 'الحديث الشريف',
      claims: [
        {
          statement: 'الحديث القدسي يا عبادي إني حرمت الظلم على نفسي رواه مسلم في صحيحه',
          requiredEvidenceType: 'HADITH_ISNAD_STATUS'
        }
      ],
      expectedChunks: ['rec_hadith_muslim_2577_chk_0'],
      expectedDomains: ['HADITH']
    },
    {
      id: 'sc_04_quran_no_compulsion',
      name: 'آية نفي الإكراه في الدين',
      question: 'ما هو نص الآية الكريمة التي تقرر نفي الإكراه في الدين؟',
      task: 'EXPLORE_TOPIC',
      topic: 'حرية الاعتقاد والقرآن',
      claims: [
        {
          statement: 'قوله تعالى لا إكراه في الدين قد تبين الرشد من الغي في سورة البقرة آية 256',
          requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
        }
      ],
      expectedChunks: ['rec_quran_2_256_chk_0', 'rec_tafsir_dorar_ikrah_chk_0'],
      expectedDomains: ['QURAN', 'TAFSIR']
    },
    {
      id: 'sc_05_kaaba_misconception',
      name: 'شبهة عبادة الكعبة وتقديس الأحجار',
      question: 'هل يعبد المسلمون الكعبة المشرفة أم يتخذونها وثنا؟',
      task: 'REFUTE_DOUBT',
      topic: 'شبهات حول الإسلام',
      claims: [
        {
          statement: 'المسلمون لا يعبدون الكعبة وإنما هي قبلة يتوجهون إليها بأمر الله تعالى وليست وثنا',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ],
      expectedChunks: ['rec_misc_bayyinat_kaaba_chk_0', 'rec_quran_2_144_chk_0'],
      expectedDomains: ['MISCONCEPTIONS', 'QURAN']
    },
    {
      id: 'sc_06_sword_misconception',
      name: 'شبهة انتشار الإسلام بالسيف',
      question: 'هل صحيح أن الإسلام انتشر بحد السيف وأكره الناس على الدخول فيه؟',
      task: 'REFUTE_DOUBT',
      topic: 'شبهات وتاريخ',
      claims: [
        {
          statement: 'دعوى انتشار الإسلام بالسيف وإكراه الناس باطلة تخالف القرآن والواقع التاريخي',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ],
      expectedChunks: ['rec_misc_bayyinat_sword_chk_0'],
      expectedDomains: ['MISCONCEPTIONS']
    },
    {
      id: 'sc_07_ikhtilaf_reasons',
      name: 'أسباب اختلاف الأئمة والفقهاء',
      question: 'لماذا يختلف الفقهاء والعلماء في بعض الأحكام الشرعية الفرعية؟',
      task: 'EXPLAIN_CONCEPT',
      topic: 'الفقه وأصوله',
      claims: [
        {
          statement: 'اختلاف الفقهاء سببه تفاوت بلوغ الحديث وفهم دلالات الألفاظ والقواعد الأصولية',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ],
      expectedChunks: ['rec_fiqh_dorar_ikhtilaf_reasons_chk_0'],
      expectedDomains: ['FIQH']
    },
    {
      id: 'sc_08_takfeer_controls',
      name: 'ضوابط التكفير وموانعه الشرعية',
      question: 'ما هي ضوابط التكفير في الإسلام والفرق بين تكفير النوع وتكفير المعين؟',
      task: 'EXPLAIN_CONCEPT',
      topic: 'العقيدة وضوابط الأحكام',
      claims: [
        {
          statement: 'التكفير حكم شرعي خطير يشترط ثبوت الشروط وانتفاء الموانع والتفريق بين الفعل والفاعل',
          requiredEvidenceType: 'SCHOLARLY_CONSENSUS'
        }
      ],
      expectedChunks: ['rec_aqeedah_dorar_takfeer_controls_chk_0'],
      expectedDomains: ['AQEEDAH']
    },
    {
      id: 'sc_09_hudaybiyyah_treaty',
      name: 'صلح الحديبية وأثره التاريخي',
      question: 'ما هي أحداث صلح الحديبية وشروطه ولماذا سمي فتحا مبينا؟',
      task: 'EXPLAIN_CONCEPT',
      topic: 'السيرة النبوية والتاريخ',
      claims: [
        {
          statement: 'صلح الحديبية عقد في ذي القعدة سنة ست للهجرة وكان أساسا لفتح مكة ودخول الناس في الدين',
          requiredEvidenceType: 'HISTORICAL_FACT'
        }
      ],
      expectedChunks: ['rec_hist_dorar_hudaybiyyah_chk_0'],
      expectedDomains: ['HISTORY']
    },
    {
      id: 'sc_10_makkah_amnesty',
      name: 'عفو فتح مكة - اذهبوا فأنتم الطلقاء',
      question: 'ماذا قال النبي ﷺ لأهل مكة يوم الفتح وما دلالة العفو العام؟',
      task: 'EXPLAIN_CONCEPT',
      topic: 'السيرة النبوية',
      claims: [
        {
          statement: 'النبي أصدر عفوا عاما عن أهل مكة عند فتحها سنة 8 هـ وقال ما تظنون أني فاعل بكم اذهبوا فأنتم الطلقاء',
          requiredEvidenceType: 'HISTORICAL_FACT'
        }
      ],
      expectedChunks: ['rec_hist_dorar_makkah_amnesty_chk_0'],
      expectedDomains: ['HISTORY']
    },
    {
      id: 'sc_11_taqwa_definition',
      name: 'تعريف مصطلح التقوى الشرعي',
      question: 'ما هو المعنى الدقيق لمصطلح التقوى في لغة العرب والشريعة؟',
      task: 'DEFINE_TERM',
      topic: 'المصطلحات الشرعية',
      claims: [
        {
          statement: 'التقوى لغة الوقاية والصيانة واصطلاحا حماية النفس من عذاب الله بفعل أوامره واجتناب نواهيه',
          requiredEvidenceType: 'LEXICAL_DEFINITION'
        }
      ],
      expectedChunks: ['rec_term_jamhara_taqwa_chk_0'],
      expectedDomains: ['TERMINOLOGY']
    },
    {
      id: 'sc_12_non_muslims_rights',
      name: 'حقوق المعاهدين وغير المسلمين',
      question: 'ما هي الحقوق والواجبات تجاه المعاهدين وغير المسلمين في المجتمع المسلم؟',
      task: 'EXPLORE_TOPIC',
      topic: 'الدعوة وحقوق الإنسان',
      claims: [
        {
          statement: 'الشريعة تؤكد عصمة دماء المعاهدين وأموالهم وحرمة ظلمهم أو نقض العهود معهم',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ],
      expectedChunks: ['rec_dawah_center_non_muslim_rights_chk_0'],
      expectedDomains: ['DAWAH']
    },
    {
      id: 'sc_13_fatwa_controls',
      name: 'ضوابط الفتوى والتفريق عن الحكم العام',
      question: 'ما هي ضوابط الفتوى ولماذا لا يجوز للعامي تنزيل الأحكام العامة على النوازل الخاصة؟',
      task: 'EXPLAIN_CONCEPT',
      topic: 'أصول الفتوى والاجتهاد',
      claims: [
        {
          statement: 'الفتوى تنزيل للحكم العام على واقعة معينة بمراعاة حال المستفتي ومآلات الأفعال',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ],
      expectedChunks: ['rec_fiqh_dorar_fatwa_rules_chk_0'],
      expectedDomains: ['FIQH']
    },
    {
      id: 'sc_14_quantum_ood',
      name: 'خارج النطاق: خوارزميات التشفير الكمي',
      question: 'كيف يتم تطبيق التشفير الكمي وخوارزمية شور في لغة بايثون؟',
      task: 'GENERAL',
      topic: 'الفيزياء والبرمجة الحديثة',
      claims: [
        {
          statement: 'التشفير الكمي يعتمد على ميكانيكا الكم وخوارزمية شور لتفكيك الأعداد الأولية',
          requiredEvidenceType: 'TEXTUAL_EVIDENCE'
        }
      ],
      isOutOfDomain: true
    },
    {
      id: 'sc_15_pizza_ood',
      name: 'خارج النطاق: طريقة تحضير البيتزا الإيطالية',
      question: 'ما هي مقادير عجينة البيتزا النابولية الإيطالية ودرجة حرارة الخبز المناسبة؟',
      task: 'GENERAL',
      topic: 'الطبخ والمخبوزات العالمية',
      claims: [
        {
          statement: 'عجينة البيتزا النابولية تعتمد على طحين القمح والخميرة الطبيعية وتخبز على حرارة 450 مئوية',
          requiredEvidenceType: 'TEXTUAL_EVIDENCE'
        }
      ],
      isOutOfDomain: true
    }
  ];

  it('should execute blind evaluation and achieve strict retrieval metrics', async () => {
    let recallAt1 = 0;
    let recallAt3 = 0;
    let recallAt5 = 0;
    let sumReciprocalRank = 0;
    let domainAccAt1 = 0;
    let outOfDomainZeroCount = 0;

    const latencies = [];
    const inDomainScenarios = BLIND_SCENARIOS.filter(s => !s.isOutOfDomain);
    const oodScenarios = BLIND_SCENARIOS.filter(s => s.isOutOfDomain);

    for (const scenario of BLIND_SCENARIOS) {
      const startTime = performance.now();

      const result = await service.retrieveForInterpretation({
        interpretation: {
          originalQuestion: scenario.question,
          task: scenario.task,
          topic: scenario.topic,
          subtopics: [],
          userGoal: scenario.question,
          claimsToResolve: scenario.claims.map((c, i) => ({
            claimId: `blind_claim_${i}`,
            statement: c.statement,
            importance: 'CORE',
            requiredEvidenceType: c.requiredEvidenceType
          })),
          requestedEvidence: [scenario.claims[0].requiredEvidenceType]
        },
        repository: repo,
        options: { minRelevanceThreshold: 0.02 }
      });

      const elapsed = performance.now() - startTime;
      latencies.push(elapsed);

      const claimResult = result.claims[0];
      const candidates = claimResult ? claimResult.candidates : [];

      if (scenario.isOutOfDomain) {
        // Must return empty candidates array for out of domain queries
        if (candidates.length === 0) {
          outOfDomainZeroCount++;
        }
      } else {
        const topChunkIds = candidates.map(c => c.chunkId);
        const topCandidate = candidates[0];

        // Find best match rank among expected chunks
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

        // Check Domain Accuracy@1
        if (topCandidate && scenario.expectedDomains.includes(topCandidate.domain)) {
          domainAccAt1++;
        }
      }
    }

    const nInDomain = inDomainScenarios.length;
    const nOOD = oodScenarios.length;

    const r1Rate = recallAt1 / nInDomain;
    const r3Rate = recallAt3 / nInDomain;
    const r5Rate = recallAt5 / nInDomain;
    const mrr = sumReciprocalRank / nInDomain;
    const domainRate = domainAccAt1 / nInDomain;
    const oodRate = outOfDomainZeroCount / nOOD;

    // Latency metrics
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const meanLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    // Output formatted metrics table for inspection
    console.log('\n======================================================');
    console.log('       MISHKAT PHASE 4 BLIND EVALUATION METRICS       ');
    console.log('======================================================');
    console.log(`Recall@1:                         ${(r1Rate * 100).toFixed(2)}% (${recallAt1}/${nInDomain})`);
    console.log(`Recall@3:                         ${(r3Rate * 100).toFixed(2)}% (${recallAt3}/${nInDomain})`);
    console.log(`Recall@5:                         ${(r5Rate * 100).toFixed(2)}% (${recallAt5}/${nInDomain})`);
    console.log(`Mean Reciprocal Rank (MRR):       ${mrr.toFixed(4)}`);
    console.log(`Domain Accuracy@1:                ${(domainRate * 100).toFixed(2)}% (${domainAccAt1}/${nInDomain})`);
    console.log(`Out-of-Domain Zero-Result Rate:   ${(oodRate * 100).toFixed(2)}% (${outOfDomainZeroCount}/${nOOD})`);
    console.log(`Latency p50:                      ${p50.toFixed(2)} ms`);
    console.log(`Latency p95:                      ${p95.toFixed(2)} ms`);
    console.log(`Mean Latency:                     ${meanLatency.toFixed(2)} ms`);
    console.log('======================================================\n');

    // Strict validation thresholds
    assert.ok(r1Rate >= 0.84, `Recall@1 must be >= 84% (got ${(r1Rate * 100).toFixed(1)}%)`);
    assert.ok(r3Rate >= 0.92, `Recall@3 must be >= 92% (got ${(r3Rate * 100).toFixed(1)}%)`);
    assert.ok(r5Rate >= 0.95, `Recall@5 must be >= 95% (got ${(r5Rate * 100).toFixed(1)}%)`);
    assert.ok(mrr >= 0.88, `MRR must be >= 0.88 (got ${mrr.toFixed(4)})`);
    assert.ok(domainRate >= 0.90, `Domain Accuracy@1 must be >= 90% (got ${(domainRate * 100).toFixed(1)}%)`);
    assert.equal(oodRate, 1.0, 'Out-of-domain queries must achieve 100% zero-result accuracy');
    assert.ok(meanLatency < 50, `Mean Latency must be < 50ms (got ${meanLatency.toFixed(2)} ms)`);
    assert.ok(p95 < 100, `p95 Latency must be < 100ms (got ${p95.toFixed(2)} ms)`);
  });
});
