/**
 * Mishkat Phase 5B: Final Fresh Holdout Benchmark (Holdout V2)
 * 
 * STRICT PROTOCOL (Phase 5B Requirements):
 * - Exactly 50 NEW unseen Claim x Evidence pairs
 * - Never used in previous holdouts or dev tests
 * - Balanced across all domains (Quran, Hadith, Fiqh, Terminology, Misconceptions, History, Dawah)
 * - At least 15 False-DIRECT traps (exactly 16 included)
 * - At least 5 explicit Contradictions (exactly 5 included)
 * - Evaluated with real Gemini AI (gemini-flash-lite-latest)
 * - allowFallback = false (fails test if fallback is invoked)
 * - Pacing delay of 1200ms between calls to avoid HTTP 429
 * - FIRST-RUN results recorded verbatim without post-hoc modification
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTrustedSourceRepository } from '../src/mishkat/knowledge/TrustedSourceRepository.js';
import {
  EvidenceVerificationService,
  EVIDENCE_RELATIONS,
  VERIFICATION_STATUS,
  isGeminiConfigured
} from '../src/mishkat/evidence/index.js';

describe('Mishkat Phase 5B: Final Fresh Holdout Benchmark V2 (Live AI)', () => {
  let service;
  let repo;

  before(async () => {
    repo = defaultTrustedSourceRepository;
    if (repo.chunkCount === 0) {
      repo.loadFromDisk('data/knowledge');
    }
    service = new EvidenceVerificationService();
  });

  // 50 Brand-New Unseen Claim x Evidence Pairs
  const HOLDOUT_V2_PAIRS = [
    // 01. True DIRECT: Quran 112:2 Exact Verse
    {
      id: 'v2_01_quran_112_2_direct',
      name: 'نص الآية الثانية من سورة الإخلاص',
      question: 'ما هو نص الآية الثانية من سورة الإخلاص؟',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_v01',
        statement: 'الآية الثانية من سورة الإخلاص هي قوله تعالى: اللَّهُ الصَّمَدُ',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_112_2_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 02. Trap 1: Why Inquiry vs Raw Verse Text
    {
      id: 'v2_02_quran_112_2_trap_why',
      name: 'فخ دلالي: سؤال علة وتفسير مقابل نص الآية المجرد',
      question: 'لماذا سُمي الله عز وجل بالصمد وما العلة والمعنى في اتصافه بهذه الصفة؟',
      task: 'WHY',
      claim: {
        claimId: 'c_v02',
        statement: 'علة ومعنى الصمد هو الذي تصمد إليه الخلائق في حوائجها ولا يأكل ولا يشرب لكمال غناه',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_quran_112_2_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 03. True DIRECT: Quran 2:144 Direction of Prayer
    {
      id: 'v2_03_quran_2_144_direct',
      name: 'الأمر القرآني باستقبال الكعبة في الصلاة',
      question: 'أين نجد الآية التي أمرت المسلمين بالتوجه إلى المسجد الحرام في الصلاة؟',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_v03',
        statement: 'قوله تعالى: فَوَلِّ وَجْهَكَ شَطْرَ الْمَسْجِدِ الْحَرَامِ نص صريح على استقبال القبلة في سورة البقرة',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_2_144_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 04. Trap 2: Usul al-Fiqh Naskh Debate vs Raw Verse
    {
      id: 'v2_04_quran_2_144_trap_abrogation',
      name: 'فخ دلالي: مباحث النسخ الأصولية مقابل آية تحويل القبلة',
      question: 'ما هي التفاصيل الفقهية في مسألة نسخ التوجه لبيت المقدس بالتوجه للكعبة وهل نسخ القرآن بالسنة؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v04',
        statement: 'نسخ التوجه إلى بيت المقدس بالقرآن قطعي الثبوت ويمثل نموذجاً في أصول الفقه لنسخ السنة بالقرآن',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_quran_2_144_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 05. True DIRECT: Tafsir of Samad
    {
      id: 'v2_05_tafsir_ikhlas_direct',
      name: 'تفسير معنى الصمد عند أهل السنة',
      question: 'ما تفسير قوله تعالى: الله الصمد في تفاسير أهل السنة المعتمدة؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v05',
        statement: 'معنى الصمد عند المفسرين هو السيد الذي كمل في سؤدده والذي تصمد إليه الخلائق في حوائجها',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_tafsir_dorar_ikhlas_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 06. Trap 3: Tafsir Commentary vs Raw Quran Request
    {
      id: 'v2_06_tafsir_ikhlas_trap_quran_only',
      name: 'فخ دلالي: طلب نص قرآني مجرد مقابل نص تفسيري',
      question: 'أريد الآية القرآنية الكريمة الدالة على أن الله لم يلد ولم يولد نصاً مجرداً من المصحف',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_v06',
        statement: 'نص الآية الكريمة هو: لَمْ يَلِدْ وَلَمْ يُولَدْ',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_tafsir_dorar_ikhlas_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 07. True DIRECT: Hadith of Intentions
    {
      id: 'v2_07_hadith_bukhari_1_direct',
      name: 'حديث إنما الأعمال بالنيات في صحيح البخاري',
      question: 'ما هو لفظ الحديث المشهور في اشتراط النية لصحة العمل؟',
      task: 'VERIFY_HADITH',
      claim: {
        claimId: 'c_v07',
        statement: 'روى البخاري عن عمر بن الخطاب رضي الله عنه: إنما الأعمال بالنيات وإنما لكل امرئ ما نوى',
        requiredEvidenceType: 'PROPHETIC_HADITH_TEXT'
      },
      chunkId: 'rec_hadith_bukhari_1_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 08. Trap 4: Fiqh Invalidations for Forgetting Intention vs Hadith
    {
      id: 'v2_08_hadith_bukhari_1_trap_wudu_ruling',
      name: 'فخ دلالي: تفاصيل بطلان الوضوء لنسيان النية مقابل متن الحديث العام',
      question: 'هل تبطل صلاة من توضأ ونسي استحضار نية الوضوء عند جمهور الفقهاء؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v08',
        statement: 'يبطل وضوء المكلف ولا تصح صلاته إذا عزب عن قلبه استحضار نية الطهارة عند الشروع في الغسل',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_hadith_bukhari_1_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 09. True DIRECT: Hadith of Islam Pillars
    {
      id: 'v2_09_hadith_bukhari_8_direct',
      name: 'حديث بني الإسلام على خمس لابن عمر',
      question: 'ما هو نص حديث ابن عمر رضي الله عنهما في بيان أركان الإسلام الخمسة؟',
      task: 'VERIFY_HADITH',
      claim: {
        claimId: 'c_v09',
        statement: 'ثبت في صحيح البخاري عن ابن عمر: بني الإسلام على خمس: شهادة أن لا إله إلا الله وأن محمداً رسول الله، وإقام الصلاة، وإيتاء الزكاة، والحج، وصوم رمضان',
        requiredEvidenceType: 'PROPHETIC_HADITH_TEXT'
      },
      chunkId: 'rec_hadith_bukhari_8_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 10. Trap 5: Specific Zakat Thresholds and Percentages vs General Pillar
    {
      id: 'v2_10_hadith_bukhari_8_trap_zakat_percentages',
      name: 'فخ دلالي: مقادير وأنصبة الزكاة التفصيلية مقابل حديث أركان الإسلام',
      question: 'كم هي مقادير وأنصبة الزكاة الواجبة في عروض التجارة والذهب والفضة؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v10',
        statement: 'نصاب زكاة عروض التجارة يقدر بقيمة 85 جراماً من الذهب ومقدار الواجب إخراجه ربع العشر 2.5%',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_hadith_bukhari_8_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 11. True DIRECT: Fabricated Hadith Takhrij (Hubb al-Watan)
    {
      id: 'v2_11_hadith_dorar_watani_direct',
      name: 'تخريج مقولة حب الوطن من الإيمان وبيان وضعها',
      question: 'ما درجة حديث حب الوطن من الإيمان وهل يصح رفعه للنبي ﷺ؟',
      task: 'VERIFY_HADITH',
      claim: {
        claimId: 'c_v11',
        statement: 'مقولة حب الوطن من الإيمان ليست حديثاً صحيحاً عن النبي ﷺ بل حكم المحدثون بأنها موضوعة أو لا أصل لها',
        requiredEvidenceType: 'HADITH_TAKRIJ_REPORT'
      },
      chunkId: 'rec_hadith_dorar_watani_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 12. Contradiction 1: Claiming Fabricated Hadith is Sahih in Bukhari
    {
      id: 'v2_12_hadith_dorar_watani_contra',
      name: 'تناقض مباشر: الزعم بأن حديث حب الوطن من الإيمان صحيح متفق عليه',
      question: 'هل ثبت في الأحاديث الصحيحة المتفق عليها أن حب الوطن من خصال الإيمان؟',
      task: 'VERIFY_HADITH',
      claim: {
        claimId: 'c_v12',
        statement: 'حديث حب الوطن من الإيمان حديث صحيح متفق عليه ورواه البخاري في صحيحه عن الصحابة',
        requiredEvidenceType: 'PROPHETIC_HADITH_TEXT'
      },
      chunkId: 'rec_hadith_dorar_watani_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },
    // 13. True DIRECT: Definition of Tawheed
    {
      id: 'v2_13_term_tawheed_direct',
      name: 'التعريف الاصطلاحي المعتمد للتوحيد',
      question: 'ما هو التعريف الشرعي الاصطلاحي المعتمد للتوحيد؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_v13',
        statement: 'التوحيد في الاصطلاح الشرعي هو إفراد الله سبحانه وتعالى بما يختص به من الربوبية والألوهية والأسماء والصفات',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      chunkId: 'rec_term_jamhara_tawheed_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 14. Unrelated 1: End-of-Service Indemnity vs Tawheed
    {
      id: 'v2_14_term_tawheed_trap_incidental',
      name: 'قطعة غير متعلقة: مكافأة نهاية الخدمة مقابل مصطلح التوحيد',
      question: 'ما هي شروط استحقاق الموظف لمكافأة نهاية الخدمة في نظام العمل؟',
      task: 'GENERAL',
      claim: {
        claimId: 'c_v14',
        statement: 'يستحق العامل مكافأة نهاية الخدمة المقررة نظاماً عند انتهاء عقد العمل لأسباب مشروعة',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_term_jamhara_tawheed_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.UNRELATED,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 15. True DIRECT: Definition of Taqwa
    {
      id: 'v2_15_term_taqwa_direct',
      name: 'تعريف التقوى الاصطلاحي من جمهرة المصطلحات',
      question: 'ما هو تعريف التقوى في اصطلاح العلماء والمحققين؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_v15',
        statement: 'التقوى اصطلاحاً هي أن يجعل العبد بينه وبين عذاب الله وقاية بفعل أوامره واجتناب نواهيه',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      chunkId: 'rec_term_jamhara_taqwa_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 16. Trap 6: Incidental Verse Mention vs Term Definition
    {
      id: 'v2_16_term_taqwa_trap_hujurat_verse',
      name: 'فخ دلالي: آية تذكر التقوى عرضاً مقابل طلب تعريف المصطلح المعجمي',
      question: 'ما المعنى الاصطلاحي الدقيق لكلمة التقوى وحدها كما عرفها أرباب المعاجم والمصطلحات؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_v16',
        statement: 'التقوى في اصطلاح الشرع مشتقة من الوقاية وهي امتثال الأوامر واجتناب الزواجر حذراً من سخط الله',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      chunkId: 'rec_quran_49_13_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.INCIDENTAL,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 17. True DIRECT: Definition of Shirk
    {
      id: 'v2_17_term_shirk_direct',
      name: 'التعريف الاصطلاحي المعتمد للشرك',
      question: 'ما حقيقة الشرك بالله وما تعريفه الاصطلاحي المعتمد؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_v17',
        statement: 'الشرك هو صرف شيء من حقوق الله وخصائصه كالدعاء والعبادة والتشريع لغير الله',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      chunkId: 'rec_term_jamhara_shirk_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 18. Contradiction 2: Claiming Shirk Akbar is Forgiven Without Repentance
    {
      id: 'v2_18_term_shirk_contra',
      name: 'تناقض مباشر: الزعم بأن الشرك الأكبر مغفور بمجرد كثرة الحسنات',
      question: 'هل الشرك الأكبر يغتفر للمشرك دون توبة إذا كان له أعمال صالحة كثيرة؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v18',
        statement: 'الشرك الأكبر مغفور لصاحبه بمجرد كثرة الحسنات ولو مات عليه من غير توبة',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_term_jamhara_shirk_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },
    // 19. True DIRECT: Definition of Barakah
    {
      id: 'v2_19_term_barakah_direct',
      name: 'تعريف البركة لغة واصطلاحاً',
      question: 'ما المقصود بالبركة لغة واصطلاحاً في الشريعة؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_v19',
        statement: 'البركة لغة النماء والزيادة، واصطلاحاً ثبوت الخير الإلهي في الشيء ونماؤه وكثرته',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      chunkId: 'rec_term_jamhara_barakah_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 20. Unrelated 2: Agricultural Irrigation Techniques vs Barakah
    {
      id: 'v2_20_term_barakah_trap_agriculture',
      name: 'قطعة غير متعلقة: تقنيات الري بالتنقيط مقابل تعريف البركة',
      question: 'كيف تزيد المحاصيل الزراعية وتحمي التربة من التصحر بالتقنيات الحديثة؟',
      task: 'GENERAL',
      claim: {
        claimId: 'c_v20',
        statement: 'استخدام الأسمدة العضوية والري بالتنقيط يضاعف إنتاج الهكتار ويزيد وفرة المحصول',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_term_jamhara_barakah_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.UNRELATED,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 21. True DIRECT: Definition of Iffah
    {
      id: 'v2_21_term_iffah_direct',
      name: 'تعريف العفة لغة واصطلاحاً وضبط الشهوات',
      question: 'ما هو التعريف الشرعي للعفة وما أقسامها؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_v21',
        statement: 'العفة هي ضبط النفس عن الشهوات والرغبات المحرمة وكفها عما لا يحل من الفروج والأموال',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      chunkId: 'rec_term_jamhara_iffah_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 22. Trap 7: Detailed Anatomical Awrah Limits vs Moral Iffah
    {
      id: 'v2_22_term_iffah_trap_quran_clothing',
      name: 'فخ دلالي: حدود العورة التشريحية للمحارم مقابل تعريف العفة الأخلاقية',
      question: 'ما هو حد عورة المرأة المسلمة أمام محارمها في الفقه المقارن؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v22',
        statement: 'عورة المرأة أمام محارمها كالأب والأخ ما عدا الوجه والرأس والعنق واليدين والقدمين',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_term_jamhara_iffah_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 23. True DIRECT: Misconception Kaaba Worship Rebuttal
    {
      id: 'v2_23_bayyinat_kaaba_direct',
      name: 'دحض شبهة تقديس وعبادة حجارة الكعبة',
      question: 'كيف نرد على شبهة أن المسلمين يقدسون حجارة الكعبة أو يعبدونها؟',
      task: 'RESOLVE_MISCONCEPTION',
      claim: {
        claimId: 'c_v23',
        statement: 'المسلمون يعبدون الله وحده، والكعبة قبلة الصلاة ورمز التوحيد وليست معبودة، وقول عمر للحجر الأسود قاطع في نفي النفع والضر عنه',
        requiredEvidenceType: 'THEOLOGICAL_REBUTTAL'
      },
      chunkId: 'rec_misc_bayyinat_kaaba_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 24. Trap 8: Qiblah Facing Command Verse vs Anti-Idol Rebuttal
    {
      id: 'v2_24_bayyinat_kaaba_trap_qiblah_verse',
      name: 'فخ دلالي: آية الأمر باستقبال القبلة مقابل تفنيد شبهة عبادة الأوثان',
      question: 'كيف نرد على الزعم بأن سجود المسلمين تجاه الكعبة عبادة للأوثان والحجارة؟',
      task: 'RESOLVE_MISCONCEPTION',
      claim: {
        claimId: 'c_v24',
        statement: 'المسلمون ينفون عبادة الحجارة بالدليل العقلي وموقف عمر بن الخطاب في نفي النفع والضر عن الحجر الأسود',
        requiredEvidenceType: 'THEOLOGICAL_REBUTTAL'
      },
      chunkId: 'rec_quran_2_144_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 25. True DIRECT: Misconception Spread of Islam by Sword Rebuttal
    {
      id: 'v2_25_bayyinat_sword_direct',
      name: 'دحض شبهة انتشار الإسلام بالسيف وإكراه الشعوب',
      question: 'كيف يُرد على القائلين بأن الإسلام انتشر بالسيف وقهر الشعوب على الدخول فيه؟',
      task: 'RESOLVE_MISCONCEPTION',
      claim: {
        claimId: 'c_v25',
        statement: 'الإسلام انتشر بقوة الإقناع والحجة والعدل لا بالإكراه، والحروب كانت لرد العدوان وتأمين حرية الدعوة، وقاعدته: لا إكراه في الدين',
        requiredEvidenceType: 'APOLOGETIC_REBUTTAL'
      },
      chunkId: 'rec_misc_bayyinat_sword_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 26. Trap 9: Damascus Treaty Text Clauses vs General Rebuttal
    {
      id: 'v2_26_bayyinat_sword_trap_treaty_clauses',
      name: 'فخ دلالي: شروط وبنود صلح دمشق لخالد بن الوليد مقابل نفي الإكراه العام',
      question: 'ما هي النصوص الكاملة لبنود معاهدة فتح دمشق وشروط الصلح التي وقعها خالد بن الوليد؟',
      task: 'VERIFY_HISTORICAL',
      claim: {
        claimId: 'c_v26',
        statement: 'تضمنت معاهدة صلح دمشق تأمين أهلها على كنائسهم وسور مدينتهم مقابل دفع الجزية والتزام الهدنة',
        requiredEvidenceType: 'HISTORICAL_DOCUMENT_REPORT'
      },
      chunkId: 'rec_misc_bayyinat_sword_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 27. True DIRECT: Causes of Juristic Disagreement
    {
      id: 'v2_27_fiqh_ikhtilaf_direct',
      name: 'أسباب اختلاف الأئمة والفقهاء في الفروع',
      question: 'ما هي الأسباب العلمية لاختلاف أئمة الفقه والفقهاء في الأحكام الاجتهادية؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v27',
        statement: 'يرجع اختلاف الفقهاء إلى تفاوتهم في بلوغ الحديث وفهم دلالة النص والجمع بين النصوص وقواعد الأصول كالمصالح والاستحسان',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_fiqh_dorar_ikhtilaf_reasons_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 28. Trap 10: Disagreement Causes Chunk vs Alcohol Consensus Inquiry
    {
      id: 'v2_28_fiqh_ikhtilaf_trap_consensus',
      name: 'فخ دلالي: أسباب الخلاف الفقهي مقابل إجماع تحريم الخمر والميسر',
      question: 'هل أجمع علماء الأمة على تحريم الخمر والميسر في القرآن الكريم؟',
      task: 'VERIFY_CONSENSUS',
      claim: {
        claimId: 'c_v28',
        statement: 'انعقد الإجماع القطعي من جميع علماء المسلمين على تحريم شرب الخمر والميسر تحريماً باتاً',
        requiredEvidenceType: 'SCHOLARLY_CONSENSUS'
      },
      chunkId: 'rec_fiqh_dorar_ikhtilaf_reasons_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.CONTEXTUAL,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 29. True DIRECT: Rules of Fatwa and Distinction from Judiciary
    {
      id: 'v2_29_fiqh_fatwa_rules_direct',
      name: 'ضوابط الفتوى والتفريق بين المفتي والقاضي',
      question: 'ما هي شروط وضوابط إصدار الفتوى والفرق بين الفتوى والحكم القضائي؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v29',
        statement: 'يشترط للفتوى العلم بأدلة الشرع وفقه الواقع، والفتوى إخبار بالحكم بلا إلزام بخلاف القضاء الذي يحسم النزاع بالإلزام',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_fiqh_dorar_fatwa_rules_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 30. Trap 11: Personal Dispute Fatwa Boundary vs General Fatwa Rules
    {
      id: 'v2_30_fiqh_fatwa_rules_trap_personal_dispute',
      name: 'فخ دلالي: نازلة طلاق فردية خاصة مقابل القواعد النظرية العامة للفتوى',
      question: 'طلقت زوجتي طلقتين في حالة غضب شديد فهل وقع الطلاق ويحق لي إرجاعها دون مهر جديد؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v30',
        statement: 'الطلاق في الغضب الشديد الذي يسلب الإدراك لا يقع عند جمع من المحققين ويحق له مراجعتها في العدة',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_fiqh_dorar_fatwa_rules_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.CONTEXTUAL,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 31. True DIRECT: Hudaybiyyah Treaty Terms
    {
      id: 'v2_31_hist_hudaybiyyah_direct',
      name: 'بنود وشروط صلح الحديبية بين النبي وقريش',
      question: 'ما هي الشروط والبنود التي تضمنها صلح الحديبية بين النبي ﷺ وقريش؟',
      task: 'VERIFY_HISTORICAL',
      claim: {
        claimId: 'c_v31',
        statement: 'تضمن صلح الحديبية وضع الحرب عشر سنين، وأن يرجع المسلمون عامهم، ورد من جاء مسلماً بغير إذن وليه، وحرية الدخول في حلف الطرفين',
        requiredEvidenceType: 'HISTORICAL_DOCUMENT_REPORT'
      },
      chunkId: 'rec_hist_dorar_hudaybiyyah_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 32. Trap 12: Hudaybiyyah Treaty Chunk vs Conquest of Mecca Inquiry
    {
      id: 'v2_32_hist_hudaybiyyah_trap_makkah_amnesty',
      name: 'فخ دلالي: صلح الحديبية مقابل مقولة العفو العام يوم فتح مكة',
      question: 'ماذا قال النبي ﷺ لأهل مكة يوم الفتح وما نص عبارة العفو العام عنهم؟',
      task: 'VERIFY_HISTORICAL',
      claim: {
        claimId: 'c_v32',
        statement: 'قال النبي ﷺ لأهل مكة يوم الفتح: ما ترون أني فاعل بكم؟ قالوا: أخ كريم وابن أخ كريم، قال: اذهبوا فأنتم الطلقاء',
        requiredEvidenceType: 'HISTORICAL_DOCUMENT_REPORT'
      },
      chunkId: 'rec_hist_dorar_hudaybiyyah_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.CONTEXTUAL,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 33. True DIRECT: Conquest of Mecca General Amnesty
    {
      id: 'v2_33_hist_makkah_amnesty_direct',
      name: 'العفو النبوي العام عن قريش يوم فتح مكة',
      question: 'ما هو موقف النبي ﷺ من مشركي قريش عند فتح مكة وهل أصدر عفواً عاماً عنهم؟',
      task: 'VERIFY_HISTORICAL',
      claim: {
        claimId: 'c_v33',
        statement: 'أعلن النبي ﷺ عفواً عاماً شاملاً عن قريش عند فتح مكة وقال لهم: اذهبوا فأنتم الطلقاء بعد سنين من الأذى والاضطهاد',
        requiredEvidenceType: 'HISTORICAL_DOCUMENT_REPORT'
      },
      chunkId: 'rec_hist_dorar_makkah_amnesty_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 34. Contradiction 3: Claiming Mass Execution and Looting in Mecca
    {
      id: 'v2_34_hist_makkah_amnesty_contra',
      name: 'تناقض مباشر: الزعم بأن النبي أباد أهل مكة ونهب دورهم عند الفتح',
      question: 'هل عاقب النبي ﷺ عموم أهل مكة بالقتل الجماعي ومصادرة بيوتهم عند فتح مكة؟',
      task: 'VERIFY_HISTORICAL',
      claim: {
        claimId: 'c_v34',
        statement: 'أمر النبي ﷺ بقتل جميع رجال قريش واستباحة أموالهم ودورهم عقاباً على كفرهم يوم فتح مكة',
        requiredEvidenceType: 'HISTORICAL_DOCUMENT_REPORT'
      },
      chunkId: 'rec_hist_dorar_makkah_amnesty_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },
    // 35. True DIRECT: Tripartite Division of Tawheed
    {
      id: 'v2_35_aqeedah_tawheed_pillars_direct',
      name: 'أقسام التوحيد الثلاثة بالاستقراء عند أهل السنة',
      question: 'ما هي أقسام التوحيد الثلاثة وكيف استقرأها علماء أهل السنة والجماعة؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v35',
        statement: 'يقسم التوحيد بالاستقراء إلى ثلاثة أقسام: توحيد الربوبية، وتوحيد الألوهية، وتوحيد الأسماء والصفات',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_aqeedah_dorar_tawheed_pillars_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 36. Trap 13: Quran 112:1 Raw Verse vs Naming Tripartite Names in Verse
    {
      id: 'v2_36_aqeedah_tawheed_pillars_trap_quran_112_1',
      name: 'فخ دلالي: زعم ذكر مسميات الأقسام الثلاثة في الآية القرآنية نصاً',
      question: 'أين نجد التقسيم الثلاثي للتوحيد (ربوبية وألوهية وأسماء وصفات) مبيناً بأسماء هذه الأقسام الثلاثة في نص الآية؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v36',
        statement: 'نصت الآية القرآنية الكريمة بحروفها على تقسيم التوحيد إلى ثلاثة أقسام: ربوبية وألوهية وأسماء وصفات',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_112_1_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 37. True DIRECT: Takfeer Controls and Impediments
    {
      id: 'v2_37_aqeedah_takfeer_controls_direct',
      name: 'ضوابط التكفير وموانعه وإقامة الحجة عند أهل السنة',
      question: 'ما هي الضوابط والموانع الشرعية التي تحكم مسألة تكفير المعين عند أهل السنة؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v37',
        statement: 'لا يكفر المعين إلا بعد ثبوت الشروط وانتفاء الموانع كالجهل والإكراه والخطأ والتأويل السائغ وإقامة الحجة الشرعية',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_aqeedah_dorar_takfeer_controls_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 38. Contradiction 4: Claiming Sinners are Apostates Without Istihlal
    {
      id: 'v2_38_aqeedah_takfeer_contra',
      name: 'تناقض مباشر: تبني مذهب الخوارج بتكفير مرتكب الكبيرة بمجرد الذنب',
      question: 'هل يجوز تكفير المسلم بمجرد ارتكاب المعاصي والكبائر دون استحلال عند أهل السنة؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v38',
        statement: 'مرتكب الكبيرة كمرتكب الزنا أو السرقة يخرج من الملة ويصبح كافراً مخلداً في النار بمجرد الفعل',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_aqeedah_dorar_takfeer_controls_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },
    // 39. True DIRECT: Methodology of Dawah with Wisdom
    {
      id: 'v2_39_dawah_methodology_direct',
      name: 'منهج الدعوة بالحكمة والموعظة الحسنة',
      question: 'ما هو المنهج الشرعي والأخلاقي في دعوة ومحاورة غير المسلمين في الإسلام؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v39',
        statement: 'يقوم منهج الدعوة على الحكمة والموعظة الحسنة والجدال بالتي هي أحسن والرفق ونبذ الإكراه والعنف',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_dawah_center_methodology_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 40. Unrelated 3: Vienna Convention on Diplomatic Immunities vs Dawah
    {
      id: 'v2_40_dawah_methodology_trap_diplomatic_protocol',
      name: 'قطعة غير متعلقة: الحصانة القضائية في اتفاقية فيينا مقابل أسلوب الدعوة',
      question: 'ما هي نصوص بروتوكولات الحصانة الدبلوماسية للسفراء في القانون الدولي العام؟',
      task: 'GENERAL',
      claim: {
        claimId: 'c_v40',
        statement: 'تنص اتفاقية فيينا للعلاقات الدبلوماسية لعام 1961 على الحصانة القضائية الجنائية الكاملة للمبعوث الدبلوماسي',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_dawah_center_methodology_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.UNRELATED,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 41. True DIRECT: Non-Muslim Rights in Islamic Law
    {
      id: 'v2_41_dawah_non_muslim_rights_direct',
      name: 'حقوق غير المسلمين والعدل معهم في الشريعة',
      question: 'ما هي حقوق غير المسلمين والمواطنين من أهل الذمة في الشريعة الإسلامية؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v41',
        statement: 'تضمن الشريعة لغير المسلمين حق الحياة والحرية الدينية وحماية الأموال والعدل القضائي وبرهم والإحسان إليهم',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_dawah_center_non_muslim_rights_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 42. Unrelated 4: Foreign Corporate Tax Rates in Egypt vs Non-Muslim Rights
    {
      id: 'v2_42_dawah_non_muslim_rights_trap_taxation_code',
      name: 'قطعة غير متعلقة: الشرائح الضريبية للشركات الأجنبية مقابل حقوق غير المسلمين',
      question: 'ما هي الشرائح الضريبية المفروضة على الشركات الأجنبية في مصلحة الضرائب المصرية؟',
      task: 'GENERAL',
      claim: {
        claimId: 'c_v42',
        statement: 'تفرض ضريبة الأرباح التجارية بنسبة 22.5% على صافي أرباح الشركات الأجنبية العاملة داخل مصر',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_dawah_center_non_muslim_rights_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.UNRELATED,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 43. True DIRECT: Quran 2:275 Permitting Trade and Prohibiting Riba
    {
      id: 'v2_43_quran_2_275_direct',
      name: 'آية إحلال البيع وتحريم الربا صراحة (البقرة 275)',
      question: 'أين وردت الآية القرآنية الكريمة التي صرحت بإحلال البيع وتحريم الربا؟',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_v43',
        statement: 'قوله تعالى: وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا نص صريح قطعي الدلالة في سورة البقرة',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_2_275_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 44. Contradiction 5: Claiming Quran Permits Interest on Loans
    {
      id: 'v2_44_quran_2_275_contra',
      name: 'تناقض مباشر: الزعم بأن القرآن يبيح فائدة القروض والربا',
      question: 'هل تبيح نصوص القرآن الكريم أخذ الفائدة الربوية في القروض الاستهلاكية؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v44',
        statement: 'القرآن الكريم يبيح الربا الاستهلاكي ويعتبر فوائد الإقراض حلالاً جائزاً لا إثم فيه',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_2_275_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },
    // 45. Trap 14: Modern Currency Inflation Indexing vs General Riba Prohibition
    {
      id: 'v2_45_quran_2_275_trap_modern_inflation',
      name: 'فخ دلالي: معالجة التضخم المالي وربط الديون بسلة العملات مقابل تحريم الربا',
      question: 'كيف يعالج الفقه الإسلامي أثر التضخم المالي وتغير القوة الشرائية للنقود الورقية في الديون المؤجلة؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v45',
        statement: 'يجوز في الفقه المعاصر ربط الدين بجدول غلاء المعيشة أو سلة العملات عند التضخم الفاحش وفق قرار مجمع الفقه',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_quran_2_275_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 46. True DIRECT: Quran 16:125 Call with Wisdom
    {
      id: 'v2_46_quran_16_125_direct',
      name: 'آية الدعوة بالحكمة والموعظة الحسنة (النحل 125)',
      question: 'ما نص الآية القرآنية الكريمة التي تأمر بالدعوة بالحكمة والموعظة الحسنة والجدال بالتي هي أحسن؟',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_v46',
        statement: 'الآية هي قوله تعالى: ادْعُ إِلَىٰ سَبِيلِ رَبِّكَ بِالْحِكْمَةِ وَالْمَوْعِظَةِ الْحَسَنَةِ ۖ وَجَادِلْهُم بِالَّتِي هِيَ أَحْسَنُ في سورة النحل',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_16_125_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 47. Trap 15: Psychological Causality Analysis vs Dawah Command Verse
    {
      id: 'v2_47_quran_16_125_trap_why',
      name: 'فخ دلالي: التحليل النفسي لعناد الخصوم مقابل الأمر الإلهي بالرفق',
      question: 'لماذا أمر الله تعالى بالرفق والموعظة الحسنة وما الأثر النفسي للجدال بالتي هي أحسن على الخصوم؟',
      task: 'WHY',
      claim: {
        claimId: 'c_v47',
        statement: 'العلة النفسية والمقصد من الجدال بالتي هي أحسن هو إزالة العناد وتقريب القلوب وتحبيب الحق إلى النفوس',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_quran_16_125_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 48. True DIRECT: Tafsir of Surah 2:256 (La Ikraha fid-Deen)
    {
      id: 'v2_48_tafsir_ikrah_direct',
      name: 'تفسير قوله تعالى لا إكراه في الدين',
      question: 'ما تفسير قوله تعالى: لا إكراه في الدين قد تبين الرشد من الغي؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v48',
        statement: 'معنى الآية عند المفسرين أنه لا يُجبر أحد على الدخول في الإسلام لقوة دلائله ووضوح براهينه بين الحق والباطل',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_tafsir_dorar_ikrah_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 49. Trap 16: Compound Fiqh Apostasy Repentance Terms vs Verse Tafsir
    {
      id: 'v2_49_tafsir_ikrah_trap_compound_apostasy',
      name: 'فخ دلالي: مدة استتابة المرتد في المذاهب الأربعة مقابل تفسير آية لا إكراه في الدين',
      question: 'ما هي التفاصيل الفقهية الدقيقة لعقوبة الردة واستتابة المرتد في المذاهب الأربعة وعلاقتها بالحرية؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v49',
        statement: 'تتفق المذاهب الأربعة على استتابة المرتد ثلاثة أيام قبل تنفيذ الحكم القضائي درءاً للشبهات',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_tafsir_dorar_ikrah_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 50. True DIRECT: Hadith Qudsi Prohibiting Injustice
    {
      id: 'v2_50_hadith_muslim_2577_direct',
      name: 'الحديث القدسي في تحريم الظلم على الله وبين عباده',
      question: 'ما هو نص الحديث القدسي الجليل الذي حرم الله فيه الظلم على نفسه وجعله محرماً بين عباده؟',
      task: 'VERIFY_HADITH',
      claim: {
        claimId: 'c_v50',
        statement: 'روى مسلم عن أبي ذر عن النبي ﷺ فيما روى عن الله تبارك وتعالى أنه قال: يا عبادي إني حرمت الظلم على نفسي وجعلته بينكم محرماً فلا تظالموا',
        requiredEvidenceType: 'PROPHETIC_HADITH_TEXT'
      },
      chunkId: 'rec_hadith_muslim_2577_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    }
  ];

  it('should execute 50 fresh Claim x Evidence pairs on Live Gemini AI without fallback', async () => {
    assert.equal(HOLDOUT_V2_PAIRS.length, 50, 'Holdout V2 must contain exactly 50 pairs');

    const hasKey = isGeminiConfigured();
    console.log(`\n===============================================================`);
    console.log(`MISHKAT PHASE 5B: FINAL FRESH HOLDOUT V2 (50 PAIRS)`);
    console.log(`AI Configuration Status: ${hasKey ? 'CONFIGURED (LIVE GEMINI)' : 'NOT CONFIGURED'}`);
    console.log(`Model: ${process.env.GEMINI_MODEL || 'gemini-flash-lite-latest'}`);
    console.log(`Mode: AI PRIMARY (allowFallback = false, skipDirectAudit = false)`);
    console.log(`===============================================================\n`);

    const results = [];
    let exactRelationMatches = 0;
    let answersExactMatches = 0;
    let contradictionCorrect = 0;
    let totalContradictionCases = 0;
    let trueDirectCount = 0;
    let falseDirectCount = 0;
    let falseNegativeCount = 0;
    let expectedDirectCount = 0;
    let apiSuccessCount = 0;
    let fallbackCount = 0;
    const latencies = [];

    for (let i = 0; i < HOLDOUT_V2_PAIRS.length; i++) {
      const pair = HOLDOUT_V2_PAIRS[i];
      const chunk = repo.getChunk(pair.chunkId);
      assert.ok(chunk, `KnowledgeChunk "${pair.chunkId}" must exist in repository`);

      const interpretation = {
        originalQuestion: pair.question,
        task: pair.task,
        userGoal: pair.question,
        claimsToResolve: [pair.claim]
      };

      const retrievalResult = {
        queryId: `qret_v2_${pair.id}`,
        claims: [
          {
            claimId: pair.claim.claimId,
            candidates: [chunk]
          }
        ]
      };

      const startTime = Date.now();
      const verificationResponse = await service.verifyEvidence({
        interpretation,
        retrievalResult,
        options: {
          mode: 'ai',
          allowFallback: false,
          skipDirectAudit: false
        }
      });
      const latencyMs = Date.now() - startTime;
      latencies.push(latencyMs);

      const ev = verificationResponse.claims[0].evidence[0];
      assert.ok(ev, `Evidence item must be returned for pair ${pair.id}`);

      // Count fallbacks (must be 0)
      if (ev.verificationMode === 'DETERMINISTIC_VERIFICATION') {
        fallbackCount++;
      } else {
        apiSuccessCount++;
      }

      const relationMatch = ev.relation === pair.expectedRelation;
      if (relationMatch) exactRelationMatches++;

      const answersExactMatch = ev.answersExactClaim === pair.expectedAnswersExact;
      if (answersExactMatch) answersExactMatches++;

      if (pair.expectedContradicts) {
        totalContradictionCases++;
        if (ev.contradictsClaim === true) {
          contradictionCorrect++;
        }
      }

      if (pair.expectedRelation === EVIDENCE_RELATIONS.DIRECT) {
        expectedDirectCount++;
        if (ev.relation === EVIDENCE_RELATIONS.DIRECT) {
          trueDirectCount++;
        } else {
          falseNegativeCount++;
        }
      } else {
        if (ev.relation === EVIDENCE_RELATIONS.DIRECT) {
          falseDirectCount++;
        }
      }

      results.push({
        id: pair.id,
        name: pair.name,
        expectedRelation: pair.expectedRelation,
        predictedRelation: ev.relation,
        relationMatch,
        materialClaimCoverage: ev.materialClaimCoverage,
        evidenceTypeMatches: ev.evidenceTypeMatches,
        answersExact: ev.answersExactClaim,
        supports: ev.supportsClaim,
        contradicts: ev.contradictsClaim,
        confidence: ev.confidence,
        latencyMs,
        reason: ev.reason
      });

      const statusSymbol = relationMatch ? 'PASS' : 'FAIL';
      const trapIndicator = pair.id.includes('trap') ? ' [TRAP]' : (pair.expectedContradicts ? ' [CONTRA]' : '');
      console.log(`[${String(i + 1).padStart(2, '0')}/50] ${statusSymbol}${trapIndicator} ${pair.id} -> Predicted: ${ev.relation} | Expected: ${pair.expectedRelation} (${latencyMs}ms)`);
      if (!relationMatch) {
        console.log(`   Detailed mismatch: predicted=${ev.relation}, expected=${pair.expectedRelation}, coverage=${ev.materialClaimCoverage}, reason: ${ev.reason}`);
      }

      // Pacing delay between calls to prevent rate-limit 429 errors
      await new Promise(r => setTimeout(r, 1200));
    }

    // Aggregate statistics
    const totalPairs = HOLDOUT_V2_PAIRS.length;
    const relationAccuracy = ((exactRelationMatches / totalPairs) * 100).toFixed(2);
    const answersExactAccuracy = ((answersExactMatches / totalPairs) * 100).toFixed(2);
    const contradictionAccuracy = totalContradictionCases > 0
      ? ((contradictionCorrect / totalContradictionCases) * 100).toFixed(2)
      : '100.00';

    const directPrecision = (trueDirectCount + falseDirectCount) > 0
      ? ((trueDirectCount / (trueDirectCount + falseDirectCount)) * 100).toFixed(2)
      : '0.00';
    const directRecall = expectedDirectCount > 0
      ? ((trueDirectCount / expectedDirectCount) * 100).toFixed(2)
      : '0.00';
    const directF1 = (Number(directPrecision) + Number(directRecall)) > 0
      ? ((2 * Number(directPrecision) * Number(directRecall)) / (Number(directPrecision) + Number(directRecall))).toFixed(2)
      : '0.00';

    const avgLatency = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(0);
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);

    console.log(`\n===============================================================`);
    console.log(`PHASE 5B HOLDOUT V2 FINAL VERIFICATION METRICS`);
    console.log(`===============================================================`);
    console.log(`Total Pairs Evaluated:       ${totalPairs}`);
    console.log(`API Calls Succeeded:         ${apiSuccessCount} / ${totalPairs} (100%)`);
    console.log(`Fallback Used:               ${fallbackCount} (0 allowed)`);
    console.log(`Exact Relation Accuracy:     ${relationAccuracy}% (${exactRelationMatches}/${totalPairs})`);
    console.log(`DIRECT Precision:            ${directPrecision}% (${trueDirectCount}/${trueDirectCount + falseDirectCount})`);
    console.log(`DIRECT Recall:               ${directRecall}% (${trueDirectCount}/${expectedDirectCount})`);
    console.log(`DIRECT F1 Score:             ${directF1}%`);
    console.log(`False DIRECT Count:          ${falseDirectCount} (GOAL = 0)`);
    console.log(`False Negatives (Conservative): ${falseNegativeCount}`);
    console.log(`Contradiction Accuracy:      ${contradictionAccuracy}% (${contradictionCorrect}/${totalContradictionCases})`);
    console.log(`answersExactClaim Accuracy:  ${answersExactAccuracy}% (${answersExactMatches}/${totalPairs})`);
    console.log(`Average Latency:             ${avgLatency} ms (Min: ${minLatency}ms, Max: ${maxLatency}ms)`);
    console.log(`===============================================================\n`);

    // Strict exit criteria assertions
    assert.equal(fallbackCount, 0, 'No fallbacks allowed during official holdout evaluation');
    assert.equal(apiSuccessCount, totalPairs, 'All 50 API calls must succeed without error');
    assert.equal(falseDirectCount, 0, 'False DIRECT must be 0 (Zero False DIRECT tolerance)');
    assert.ok(Number(directPrecision) >= 95.0, `DIRECT precision must be >= 95.0%, got ${directPrecision}%`);
    assert.ok(Number(relationAccuracy) >= 75.0, `Overall relation accuracy must be >= 75.0%, got ${relationAccuracy}%`);
    assert.ok(Number(contradictionAccuracy) >= 95.0, `Contradiction accuracy must be >= 95.0%, got ${contradictionAccuracy}%`);
  });
});
