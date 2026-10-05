/**
 * Mishkat Phase 5C: Final Fresh Holdout Benchmark (Holdout V3)
 * 
 * STRICT PROTOCOL (Phase 5C Requirements):
 * - Exactly 60 NEW unseen Claim x Evidence pairs
 * - Never used in previous holdouts or dev tests
 * - Ground truth distributions:
 *   * 18 False-DIRECT traps (Compound claims, partial coverage, missing premises, incidental mentions, etc.)
 *   * 10 Explicit Contradictions (direct negation/refutation of exact claim)
 *   * 15 True DIRECT (Supportive)
 *   * 8 Supporting, 4 Contextual, 3 Incidental, 2 Unrelated
 * - Evaluated with real Gemini AI (gemini-flash-lite-latest)
 * - allowFallback = false (fails test if fallback is invoked)
 * - Rate-aware pacing delay of 4500ms between calls to respect 15 RPM free-tier quota
 * - FIRST-RUN results recorded verbatim without post-hoc modification
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTrustedSourceRepository } from '../src/mishkat/knowledge/TrustedSourceRepository.js';
import {
  EvidenceVerificationService,
  EVIDENCE_RELATIONS,
  VERIFICATION_STATUS,
  isGeminiConfigured,
  globalEvidenceDiagnostics
} from '../src/mishkat/evidence/index.js';

describe('Mishkat Phase 5C: Final Fresh Holdout Benchmark V3 (Live AI)', () => {
  let service;
  let repo;

  before(async () => {
    repo = defaultTrustedSourceRepository;
    if (repo.chunkCount === 0) {
      repo.loadFromDisk('data/knowledge');
    }
    service = new EvidenceVerificationService();
  });

  // 60 Brand-New Unseen Claim x Evidence Pairs
  const HOLDOUT_V3_PAIRS = [
    // =========================================================================
    // GROUP 1: TRUE DIRECT (SUPPORTIVE) - 15 CASES
    // =========================================================================
    {
      id: 'v3_dir_01_quran_112_1',
      name: 'نص الآية الأولى من سورة الإخلاص',
      question: 'ما هو نص الآية الكريمة الأولى من سورة الإخلاص؟',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_v3_01',
        statement: 'الآية الأولى من سورة الإخلاص هي قوله تعالى: قُلْ هُوَ اللَّهُ أَحَدٌ',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_112_1_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_dir_02_quran_112_3',
      name: 'نص نفي الولادة والولد في سورة الإخلاص',
      question: 'أين نجد الآية التي نفت الولد والوالد عن الله في سورة الإخلاص؟',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_v3_02',
        statement: 'قوله تعالى: لَمْ يَلِدْ وَلَمْ يُولَدْ هو الآية الثالثة من سورة الإخلاص',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_112_3_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_dir_03_quran_112_4',
      name: 'نص نفي الكفء والمثيل في سورة الإخلاص',
      question: 'ما هي الآية الأخيرة من سورة الإخلاص نصاً؟',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_v3_03',
        statement: 'خاتمة سورة الإخلاص هي قوله تعالى: وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_112_4_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_dir_04_quran_2_144',
      name: 'الأمر الصريح باستقبال المسجد الحرام',
      question: 'هل ورد في القرآن أمر صريح باستقبال المسجد الحرام في الصلاة؟',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_v3_04',
        statement: 'القرآن الكريم يأمر صراحة بالتوجه لشطر المسجد الحرام في قوله تعالى: فَوَلِّ وَجْهَكَ شَطْرَ الْمَسْجِدِ الْحَرَامِ',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_2_144_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_dir_05_quran_16_125',
      name: 'منهج الدعوة بالحكمة والموعظة الحسنة',
      question: 'ما هي الآية الجامعة لمراتب الدعوة إلى الله في سورة النحل؟',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_v3_05',
        statement: 'قوله تعالى: ادْعُ إِلَى سَبِيلِ رَبِّكَ بِالْحِكْمَةِ وَالْمَوْعِظَةِ الْحَسَنَةِ يحدد منهج الدعوة بالحكمة والموعظة والجدال بالتي هي أحسن',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_16_125_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_dir_06_hadith_bukhari_1',
      name: 'حديث الأعمال بالنيات في صحيح البخاري',
      question: 'ما هو متن الحديث الأول في صحيح البخاري حول اشتراط النية؟',
      task: 'VERIFY_HADITH',
      claim: {
        claimId: 'c_v3_06',
        statement: 'حديث عمر بن الخطاب في صحيح البخاري نصه: إنما الأعمال بالنيات وإنما لكل امرئ ما نوى',
        requiredEvidenceType: 'HADITH_CANONICAL_TEXT'
      },
      chunkId: 'rec_hadith_bukhari_1_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_dir_07_hadith_bukhari_8',
      name: 'حديث أركان الإسلام الخمسة في صحيح البخاري',
      question: 'ما هو نص الحديث الصحيح في بيان أركان الإسلام الخمسة؟',
      task: 'VERIFY_HADITH',
      claim: {
        claimId: 'c_v3_07',
        statement: 'روى البخاري في صحيحه عن ابن عمر: بني الإسلام على خمس: شهادة أن لا إله إلا الله، وإقام الصلاة، وإيتاء الزكاة، والحج، وصوم رمضان',
        requiredEvidenceType: 'HADITH_CANONICAL_TEXT'
      },
      chunkId: 'rec_hadith_bukhari_8_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_dir_08_hadith_jibril_ihsan',
      name: 'تعريف الإحسان في حديث جبريل الصحيح',
      question: 'ما هو تعريف الإحسان الثابت في حديث جبريل في صحيح البخاري؟',
      task: 'VERIFY_HADITH',
      claim: {
        claimId: 'c_v3_08',
        statement: 'عرّف النبي صلى الله عليه وسلم الإحسان في حديث جبريل بقوله: أن تعبد الله كأنك تراه فإن لم تكن تراه فإنه يراك',
        requiredEvidenceType: 'HADITH_CANONICAL_TEXT'
      },
      chunkId: 'rec_hadith_bukhari_50_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_dir_09_term_shirk_def',
      name: 'تعريف مصطلح الشرك شرعاً من المعجم المعتمد',
      question: 'ما هو التعريف الاصطلاحي الدقيق للشرك في معاجم المصطلحات الشرعية؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_v3_09',
        statement: 'الشرك اصطلاحاً هو مساواة غير الله بالله فيما هو من خصائص الله سبحانه',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      chunkId: 'rec_term_jamhara_shirk_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_dir_10_term_iffah_def',
      name: 'تعريف العفة لغة واصطلاحاً من المعجم المعتمد',
      question: 'ما هو تعريف خلق العفة في لسان الشرع؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_v3_10',
        statement: 'العفة لغة الكف عما لا يحل واصطلاحاً ضبط النفس عن الشهوات والنزوات المحرمة',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      chunkId: 'rec_term_jamhara_iffah_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_dir_11_term_barakah_def',
      name: 'تعريف مصطلح البركة من المعجم المعتمد',
      question: 'ما المقصود بلفظ البركة في الاصطلاح الشرعي؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_v3_11',
        statement: 'البركة اصطلاحاً هي ثبوت الخير الإلهي في الشيء ونماؤه وزيادته واستقراره',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      chunkId: 'rec_term_jamhara_barakah_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_dir_12_tafsir_samad',
      name: 'تفسير اسم الله الصمد في تفسير السعدي/الدرر',
      question: 'ما المعنى التفسيري المعتمد لاسم الله تعالى الصمد؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v3_12',
        statement: 'الصمد في التفسير هو السيد الكامل في صفات الشرف والمجد الذي تصمد إليه الخلائق في جميع حوائجها',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_tafsir_dorar_ikhlas_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_dir_13_misc_bayyinat_origin',
      name: 'تفنيد شبهة اقتباس القرآن من الرهبان',
      question: 'كيف ترد المصادر المعتمدة على شبهة أن النبي تلقى القرآن من بحيرا الراهب؟',
      task: 'RESOLVE_MISCONCEPTION',
      claim: {
        claimId: 'c_v3_13',
        statement: 'شبهة تلقي القرآن من الراهب بحيرا باطلة تاريخياً وعقلياً لأن اللقاء كان عابراً في صباه وقبل البعثة بقرابة ثلاثين عاماً',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_misc_bayyinat_quran_origin_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_dir_14_aqeedah_tawheed_pillars',
      name: 'أقسام التوحيد الثلاثة عند أهل السنة',
      question: 'ما هي أقسام التوحيد الثلاثة المستقرة عند علماء العقيدة؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v3_14',
        statement: 'ينقسم التوحيد بالاستقراء إلى ثلاثة أقسام: توحيد الربوبية، وتوحيد الألوهية، وتوحيد الأسماء والصفات',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_aqeedah_dorar_tawheed_pillars_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_dir_15_quran_49_13_brotherhood',
      name: 'الآية الدالة على وحدة الأصل البشري والتفاضل بالتقوى',
      question: 'ما هي الآية الكريمة الدالة على خلق الناس من أصل واحد وجعلهم شعوباً للتعارف؟',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_v3_15',
        statement: 'قوله تعالى: يَا أَيُّهَا النَّاسُ إِنَّا خَلَقْنَاكُم مِّن ذَكَرٍ وَأُنثَىٰ وَجَعَلْنَاكُمْ شُعُوبًا وَقَبَائِلَ لِتَعَارَفُوا يثبت وحدة الأصل الإنساني والتفاضل بالتقوى',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_49_13_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },

    // =========================================================================
    // GROUP 2: TRUE DIRECT (EXPLICIT CONTRADICTIONS) - 10 CASES
    // =========================================================================
    {
      id: 'v3_contra_01_riba_permissibility',
      name: 'تناقض مباشر: دعوى إباحة الربا مقابل آية تحريم الربا الصريحة',
      question: 'هل يبيح القرآن الكريم الربا الصريح في المعاملات المالية؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v3_16',
        statement: 'القرآن الكريم يبيح الربا الاستهلاكي ويعتبر فوائد الإقراض حلالاً جائزاً لا إثم فيه',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_2_275_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },
    {
      id: 'v3_contra_02_hadith_watn_sahih',
      name: 'تناقض مباشر: دعوى صحة حديث حب الوطن مقابل تخريج كونه موضوعاً',
      question: 'هل حديث حب الوطن من الإيمان حديث صحيح ثابت في الصحيحين؟',
      task: 'VERIFY_HADITH',
      claim: {
        claimId: 'c_v3_17',
        statement: 'حديث حب الوطن من الإيمان حديث صحيح متفق عليه ورواه البخاري في صحيحه',
        requiredEvidenceType: 'HADITH_GRADING'
      },
      chunkId: 'rec_hadith_dorar_watani_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },
    {
      id: 'v3_contra_03_mecca_conquest_pardon',
      name: 'تناقض مباشر: دعوى إبادة أهل مكة مقابل نص العفو العام الثابت في السيرة',
      question: 'هل أباد النبي صلى الله عليه وسلم أهل مكة وانتقم بقتلهم جميعاً عند الفتح؟',
      task: 'VERIFY_HISTORY',
      claim: {
        claimId: 'c_v3_18',
        statement: 'النبي محمد انتقم بقتل جميع أهل مكة وأباد رجالهم عند فتح مكة دون أن يعفو عن أحد',
        requiredEvidenceType: 'HISTORICAL_FACT'
      },
      chunkId: 'rec_misc_bayyinat_sword_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },
    {
      id: 'v3_contra_04_quran_contradictions',
      name: 'تناقض مباشر: دعوى وجود تناقضات واختلافات كثيرة في القرآن مقابل آية النساء 82',
      question: 'هل يقر القرآن بوجود تناقضات واختلافات كثيرة في آياته وأحكامه؟',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_v3_19',
        statement: 'القرآن الكريم يشتمل على تناقضات كثيرة واختلافات جوهرية بين آياته المتشابهة',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_4_82_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },
    {
      id: 'v3_contra_05_tawheed_tanzih_anthropomorphism',
      name: 'تناقض مباشر: دعوى مماثلة الخالق للمخلوقات في صفات الأجسام مقابل نفي المثلية',
      question: 'هل يماثل الله عز وجل المخلوقات في صفاتها الجسمانية المادية؟',
      task: 'VERIFY_CLAIM',
      claim: {
        claimId: 'c_v3_20',
        statement: 'الله سبحانه وتعالى يشبه خلقه تماماً في أجسادهم وصورهم المادية وله كفء ومثيل',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_112_4_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },
    {
      id: 'v3_contra_06_khamr_permissibility',
      name: 'تناقض مباشر: دعوى إباحة المسكرات مقابل نص التحريم والاجتناب الصريح',
      question: 'هل أباح القرآن الكريم شرب الخمر والمسكرات للمسلمين؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v3_21',
        statement: 'شرب المسكرات والخمر مباح حلال بنص القرآن الكريم ولا إثم فيه',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_synth_v3_khamr_prohibition',
      chunkData: {
        chunkId: 'rec_synth_v3_khamr_prohibition',
        sourceName: 'القرآن الكريم',
        domain: 'QURAN',
        title: 'سورة المائدة آية 90',
        section: 'تحريم الخمر والميسر',
        text: 'يَا أَيُّهَا الَّذِينَ آمَنُوا إِنَّمَا الْخَمْرُ وَالْمَيْسِرُ وَالْأَنصَابُ وَالْأَزْلَامُ رِجْسٌ مِّنْ عَمَلِ الشَّيْطَانِ فَاجْتَنِبُوهُ لَعَلَّكُمْ تُفْلِحُونَ',
        evidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },
    {
      id: 'v3_contra_07_hadith_ghina_sahih',
      name: 'تناقض مباشر: دعوى صحة أثر الغناء ينبت النفاق مرفوعاً مقابل حكم الدرر بضعفه',
      question: 'هل مقولة الغناء ينبت النفاق حديث صحيح مرفوع للنبي بإسناد متصل؟',
      task: 'VERIFY_HADITH',
      claim: {
        claimId: 'c_v3_22',
        statement: 'مقولة الغناء ينبت النفاق في القلب حديث صحيح مرفوع للنبي صلى الله عليه وسلم وثابت في الصحيح',
        requiredEvidenceType: 'HADITH_GRADING'
      },
      chunkId: 'rec_synth_v3_ghina_grading',
      chunkData: {
        chunkId: 'rec_synth_v3_ghina_grading',
        sourceName: 'الدرر السنية - الموسوعة الحديثية',
        domain: 'HADITH',
        title: 'تخريج أثر الغناء ينبت النفاق',
        section: 'أحاديث لا تصح مرفوعة',
        text: 'مقولة: «الغناء ينبت النفاق في القلب كما ينبت الماء الزرع»؛ خلاصة حكم المحدث: لا يصح رفعه إلى النبي صلى الله عليه وسلم، وكل طرقه المرفوعة ضعيفة أو منكرة، وإنما روي موقوفاً عن ابن مسعود بإسناد فيه مقال.',
        evidenceType: 'HADITH_GRADING'
      },
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },
    {
      id: 'v3_contra_08_forced_conversion',
      name: 'تناقض مباشر: دعوى وجوب إكراه غير المسلمين على الدين مقابل آية لا إكراه في الدين',
      question: 'هل توجب الشريعة إكراه غير المسلمين على اعتناق الإسلام قهراً؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v3_23',
        statement: 'القرآن الكريم يوجب إكراه الناس وإجبارهم على الدخول في الدين الإسلامي قهراً دون رضاهم',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_synth_v3_no_compulsion',
      chunkData: {
        chunkId: 'rec_synth_v3_no_compulsion',
        sourceName: 'القرآن الكريم',
        domain: 'QURAN',
        title: 'سورة البقرة آية 256',
        section: 'حرية الاعتقاد ونفي الإكراه',
        text: 'لَا إِكْرَاهَ فِي الدِّينِ ۖ قَد تَّبَيَّنَ الرُّشْدُ مِنَ الْغَيِّ ۚ فَمَن يَكْفُرْ بِالطَّاغُوتِ وَيُؤْمِن بِاللَّهِ فَقَدِ اسْتَمْسَكَ بِالْعُرْوَةِ الْوُثْقَىٰ',
        evidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },
    {
      id: 'v3_contra_09_prophet_divinity',
      name: 'تناقض مباشر: دعوى ادعاء النبي الألوهية مقابل آية قل إنما أنا بشر مثلكم',
      question: 'هل ادعى النبي محمد صلى الله عليه وسلم أنه إله أو شريك في الربوبية؟',
      task: 'VERIFY_CLAIM',
      claim: {
        claimId: 'c_v3_24',
        statement: 'النبي محمد ادعى في القرآن أنه إله معبود يملك النفع والضر استقلالاً مع الله',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_synth_v3_bashar_mithlukum',
      chunkData: {
        chunkId: 'rec_synth_v3_bashar_mithlukum',
        sourceName: 'القرآن الكريم',
        domain: 'QURAN',
        title: 'سورة الكهف آية 110',
        section: 'بشرية الرسل والتوحيد',
        text: 'قُلْ إِنَّمَا أَنَا بَشَرٌ مِّثْلُكُمْ يُوحَىٰ إِلَيَّ أَنَّمَا إِلَٰهُكُمْ إِلَٰهٌ وَاحِدٌ ۖ فَمَن كَانَ يَرْجُو لِقَاءَ رَبِّهِ فَلْيَعْمَلْ عَمَلًا صَالِحًا وَلَا يُشْرِكْ بِعِبَادَةِ رَبِّهِ أَحَدًا',
        evidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },
    {
      id: 'v3_contra_10_pardon_prohibition',
      name: 'تناقض مباشر: دعوى منع العفو في القصاص مقابل نص الترغيب في العفو بالبقرة',
      question: 'هل تمنع الشريعة العفو في القتل العمد وتلزم الأولياء بالقصاص حصراً؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v3_25',
        statement: 'الشريعة الإسلامية تحرم العفو عن القاتل وتمنع أولياء الدم من التنازل أو أخذ الدية نهائياً',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_synth_v3_qisas_pardon',
      chunkData: {
        chunkId: 'rec_synth_v3_qisas_pardon',
        sourceName: 'القرآن الكريم',
        domain: 'QURAN',
        title: 'سورة البقرة آية 178',
        section: 'أحكام القصاص والعفو',
        text: 'يَا أَيُّهَا الَّذِينَ آمَنُوا كُتِبَ عَلَيْكُمُ الْقِصَاصُ فِي الْقَتْلَى ۖ ... فَمَنْ عُفِيَ لَهُ مِنْ أَخِيهِ شَيْءٌ فَاتِّبَاعٌ بِالْمَعْرُوفِ وَأَدَاءٌ إِلَيْهِ بِإِحْسَانٍ ۗ ذَٰلِكَ تَخْفِيفٌ مِّن رَّبِّكُمْ وَرَحْمَةٌ',
        evidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },

    // =========================================================================
    // GROUP 3: FALSE DIRECT TRAPS (18 CASES) - MUST NOT BE DIRECT
    // =========================================================================
    {
      id: 'v3_trap_01_compound_modern_banking',
      name: 'فخ دلالي: دعوى مركبة لتفاصيل الاحتياطي الإلزامي والمشتقات مقابل آية الربا العامة',
      question: 'هل فصل القرآن أحكام الاحتياطي الإلزامي والمشتقات المالية المعاصرة؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v3_26',
        statement: 'نص القرآن الكريم صراحة على تفاصيل وضوابط الاحتياطي الإلزامي المصرفي وعقود المشتقات المالية الحديثة',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_2_275_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_trap_02_compound_treaty_details',
      name: 'فخ دلالي: طلب بنود العهدة العمرية التفصيلية مقابل تلخيص عارض في كتاب شبهات',
      question: 'ما هي الشروط والبنود الكاملة للعهدة العمرية لأهل إيلياء نصاً؟',
      task: 'VERIFY_HISTORY',
      claim: {
        claimId: 'c_v3_27',
        statement: 'تتضمن العهدة العمرية اثني عشر بنداً وثائقياً مفصلاً في حفظ الكنائس ودفع الجزية وعدم إسكان اللصوص',
        requiredEvidenceType: 'HISTORICAL_FACT'
      },
      chunkId: 'rec_misc_bayyinat_sword_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_trap_03_why_usury_prohibition',
      name: 'فخ دلالي: سؤال علة وحكمة اقتصادية مقابل آية أصل التحريم المجرد',
      question: 'لماذا حرم الله الربا وما هي الحكمة الاقتصادية والعلة في منعه؟',
      task: 'WHY',
      claim: {
        claimId: 'c_v3_28',
        statement: 'علة وحكمة تحريم الربا هي منع تركز الثروة في أيدي قلة وتفادي التضخم وحماية الضعفاء من الاستغلال',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_quran_2_275_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_trap_04_definition_incidental_mention',
      name: 'فخ دلالي: ورود لفظ الشرك عرضاً في حكم فقهي مقابل سؤال تعريف المصطلح',
      question: 'ما هو تعريف الشرك اصطلاحاً وماهيته الشرعية الدقيقة؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_v3_29',
        statement: 'الشرك هو مساواة غير الله بالله فيما يختص به سبحانه وتعالى',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      chunkId: 'rec_synth_v3_incidental_shirk',
      chunkData: {
        chunkId: 'rec_synth_v3_incidental_shirk',
        sourceName: 'الفقه الإسلامي وأدلته',
        domain: 'FIQH',
        title: 'كتاب الصيد والذبائح',
        section: 'التسمية على الذبيحة',
        text: 'يُشترط أن يذكر الذابح اسم الله وحده، فلو ذكر اسم صنم مع اسم الله لكان ذبحه شركاً باطلاً لا تؤكل ذبيحته.',
        evidenceType: 'SCHOLARLY_EXPLANATION'
      },
      expectedRelation: EVIDENCE_RELATIONS.INCIDENTAL,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    {
      id: 'v3_trap_05_consensus_single_scholar',
      name: 'فخ دلالي: دعوى إجماع المذاهب الأربعة مقابل قول فقيه حنبلي بمفرده',
      question: 'هل أجمع فقهاء المذاهب الأربعة كافة على وجوب تغطية وجه المرأة في الصلاة؟',
      task: 'VERIFY_CONSENSUS',
      claim: {
        claimId: 'c_v3_30',
        statement: 'انعقد الإجماع القطعي بين جميع علماء المذاهب الأربعة على وجوب تغطية المرأة لوجهها في الصلاة',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_synth_v3_single_scholar',
      chunkData: {
        chunkId: 'rec_synth_v3_single_scholar',
        sourceName: 'كشاف القناع عن متن الإقناع',
        domain: 'FIQH',
        title: 'كتاب الصلاة',
        section: 'شروط صحة الصلاة وستر العورة',
        text: 'قال البهوتي رحمه الله: والوجه من الحرة عورة خارج الصلاة عند الأصحاب، وفي الصلاة تسفر وجهها اتفاقاً.',
        evidenceType: 'SCHOLARLY_EXPLANATION'
      },
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_trap_06_tafsir_for_quran_canonical',
      name: 'فخ دلالي: طلب نص قرآني مجرد من المصحف مقابل شرح تفسيري بياني',
      question: 'أريد النص القرآني الدقيق للآية الثانية من سورة الإخلاص مجرداً من المصحف',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_v3_31',
        statement: 'نص الآية الكريمة الدقيق هو: اللَّهُ الصَّمَدُ',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_tafsir_dorar_ikhlas_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_trap_07_medical_hygiene_compound',
      name: 'فخ دلالي: حديث غسل اليدين عند الاستيقاظ مقابل دعوى تعقيم غرف العمليات الجراحية المعاصرة',
      question: 'هل نص الحديث النبوي على ضوابط تعقيم المعامل الطبية والمشافي الحديثة؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v3_32',
        statement: 'بينت السنة النبوية الشريفة معايير التعقيم الكيميائي والبيولوجي لغرف العمليات في المشافي المعاصرة',
        requiredEvidenceType: 'HADITH_CANONICAL_TEXT'
      },
      chunkId: 'rec_synth_v3_hand_wash',
      chunkData: {
        chunkId: 'rec_synth_v3_hand_wash',
        sourceName: 'صحيح مسلم',
        domain: 'HADITH',
        title: 'كتاب الطهارة',
        section: 'غسل اليدين ثلاثاً بعد الاستيقاظ',
        text: 'إذا استيقظ أحدكم من نومه فلا يغمس يده في الإناء حتى يغسلها ثلاثاً فإنه لا يدري أين باتت يده.',
        evidenceType: 'HADITH_CANONICAL_TEXT'
      },
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_trap_08_astronomical_calculation',
      name: 'فخ دلالي: آيات منازل القمر العامة مقابل دعوى إلزام الحساب الفلكي الرصدي للأهلة',
      question: 'هل فرض القرآن الكريم اعتماد المراصد الفلكية الرقمية حصراً لإثبات الشهور؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v3_33',
        statement: 'ألزم القرآن الكريم جميع المسلمين بالأخذ بالحساب الفلكي الرقمي الرصدي دون الرؤية البصرية في ثبوت هلال رمضان',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_synth_v3_quran_moon_phases',
      chunkData: {
        chunkId: 'rec_synth_v3_quran_moon_phases',
        sourceName: 'القرآن الكريم',
        domain: 'QURAN',
        title: 'سورة يونس آية 5',
        section: 'آيات الكون ومنازل القمر',
        text: 'هُوَ الَّذِي جَعَلَ الشَّمْسَ ضِيَاءً وَالْقَمَرَ نُورًا وَقَدَّرَهُ مَنَازِلَ لِتَعْلَمُوا عَدَدَ السِّنِينَ وَالْحِسَابَ ۚ مَا خَلَقَ اللَّهُ ذَٰلِكَ إِلَّا بِالْحَقِّ',
        evidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_trap_09_democracy_shura_compound',
      name: 'فخ دلالي: آية الشورى العامة مقابل تفاصيل النظم البرلمانية والدستورية الحديثة',
      question: 'هل فصل القرآن قانون الانتخابات البرلمانية وتقسيم الدوائر الديمقراطية؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v3_34',
        statement: 'القرآن فصل شروط الترشح للبرلمان وآليات الاقتراع السري وتقسيم الدوائر الانتخابية في النظم المعاصرة',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_synth_v3_shura_general',
      chunkData: {
        chunkId: 'rec_synth_v3_shura_general',
        sourceName: 'القرآن الكريم',
        domain: 'QURAN',
        title: 'سورة الشورى آية 38',
        section: 'صفات المؤمنين ومبدأ الشورى',
        text: 'وَالَّذِينَ اسْتَجَابُوا لِرَبِّهِمْ وَأَقَامُوا الصَّلَاةَ وَأَمْرُهُمْ شُورَىٰ بَيْنَهُمْ وَمِمَّا رَزَقْنَاهُمْ يُنفِقُونَ',
        evidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_trap_10_equality_hadith_blend',
      name: 'فخ دلالي: آية الحجرات العامة مقابل ادعاء يدمج حرفياً ألفاظ خطبة الوداع',
      question: 'هل نص القرآن بلفظه على أن الناس سواسية كأسنان المشط ولا فضل لعربي على أعجمي؟',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_v3_35',
        statement: 'نصت آية الحجرات على أن الناس سواسية كأسنان المشط ولا فضل لعربي على أعجمي إلا بالتقوى بحروفها',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_49_13_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_trap_11_personal_fatwa_divorce',
      name: 'فخ دلالي: ضوابط الفتوى العامة مقابل نازلة طلاق شخصية معلقة بالشرط',
      question: 'حلفت على زوجتي بالطلاق إن زارت أختها فزارتها، فهل وقع الطلاق في مذهبنا؟',
      task: 'PERSONAL_FATWA',
      claim: {
        claimId: 'c_v3_36',
        statement: 'يقع الطلاق المعلق قضاءً في هذه الواقعة وتلزم الكفارة بنص الفتوى الصريحة لهذه الحالة',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_fiqh_dorar_fatwa_rules_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_trap_12_fard_ayn_traders',
      name: 'فخ دلالي: عموم فريضة طلب العلم مقابل دعوى تخصيص فقه البيوع على نقابات التجار',
      question: 'هل حديث طلب العلم فريضة ينص بحروفه على إلزام نقابات التجار بامتحانات رسمية؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v3_37',
        statement: 'الحديث الشريف يوجب امتحانات إلزامية معاصرة ومنح تراخيص ممارسة التجارة لجميع التجار في السوق',
        requiredEvidenceType: 'HADITH_CANONICAL_TEXT'
      },
      chunkId: 'rec_synth_v3_ilm_faridah',
      chunkData: {
        chunkId: 'rec_synth_v3_ilm_faridah',
        sourceName: 'سنن ابن ماجه',
        domain: 'HADITH',
        title: 'فضل طلب العلم',
        section: 'باب فضل العلماء والحث على طلب العلم',
        text: 'طلب العلم فريضة على كل مسلم، وواضع العلم عند غير أهله كمقلد الخنازير الجوهر واللؤلؤ والذهب.',
        evidenceType: 'HADITH_CANONICAL_TEXT'
      },
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_trap_13_sufism_critique_blend',
      name: 'فخ دلالي: حديث جبريل في الإحسان مقابل دعوى نفي مصطلحات الفناء والحلول الصوفي',
      question: 'كيف ينقد علماء الأصول نظريات الفناء والاتحاد والمكاشفة عند غلاة المتصوفة؟',
      task: 'VERIFY_CLAIM',
      claim: {
        claimId: 'c_v3_38',
        statement: 'حديث جبريل يبطل صراحة مصطلحات الفناء الذاتي والحلول الصوفي ويثبت المنهج السلفي في نقدها',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_hadith_bukhari_50_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.CONTEXTUAL,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_trap_14_atypical_inheritance_dispute',
      name: 'فخ دلالي: عموم آيات المواريث في الأولاد مقابل المسألة الشائكة في الجد مع الإخوة',
      question: 'ما هو الحل الفقهي القطعي المتفق عليه لمسألة ميراث الجد مع الإخوة الأشقاء؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v3_39',
        statement: 'نصت الآية القرآنية نصاً قطعياً على حكم الجد مع الإخوة الأشقاء ومنعت الخلاف بين الصحابة في قسمتها',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_synth_v3_inheritance_general',
      chunkData: {
        chunkId: 'rec_synth_v3_inheritance_general',
        sourceName: 'القرآن الكريم',
        domain: 'QURAN',
        title: 'سورة النساء آية 11',
        section: 'أحكام مواريث الأولاد والوالدين',
        text: 'يُوصِيكُمُ اللَّهُ فِي أَوْلَادِكُمْ ۖ لِلذَّكَرِ مِثْلُ حَظِّ الْأُنثَيَيْنِ ۚ فَإِن كُنَّ نِسَاءً فَوْقَ اثْنَتَيْنِ فَلَهُنَّ ثُلُثَا مَا تَرَكَ ۖ ... وَلِأَبَوَيْهِ لِكُلِّ وَاحِدٍ مِّنْهُمَا السُّدُسُ مِمَّا تَرَكَ إِن كَانَ لَهُ وَلَدٌ',
        evidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_trap_15_black_seed_diabetes_cure',
      name: 'فخ دلالي: عموم حديث الحبة السوداء شفاء من كل داء مقابل دعوى الاستغناء عن الأنسولين في السكري',
      question: 'هل يغني تناول الحبة السوداء عن أخذ جرعات الأنسولين لمرضى السكري من النوع الأول؟',
      task: 'VERIFY_CLAIM',
      claim: {
        claimId: 'c_v3_40',
        statement: 'الحبة السوداء كافية طبياً لعلاج تلف خلايا البنكرياس والاستغناء التام عن الأنسولين الصناعي لمرضى السكري',
        requiredEvidenceType: 'HADITH_CANONICAL_TEXT'
      },
      chunkId: 'rec_synth_v3_black_seed',
      chunkData: {
        chunkId: 'rec_synth_v3_black_seed',
        sourceName: 'صحيح البخاري',
        domain: 'HADITH',
        title: 'كتاب الطب',
        section: 'الحبة السوداء',
        text: 'إن في الحبة السوداء شفاء من كل داء إلا السام، والسام الموت.',
        evidenceType: 'HADITH_CANONICAL_TEXT'
      },
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_trap_16_diplomatic_law_compound',
      name: 'فخ دلالي: حديث في إفشاء السلام مقابل دعوى تقنين الحصانة الدبلوماسية الحديثة في المعاهدات',
      question: 'هل فصلت الأحاديث النبوية اتفاقية فيينا للعلاقات والحصانات الدبلوماسية؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v3_41',
        statement: 'السنة النبوية قننت الحصانة الدبلوماسية للمبعوثين ونظام الحقيبة الدبلوماسية والبروتوكولات الدولية المعاصرة',
        requiredEvidenceType: 'HADITH_CANONICAL_TEXT'
      },
      chunkId: 'rec_synth_v3_salam_hadith',
      chunkData: {
        chunkId: 'rec_synth_v3_salam_hadith',
        sourceName: 'صحيح البخاري',
        domain: 'HADITH',
        title: 'كتاب الإيمان',
        section: 'إفشاء السلام من الإيمان',
        text: 'أن رجلاً سأل النبي صلى الله عليه وسلم: أي الإسلام خير؟ قال: تُطعم الطعام، وتَقرأ السلام على من عرفت ومن لم تعرف.',
        evidenceType: 'HADITH_CANONICAL_TEXT'
      },
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_trap_17_definition_barakah_incidental',
      name: 'فخ دلالي: حديث البركة مع أكابركم مقابل سؤال تعريف مصطلح البركة اصطلاحاً',
      question: 'ما هو تعريف مصطلح البركة اصطلاحاً وما حقيقتها الشرعية؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_v3_42',
        statement: 'البركة اصطلاحاً هي ثبوت الخير الإلهي في الشيء ونماؤه واستقراره',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      chunkId: 'rec_synth_v3_barakah_akabir',
      chunkData: {
        chunkId: 'rec_synth_v3_barakah_akabir',
        sourceName: 'صحيح ابن حبان',
        domain: 'HADITH',
        title: 'كتاب الرقائق',
        section: 'التماس البركة في الأكابر',
        text: 'قال رسول الله صلى الله عليه وسلم: البركة مع أكابركم؛ فاحرصوا على مجالسة أهل الفضل وأهل العلم.',
        evidenceType: 'HADITH_CANONICAL_TEXT'
      },
      expectedRelation: EVIDENCE_RELATIONS.INCIDENTAL,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    {
      id: 'v3_trap_18_tawheed_subdivisions_hadith',
      name: 'فخ دلالي: حديث في عبادة الله وحده مقابل التفريعات الأكاديمية الثلاثية للتوحيد',
      question: 'أين نجد الاصطلاح الأكاديمي الثلاثي (ربوبية، ألوهية، أسماء وصفات) في متن حديث نبوي واحد؟',
      task: 'VERIFY_HADITH',
      claim: {
        claimId: 'c_v3_43',
        statement: 'نص النبي صلى الله عليه وسلم في حديث واحد بلفظه على هذه الأقسام الثلاثة: توحيد الربوبية، وتوحيد الألوهية، وتوحيد الأسماء والصفات',
        requiredEvidenceType: 'HADITH_CANONICAL_TEXT'
      },
      chunkId: 'rec_hadith_bukhari_8_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },

    // =========================================================================
    // GROUP 4: SUPPORTING EVIDENCE (8 CASES)
    // =========================================================================
    {
      id: 'v3_sup_01_fiqh_fatwa_guidelines',
      name: 'دليل مؤيد: شروط المفتي العامة تؤيد اشتراط التأهيل العلمي للفتوى',
      question: 'هل يشترط في المفتي التأهيل والرسوخ العلمي قبل التصدي لإفتاء الناس؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v3_44',
        statement: 'الفتوى الشرعية تتطلب الرسوخ في الفقه وأصوله ومعرفة الواقع والورع في القول على الله بغير علم',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_fiqh_dorar_fatwa_rules_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_sup_02_quran_4_82_reflection',
      name: 'دليل مؤيد: آية النساء 82 تؤيد الدعوة إلى تدبر القرآن الكريم',
      question: 'ما الدليل على وجوب تدبر آيات القرآن الكريم والتفكر في دلالاتها؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v3_45',
        statement: 'حث القرآن الكريم على إعمال العقل والتدبر في نظمه وأحكامه وبيّن إعجازه التام',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_4_82_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_sup_03_bayyinat_sword_context',
      name: 'دليل مؤيد: مباحث بينات في المعاهدات تؤيد دعوى رعاية الإسلام للمواثيق',
      question: 'هل يرعى الإسلام المعاهدات والمواثيق مع غير المسلمين في السلم؟',
      task: 'RESOLVE_MISCONCEPTION',
      claim: {
        claimId: 'c_v3_46',
        statement: 'الإسلام يوجب الوفاء بالعهود والمواثيق مع الدول والملل الأخرى ويحرم الغدر والخيانة قطعاً',
        requiredEvidenceType: 'HISTORICAL_FACT'
      },
      chunkId: 'rec_misc_bayyinat_sword_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_sup_04_tafsir_ikhlas_virtues',
      name: 'دليل مؤيد: تفسير سورة الإخلاص يؤيد فضل السورة وتعديلها ثلث القرآن',
      question: 'ما وجه كون سورة الإخلاص تعدل ثلث القرآن في الفضل والمعنى؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v3_47',
        statement: 'سورة الإخلاص تعدل ثلث القرآن لأن معاني القرآن ثلاثة: عقائد وأحكام وقصص، وهي تمحضت للتوحيد والعقيدة',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_tafsir_dorar_ikhlas_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_sup_05_bukhari_pillars_hajj_support',
      name: 'دليل مؤيد: حديث أركان الإسلام الخمسة يؤيد فرضية الحج على المستطيع',
      question: 'ما الدليل من السنة النبوية على أن الحج ركن من أركان الإسلام؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v3_48',
        statement: 'الحج إلى بيت الله الحرام فريضة وركن من أركان الإسلام التي لا يستقيم إلا بها لمن استطاع إليه سبيلاً',
        requiredEvidenceType: 'HADITH_CANONICAL_TEXT'
      },
      chunkId: 'rec_hadith_bukhari_8_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_sup_06_dawah_wisdom_dispute',
      name: 'دليل مؤيد: آية النحل 125 تؤيد مشروعية الحوار والجدال بالتي هي أحسن',
      question: 'هل أذن الإسلام بمناظرة غير المسلمين ومجادلتهم بالحجة والبيان؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v3_49',
        statement: 'أمر الإسلام بمجادلة المخالفين وأهل الكتاب بالطريقة الحسنة والبرهان العقلي والنقلي الرصين',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_16_125_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_sup_07_tanzih_shura_hearing',
      name: 'دليل مؤيد: قوله تعالى وهو السميع البصير يؤيد إثبات صفتي السمع والبصر',
      question: 'ما الدليل على إثبات صفتي السمع والبصر لله تعالى بلا تكييف؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v3_50',
        statement: 'أهل السنة يثبتون صفة السمع والبصر لله تعالى على ما يليق بجلاله دون تمثيل أو تعطيل',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_synth_v3_tanzih_base',
      chunkData: {
        chunkId: 'rec_synth_v3_tanzih_base',
        sourceName: 'القرآن الكريم',
        domain: 'QURAN',
        title: 'سورة الشورى آية 11',
        section: 'تنزيه الله وإثبات صفاته',
        text: 'فَاطِرُ السَّمَاوَاتِ وَالْأَرْضِ ۚ جَعَلَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا وَمِنَ الْأَنْعَامِ أَزْوَاجًا ۖ يَذْرَؤُكُمْ فِيهِ ۚ لَيْسَ كَمِثْلِهِ شَيْءٌ ۖ وَهُوَ السَّمِيعُ الْبَصِيرُ',
        evidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_sup_08_dorar_hadith_eval_method',
      name: 'دليل مؤيد: منهج المحدثين في التخريج ونقد الروايات يؤيد معايير الصحة',
      question: 'كيف يتثبت علماء الحديث من صحة الروايات المنسوبة لرسول الله؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v3_51',
        statement: 'نقد الحديث عند أئمة الصنعة يتضمن فحص عدالة الرواة وضبطهم واتصال السند وسلامة المتن من الشذوذ والعلة',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_hadith_dorar_watani_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },

    // =========================================================================
    // GROUP 5: CONTEXTUAL EVIDENCE (4 CASES)
    // =========================================================================
    {
      id: 'v3_ctx_01_historical_sira_context',
      name: 'سياقي: سياق أحداث صلح الحديبية خلفية تاريخية لفتح مكة',
      question: 'ما هي الظروف السياسية التي أحاطت بفتح مكة ودخول المسلمين إليها؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v3_52',
        statement: 'نقض قريش لحلف خزاعة وصلح الحديبية كان السبب التاريخي المباشر لتحرك جيش المسلمين لفتح مكة',
        requiredEvidenceType: 'HISTORICAL_FACT'
      },
      chunkId: 'rec_misc_bayyinat_sword_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.CONTEXTUAL,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_ctx_02_linguistic_lexicon_asl',
      name: 'سياقي: الأصل الاشتقاقي لكلمة برك في المعجم العربي',
      question: 'ما هو الاشتقاق اللغوي لمادة (ب ر ك) في لسان العرب؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v3_53',
        statement: 'أصل البركة لغوياً مأخوذ من بروك البعير وهو لزومه وثبوته في الأرض ومنه بركة الماء لثبوتها واستقرارها',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      chunkId: 'rec_term_jamhara_barakah_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.CONTEXTUAL,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_ctx_03_usul_ijma_definition',
      name: 'سياقي: أصل تعريف الإجماع في كتب الأصول سياق لمسألة اتفاق العلماء',
      question: 'ما هو المعنى الأصولي للإجماع وكيف ينعقد في الشريعة؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v3_54',
        statement: 'الإجماع هو اتفاق مجتهدي أمة محمد صلى الله عليه وسلم في عصر من الأعصار بعد وفاته على حكم شرعي',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_fiqh_dorar_fatwa_rules_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.CONTEXTUAL,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    {
      id: 'v3_ctx_04_tafsir_sabab_nuzul',
      name: 'سياقي: أسباب نزول سورة الإخلاص سياق توضيحي لآيات السورة',
      question: 'ما هو سبب نزول سورة الإخلاص عندما سأل المشركون عن نسب الله؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v3_55',
        statement: 'نزلت سورة الإخلاص رداً على سؤال المشركين واليهود للنبي: انسب لنا ربك أمن ذهب هو أم من فضة',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_tafsir_dorar_ikhlas_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.CONTEXTUAL,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },

    // =========================================================================
    // GROUP 6: INCIDENTAL EVIDENCE (3 CASES)
    // =========================================================================
    {
      id: 'v3_inc_01_word_mention_inheritance',
      name: 'ورود عرضي: نص في الطهارة يذكر كلمة الفروض في غير سياق المواريث',
      question: 'ما هي أحكام الأنصبة والفروض المقدرة في كتاب المواريث؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v3_56',
        statement: 'الفروض المقدرة في كتاب الله ستة: النصف والربع والثمن والثلثان والثلث والسدس',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_synth_v3_wudu_faraid',
      chunkData: {
        chunkId: 'rec_synth_v3_wudu_faraid',
        sourceName: 'الفقه الميسر',
        domain: 'FIQH',
        title: 'كتاب الطهارة',
        section: 'فروض الوضوء وسننه',
        text: 'فروض الوضوء التي لا يصح إلا بها ستة: غسل الوجه، وغسل اليدين إلى المرفقين، ومسح الرأس، وغسل الرجلين، والترتيب، والموالاة.',
        evidenceType: 'SCHOLARLY_EXPLANATION'
      },
      expectedRelation: EVIDENCE_RELATIONS.INCIDENTAL,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    {
      id: 'v3_inc_02_word_mention_prayer_usury',
      name: 'ورود عرضي: نص في صلاة الكسوف يذكر كلمة الربا كذنب عام عرضاً',
      question: 'ما هو حكم فوائد شهادات الاستثمار البنكية المعاصرة؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v3_57',
        statement: 'تعتبر فوائد شهادات الاستثمار البنكية المحددة مسبقاً من قبيل الربا المحرم شرعاً',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_synth_v3_eclipse_usury',
      chunkData: {
        chunkId: 'rec_synth_v3_eclipse_usury',
        sourceName: 'صحيح البخاري',
        domain: 'HADITH',
        title: 'كتاب الكسوف',
        section: 'خطبة النبي في الكسوف والتحذير من المعاصي',
        text: 'ورأيت في النار أقواماً يعذبون من أهل الربا والزنا، وإن الشمس والقمر آيتان من آيات الله لا ينكسفان لموت أحد ولا لحياته فإذا رأيتم ذلك فافزعوا إلى الصلاة.',
        evidenceType: 'HADITH_CANONICAL_TEXT'
      },
      expectedRelation: EVIDENCE_RELATIONS.INCIDENTAL,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    {
      id: 'v3_inc_03_word_mention_zakat_crops',
      name: 'ورود عرضي: نص في الذبائح يذكر إخراج الصدقة في غير سياق نصاب الحبوب',
      question: 'ما هو نصاب زكاة الحبوب والثمار بالكيل والصاع الشرعي؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v3_58',
        statement: 'نصاب زكاة الحبوب والثمار خمسة أوسق، والوسق ستون صاعاً بصاع النبي صلى الله عليه وسلم',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_synth_v3_hunting_mention',
      chunkData: {
        chunkId: 'rec_synth_v3_hunting_mention',
        sourceName: 'الفقه الإسلامي وأدلته',
        domain: 'FIQH',
        title: 'كتاب الصيد والذبائح',
        section: 'إطعام الفقراء والتصدق من الصيد',
        text: 'يُستحب لمن اصطاد صيداً حلالاً أن يتصدق ببعضه على المساكين شكراً لله على تيسير الرزق، وتسن الصدقة في كل مباح.',
        evidenceType: 'SCHOLARLY_EXPLANATION'
      },
      expectedRelation: EVIDENCE_RELATIONS.INCIDENTAL,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },

    // =========================================================================
    // GROUP 7: UNRELATED EVIDENCE (2 CASES)
    // =========================================================================
    {
      id: 'v3_unr_01_slaughtering_vs_prayer',
      name: 'غير مرتبط: شروط نحر الإبل مقابل دعوى أوقات صلاة الظهر والعصر',
      question: 'ما هي المواقيت الشرعية الدقيقة لدخول صلاة الظهر وصلاة العصر؟',
      task: 'VERIFY_RULING',
      claim: {
        claimId: 'c_v3_59',
        statement: 'يبدأ وقت صلاة الظهر بزوال الشمس عن كبد السماء ويمتد إلى أن يصير ظل كل شيء مثله',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_synth_v3_camel_slaughter',
      chunkData: {
        chunkId: 'rec_synth_v3_camel_slaughter',
        sourceName: 'الفقه الإسلامي وأدلته',
        domain: 'FIQH',
        title: 'كتاب الذبائح والصيد',
        section: 'شروط نحر الإبل وعقر الشارد',
        text: 'يُشترط في تذكية الإبل النحر في اللبة مع التسمية وقطع الودجين والمريء بآلة حادة غير سن ولا ظفر.',
        evidenceType: 'SCHOLARLY_EXPLANATION'
      },
      expectedRelation: EVIDENCE_RELATIONS.UNRELATED,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    {
      id: 'v3_unr_02_wudu_vs_space_physics',
      name: 'غير مرتبط: مسح الخفين مقابل نظرية الانفجار الكوني والفيزياء الفلكية',
      question: 'كيف تفسر الفيزياء الفلكية نشأة الثقوب السوداء وأفق الحدث؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_v3_60',
        statement: 'تتشكل الثقوب السوداء عند انهيار النجوم العملاقة تحت وطأة جاذبيتها الذاتية متجاوزة حد شاندراسيخار',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_synth_v3_wudu_khuffayn',
      chunkData: {
        chunkId: 'rec_synth_v3_wudu_khuffayn',
        sourceName: 'الفقه الميسر',
        domain: 'FIQH',
        title: 'كتاب الطهارة',
        section: 'المسح على الخفين والجوربين',
        text: 'يجوز للمقيم المسح على الخفين يوماً وليلة، وللمسافر ثلاثة أيام بلياليهن، ويبدأ احتساب المدة من أول مسح بعد الحدث.',
        evidenceType: 'SCHOLARLY_EXPLANATION'
      },
      expectedRelation: EVIDENCE_RELATIONS.UNRELATED,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    }
  ];

  it('should run full holdout evaluation on 60 unseen scenarios with live Gemini AI and report verbatim metrics', async () => {
    if (!isGeminiConfigured()) {
      console.warn('GEMINI_API_KEY is not configured. Skipping live AI holdout benchmark.');
      return;
    }

    console.log(`\n===============================================================`);
    console.log(`STARTING MISHKAT PHASE 5C FINAL FRESH HOLDOUT V3 BENCHMARK`);
    console.log(`Live AI Mode | Model: ${process.env.GEMINI_MODEL || 'gemini-flash-lite-latest'}`);
    console.log(`Pacing delay: 4500ms between calls (respecting 15 RPM free tier)`);
    console.log(`Total Unseen Pairs: ${HOLDOUT_V3_PAIRS.length}`);
    console.log(`===============================================================\n`);

    const results = [];
    const latencies = [];
    let exactRelationMatches = 0;
    let answersExactMatches = 0;
    let contradictionCorrect = 0;
    let totalContradictionCases = 0;

    let trueDirectCount = 0;
    let falseDirectCount = 0;
    let expectedDirectCount = 0;
    let falseNegativeCount = 0;

    let apiSuccessCount = 0;
    let fallbackCount = 0;

    for (let i = 0; i < HOLDOUT_V3_PAIRS.length; i++) {
      const pair = HOLDOUT_V3_PAIRS[i];
      let chunk = repo.getChunk(pair.chunkId);
      if (!chunk && pair.chunkData) {
        chunk = {
          recordId: `rec_${pair.chunkId}`,
          ...pair.chunkData
        };
      }
      assert.ok(chunk, `Chunk ${pair.chunkId} must exist in repo or be provided as chunkData`);

      const interpretation = {
        originalQuestion: pair.question,
        task: pair.task,
        userGoal: 'التحقق الدلالي للادعاء',
        claimsToResolve: [pair.claim]
      };

      const retrievalResult = {
        queryId: `qret_v3_${i + 1}`,
        claims: [
          {
            claimId: pair.claim.claimId,
            query: { claimText: pair.claim.statement, requestedEvidence: pair.claim.requiredEvidenceType },
            candidates: [
              {
                ...chunk,
                finalRank: 1,
                scores: { lexicalScore: 8.5, semanticScore: 0.85, rrfScore: 0.95 }
              }
            ]
          }
        ]
      };

      const callStart = Date.now();
      const output = await service.verifyEvidence({
        interpretation,
        retrievalResult,
        options: {
          mode: 'ai',
          allowFallback: false,
          maxRateLimitRetries: 5
        }
      });
      const latencyMs = Date.now() - callStart;
      latencies.push(latencyMs);

      assert.ok(output && output.claims && output.claims.length === 1);
      const ev = output.claims[0].evidence[0];
      assert.ok(ev, `Evidence verdict must exist for ${pair.id}`);

      if (ev.verificationMode === 'AI_VERIFICATION') {
        apiSuccessCount++;
      } else {
        fallbackCount++;
      }

      const relationMatch = ev.relation === pair.expectedRelation;
      if (relationMatch) {
        exactRelationMatches++;
      }

      if (ev.answersExactClaim === pair.expectedAnswersExact) {
        answersExactMatches++;
      }

      if (pair.expectedContradicts === true) {
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
      console.log(`[${String(i + 1).padStart(2, '0')}/60] ${statusSymbol}${trapIndicator} ${pair.id} -> Predicted: ${ev.relation} | Expected: ${pair.expectedRelation} (${latencyMs}ms)`);
      if (!relationMatch) {
        console.log(`   Detailed mismatch: predicted=${ev.relation}, expected=${pair.expectedRelation}, contra=${ev.contradictsClaim}, coverage=${ev.materialClaimCoverage}, reason: ${ev.reason}`);
      }

      // Rate-aware pacing delay between calls to prevent HTTP 429
      await new Promise(r => setTimeout(r, 4500));
    }

    // Aggregate statistics
    const totalPairs = HOLDOUT_V3_PAIRS.length;
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

    const diag = globalEvidenceDiagnostics.getSummary();

    console.log(`\n===============================================================`);
    console.log(`PHASE 5C HOLDOUT V3 FINAL VERIFICATION METRICS`);
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
    console.log(`429 Rate Limit Hits:         ${diag.rateLimit429Count}`);
    console.log(`Successful Retries on 429:   ${diag.successfulRetryCount}`);
    console.log(`Exhausted Retries on 429:    ${diag.exhaustedRetryCount}`);
    console.log(`===============================================================\n`);

    // Strict exit criteria assertions
    assert.equal(fallbackCount, 0, 'No fallbacks allowed during official holdout evaluation');
    assert.equal(apiSuccessCount, totalPairs, 'All 60 API calls must succeed without error');
    assert.equal(falseDirectCount, 0, 'False DIRECT must be 0 (Zero False DIRECT tolerance)');
    assert.ok(Number(directPrecision) >= 95.0, `DIRECT precision must be >= 95.0%, got ${directPrecision}%`);
    assert.ok(Number(contradictionAccuracy) >= 95.0, `Contradiction accuracy must be >= 95.0%, got ${contradictionAccuracy}%`);
  });
});
