/**
 * Mishkat Phase 5: Semantic Evidence Verification — Fresh Holdout Benchmark
 * 
 * STRICT PROTOCOL (Section 22):
 * - 32 unseen Claim x Evidence pairs
 * - Tests DIRECT, SUPPORTING, CONTEXTUAL, INCIDENTAL, and UNRELATED relations
 * - Includes contradictions, lexical overlap traps, definition vs usage, why vs what
 * - Uses ONLY the 33 existing production KnowledgeChunks
 * - FIRST-RUN results reported verbatim without post-hoc tuning
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTrustedSourceRepository } from '../src/mishkat/knowledge/TrustedSourceRepository.js';
import {
  EvidenceVerificationService,
  EVIDENCE_RELATIONS,
  VERIFICATION_STATUS
} from '../src/mishkat/evidence/index.js';

describe('Mishkat Phase 5: Semantic Evidence Verification Fresh Holdout (First Run)', () => {
  let service;
  let repo;

  before(async () => {
    repo = defaultTrustedSourceRepository;
    if (repo.chunkCount === 0) {
      repo.loadFromDisk('data/knowledge');
    }
    service = new EvidenceVerificationService();
  });

  // 32 Curated Holdout Claim x Evidence Pairs
  const HOLDOUT_PAIRS = [
    // 01. DIRECT: Quran Verse
    {
      id: 'hp_01_quran_direct',
      name: 'آية نفي الإكراه في الدين (البقرة 256)',
      question: 'ما نص الآية التي تنهى عن الإكراه في الدين؟',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_01',
        statement: 'لا إكراه في الدين قد تبين الرشد من الغي آية قرآنية كريمة في سورة البقرة',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_2_256_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 02. SUPPORTING: Tafsir on Quran Verse
    {
      id: 'hp_02_tafsir_supporting',
      name: 'تفسير آية لا إكراه في الدين',
      question: 'ما نص الآية التي تنهى عن الإكراه في الدين؟',
      task: 'EXPLORE_TOPIC',
      claim: {
        claimId: 'c_02',
        statement: 'سورة البقرة آية 256 تقرر حرية الاعتقاد ونفي الإكراه وتفسيرها يبين ذلك',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_tafsir_dorar_ikrah_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 03. DIRECT: Hadith Bukhari 1
    {
      id: 'hp_03_hadith_niyyah_direct',
      name: 'حديث إنما الأعمال بالنيات في صحيح البخاري',
      question: 'هل حديث إنما الأعمال بالنيات مروي في صحيح البخاري؟',
      task: 'VERIFY_HADITH',
      claim: {
        claimId: 'c_03',
        statement: 'حديث إنما الأعمال بالنيات مروي في صحيح البخاري عن عمر بن الخطاب رضي الله عنه',
        requiredEvidenceType: 'HADITH_ISNAD_STATUS'
      },
      chunkId: 'rec_hadith_bukhari_1_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 04. INCIDENTAL: Lexical Overlap Trap / Bukhari Mention
    {
      id: 'hp_04_bukhari_lexical_trap',
      name: 'فخ تشابه لفظي: حديث آخر في البخاري',
      question: 'هل حديث إنما الأعمال بالنيات مروي في صحيح البخاري؟',
      task: 'VERIFY_HADITH',
      claim: {
        claimId: 'c_04',
        statement: 'حديث إنما الأعمال بالنيات مروي في صحيح البخاري',
        requiredEvidenceType: 'HADITH_ISNAD_STATUS'
      },
      chunkId: 'rec_hadith_bukhari_8_chk_0', // بني الإسلام على خمس
      expectedRelation: EVIDENCE_RELATIONS.INCIDENTAL,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 05. CONTRADICTION / DIRECT: Fabricated Hadith Refutation
    {
      id: 'hp_05_watani_contradiction',
      name: 'تناقض صريح: تخريج مقولة حب الوطن من الإيمان وبيان وضعها',
      question: 'أريد التأكد من صحة حديث حب الوطن من الإيمان',
      task: 'VERIFY_HADITH',
      claim: {
        claimId: 'c_05',
        statement: 'حديث حب الوطن من الإيمان حديث صحيح ثابت عن النبي صلى الله عليه وسلم',
        requiredEvidenceType: 'HADITH_ISNAD_STATUS'
      },
      chunkId: 'rec_hadith_dorar_watani_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },
    // 06. INCIDENTAL: Lexical Overlap on Homeland / Makkah
    {
      id: 'hp_06_homeland_lexical_trap',
      name: 'فخ تشابه لفظي: عفو مكة مقابل حديث حب الوطن',
      question: 'هل حديث حب الوطن من الإيمان صحيح؟',
      task: 'VERIFY_HADITH',
      claim: {
        claimId: 'c_06',
        statement: 'حب الوطن من الإيمان حديث ثابت عن النبي',
        requiredEvidenceType: 'HADITH_ISNAD_STATUS'
      },
      chunkId: 'rec_hist_dorar_makkah_amnesty_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.INCIDENTAL,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 07. DIRECT: Terminology Definition / Taqwa
    {
      id: 'hp_07_taqwa_definition_direct',
      name: 'تعريف مصطلح التقوى الشرعي',
      question: 'ما هو التعريف الاصطلاحي واللغوي للتقوى؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_07',
        statement: 'التقوى لغة الوقاية واصطلاحا حماية النفس من عذاب الله بفعل المأمور واجتناب المحظور',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      chunkId: 'rec_term_jamhara_taqwa_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 08. CONTEXTUAL: Verse Mentioning Taqwa without Definition
    {
      id: 'hp_08_taqwa_contextual_verse',
      name: 'آية الحجرات تذكر التقوى سياقياً دون تعريفها',
      question: 'ما هو التعريف الاصطلاحي للتقوى؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_08',
        statement: 'التقوى لغة الوقاية واصطلاحا طاعة الله واجتناب نواهيه',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      chunkId: 'rec_quran_49_13_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.CONTEXTUAL,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 09. DIRECT: Misconception Refutation / Kaaba Worship
    {
      id: 'hp_09_kaaba_refutation_direct',
      name: 'رد شبهة عبادة الكعبة المشرفة',
      question: 'هل المسلمون يعبدون الكعبة المشرفة؟',
      task: 'REFUTE_DOUBT',
      claim: {
        claimId: 'c_09',
        statement: 'المسلمون لا يعبدون الكعبة ولا يتخذونها وثنا وإنما هي قبلة توحيدية يتجهون إليها بأمر الله',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_misc_bayyinat_kaaba_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 10. SUPPORTING: Qiblah Quran Verse for Kaaba Claim
    {
      id: 'hp_10_qiblah_verse_supporting',
      name: 'آية تحويل القبلة داعمة لدعوى أن الكعبة قبلة',
      question: 'هل المسلمون يعبدون الكعبة؟',
      task: 'REFUTE_DOUBT',
      claim: {
        claimId: 'c_10',
        statement: 'الكعبة قبلة شرعية أمر الله بالتوجه إليها في الصلاة وليست معبودا',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_2_144_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 11. DIRECT: Misconception Refutation / Spread by Sword
    {
      id: 'hp_11_sword_refutation_direct',
      name: 'رد شبهة انتشار الإسلام بالسيف',
      question: 'هل صحيح أن الإسلام انتشر بحد السيف؟',
      task: 'REFUTE_DOUBT',
      claim: {
        claimId: 'c_11',
        statement: 'دعوى انتشار الإسلام بالسيف باطلة وتخالف نصوص القرآن والتاريخ',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_misc_bayyinat_sword_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 12. SUPPORTING: Verse on Wisdom in Dawah Supporting Sword Refutation
    {
      id: 'hp_12_wisdom_verse_supporting',
      name: 'آية الحكمة في الدعوة داعمة لنفي الإكراه بالسيف',
      question: 'هل صحيح أن الإسلام انتشر بحد السيف؟',
      task: 'REFUTE_DOUBT',
      claim: {
        claimId: 'c_12',
        statement: 'المنهج القرآني في نشر الدعوة قائم على الإقناع والحكمة لا الإكراه بالسيف',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_16_125_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 13. INCIDENTAL: Definition vs Usage Trap (Section 15 Fitnah)
    {
      id: 'hp_13_fitnah_usage_incidental',
      name: 'فخ تعريف الفتنة مقابل ورود اللفظ عرضاً في حكم الكذب',
      question: 'ما معنى الفتنة في لغة العرب والشرع؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_13',
        statement: 'الفتنة تعني لغة الاختبار والابتلاء واصطلاحا اضطراب الأمور واختلاط الحق بالباطل',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      syntheticChunk: {
        chunkId: 'rec_synth_fitnah_incidental',
        recordId: 'rec_synth_fitnah',
        sourceId: 'src_synth_fiqh',
        sourceName: 'كتب الفقه',
        domain: 'FIQH',
        title: 'أحكام الكذب ومستثنياته',
        section: 'كتاب الحظر والإباحة',
        text: 'يجوز للمصلح مداراة الناس لتسكين الفتنة بين المتخاصمين ودرء الشقاق.',
        evidenceType: 'SCHOLARLY_EXPLANATION'
      },
      expectedRelation: EVIDENCE_RELATIONS.INCIDENTAL,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 14. SUPPORTING: WHY Claim vs Pure Prohibition Text (Riba)
    {
      id: 'hp_14_riba_why_supporting',
      name: 'سؤال التعليل (لماذا) مقابل نص التحريم المجرد',
      question: 'لماذا حرم الإسلام الربا وما علة ذلك؟',
      task: 'WHY',
      claim: {
        claimId: 'c_14',
        statement: 'علة تحريم الربا هي منع استغلال المحتاجين وأكل أموال الناس دون مقابل عادل',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_quran_2_275_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 15. DIRECT: History Fact / Hudaybiyyah Treaty
    {
      id: 'hp_15_hudaybiyyah_history_direct',
      name: 'تاريخ صلح الحديبية وبنوده',
      question: 'متى عقد صلح الحديبية وما أهم بنوده التاريخية؟',
      task: 'HISTORICAL_CLAIM',
      claim: {
        claimId: 'c_15',
        statement: 'صلح الحديبية عقد في ذي القعدة سنة ست للهجرة وتضمن هدنة عشر سنين',
        requiredEvidenceType: 'HISTORICAL_FACT'
      },
      chunkId: 'rec_hist_dorar_hudaybiyyah_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 16. INCIDENTAL: History Event Mentioned in Different Fiqh Context
    {
      id: 'hp_16_makkah_history_incidental',
      name: 'فخ تشابه تاريخي: فتح مكة مقابل تاريخ صلح الحديبية',
      question: 'متى عقد صلح الحديبية وما أهم بنوده التاريخية؟',
      task: 'HISTORICAL_CLAIM',
      claim: {
        claimId: 'c_16',
        statement: 'صلح الحديبية تضمن شروطا استراتيجية وهدنة عشر سنوات',
        requiredEvidenceType: 'HISTORICAL_FACT'
      },
      chunkId: 'rec_hist_dorar_makkah_amnesty_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.INCIDENTAL,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 17. DIRECT: Aqeedah / Tawheed 3 Categories
    {
      id: 'hp_17_tawheed_pillars_direct',
      name: 'أقسام التوحيد الثلاثة في العقيدة',
      question: 'ما هي أقسام التوحيد الثلاثة المشهورة عند أهل السنة؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_17',
        statement: 'التوحيد ينقسم بالاستقراء إلى ثلاثة أقسام: توحيد الربوبية، وتوحيد الألوهية، وتوحيد الأسماء والصفات',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_aqeedah_dorar_tawheed_pillars_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 18. CONTEXTUAL: Terminology Entry for Tawheed
    {
      id: 'hp_18_tawheed_term_contextual',
      name: 'مصطلح التوحيد لغوياً سياقي لتقسيمات التوحيد العقدية',
      question: 'ما هي أقسام التوحيد الثلاثة المشهورة عند أهل السنة؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_18',
        statement: 'التوحيد ثلاثة أقسام الربوبية والألوهية والأسماء والصفات',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_term_jamhara_tawheed_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.CONTEXTUAL,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 19. DIRECT: Aqeedah / Takfeer Controls
    {
      id: 'hp_19_takfeer_controls_direct',
      name: 'ضوابط التكفير والفرق بين النوع والمعين',
      question: 'ما الفرق بين تكفير النوع وتكفير المعين وما هي موانع التكفير؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_19',
        statement: 'أهل السنة يفرقون بين تكفير النوع وتكفير المعين ويشترطون ثبوت الشروط وانتفاء الموانع',
        requiredEvidenceType: 'SCHOLARLY_CONSENSUS'
      },
      chunkId: 'rec_aqeedah_dorar_takfeer_controls_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 20. SUPPORTING: Hadith Warning against Injustice Supporting Takfeer Safeguards
    {
      id: 'hp_20_injustice_hadith_supporting',
      name: 'حديث تحريم الظلم داعم عام لضوابط التكفير',
      question: 'ما هي ضوابط التكفير وموانعه؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_20',
        statement: 'التكفير خطير لا يصار إليه إلا ببينة شرعية قاطعة حذرا من ظلم المسلم',
        requiredEvidenceType: 'HADITH_ISNAD_STATUS'
      },
      chunkId: 'rec_hadith_muslim_2577_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 21. DIRECT: Dawah / Rights of Non-Muslims
    {
      id: 'hp_21_non_muslim_rights_direct',
      name: 'حقوق المعاهدين في الشريعة الإسلامية',
      question: 'ما هي حقوق المعاهدين وغير المسلمين في المجتمع المسلم؟',
      task: 'EXPLORE_TOPIC',
      claim: {
        claimId: 'c_21',
        statement: 'الشريعة الإسلامية قررت عصمة دماء المعاهدين وأموالهم وحرمت الاعتداء عليهم',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_dawah_center_non_muslim_rights_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 22. UNRELATED: Textual Coherence Verse vs Non-Muslim Rights
    {
      id: 'hp_22_coherence_unrelated',
      name: 'آية نفي التناقض غير مرتبطة بحقوق غير المسلمين',
      question: 'ما هي حقوق المعاهدين وغير المسلمين في المجتمع المسلم؟',
      task: 'EXPLORE_TOPIC',
      claim: {
        claimId: 'c_22',
        statement: 'المعاهدون لهم حقوق محترمة في الشريعة',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_quran_4_82_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.UNRELATED,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 23. DIRECT: Terminology / Shirk Definition
    {
      id: 'hp_23_shirk_definition_direct',
      name: 'تعريف مصطلح الشرك لغة واصطلاحا',
      question: 'ما هو تعريف الشرك في لغة العرب والشريعة؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_23',
        statement: 'الشرك لغة المقارنة والنصيب واصطلاحا صرف العبادة لغير الله أو تشبيه المخلوق بالخالق',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      chunkId: 'rec_term_jamhara_shirk_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 24. SUPPORTING: Surah Al-Ikhlas Negating Shirk
    {
      id: 'hp_24_ikhlas_negating_shirk',
      name: 'سورة الإخلاص داعمة لمبحث نفي الشرك',
      question: 'ما هو تعريف الشرك؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_24',
        statement: 'الشرك مناف للتوحيد الخالص الذي قررته سورة الإخلاص',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_112_1_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 25. DIRECT: Hadith Pillars of Islam / Bukhari 8
    {
      id: 'hp_25_hadith_pillars_direct',
      name: 'حديث بني الإسلام على خمس وتخريجه',
      question: 'ما هو نص حديث بني الإسلام على خمس وروايته؟',
      task: 'VERIFY_HADITH',
      claim: {
        claimId: 'c_25',
        statement: 'حديث بني الإسلام على خمس شهادة أن لا إله إلا الله مروي عن عبد الله بن عمر في صحيح البخاري',
        requiredEvidenceType: 'HADITH_ISNAD_STATUS'
      },
      chunkId: 'rec_hadith_bukhari_8_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 26. CONTEXTUAL: Hadith Jibril Explaining the Pillars
    {
      id: 'hp_26_jibril_pillars_contextual',
      name: 'حديث جبريل سياقي لحديث بني الإسلام على خمس',
      question: 'ما هو نص حديث بني الإسلام على خمس وروايته؟',
      task: 'VERIFY_HADITH',
      claim: {
        claimId: 'c_26',
        statement: 'حديث بني الإسلام على خمس مروي في الصحيحين',
        requiredEvidenceType: 'HADITH_ISNAD_STATUS'
      },
      chunkId: 'rec_hadith_bukhari_50_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.CONTEXTUAL,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 27. DIRECT: Fiqh / Fatwa Rules & Boundaries
    {
      id: 'hp_27_fatwa_rules_direct',
      name: 'ضوابط الفتوى والتفريق عن الحكم العام',
      question: 'ما هي ضوابط الفتوى والفرق بين الحكم العام والفتوى الخاصة؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_27',
        statement: 'الفتوى تنزيل للحكم العام على واقعة شخصية معينة بمراعاة حال المستفتي ولا يتولاها العامي',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_fiqh_dorar_fatwa_rules_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 28. SUPPORTING: Fiqh Reasons of Ikhtilaf
    {
      id: 'hp_28_ikhtilaf_supporting',
      name: 'أسباب اختلاف الفقهاء داعم لأصول الفتوى',
      question: 'ما هي ضوابط الفتوى والفرق بين الحكم العام والفتوى الخاصة؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_28',
        statement: 'الاجتهاد الفقهي يراعي اختلاف الأدلة وأفهام العلماء في تنزيل الأحكام',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_fiqh_dorar_ikhtilaf_reasons_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 29. CONTRADICTION / DIRECT: Universal Compulsion Claim vs Quran 2:256
    {
      id: 'hp_29_compulsion_contradiction',
      name: 'تناقض صريح: زعم إجبار الناس على الدين مقابل نفي الإكراه',
      question: 'هل يفرض الإسلام الإكراه على غير المسلمين في اعتناق الدين؟',
      task: 'REFUTE_DOUBT',
      claim: {
        claimId: 'c_29',
        statement: 'الإسلام يأمر بإكراه جميع الناس وإجبارهم على الدخول في الدين كرها',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_2_256_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },
    // 30. UNRELATED: Cryptocurrency Mining vs Fiqh Ikhtilaf Chunk
    {
      id: 'hp_30_crypto_unrelated',
      name: 'غير مرتبط قطعا: تعدين العملات المشفرة مقابل اختلاف الفقهاء',
      question: 'كيف تعمل خوارزميات تعدين العملات المشفرة في سلاسل الكتل؟',
      task: 'GENERAL',
      claim: {
        claimId: 'c_30',
        statement: 'خوارزميات التعدين تعتمد على التشفير غير المتناظر وحل المعادلات الرياضية المعقدة',
        requiredEvidenceType: 'TEXTUAL_EVIDENCE'
      },
      chunkId: 'rec_fiqh_dorar_ikhtilaf_reasons_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.UNRELATED,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 31. UNRELATED: Pediatric Medicine Dosage vs Hadith Niyyah Chunk
    {
      id: 'hp_31_pediatric_medicine_unrelated',
      name: 'غير مرتبط قطعا: جرعة الباراسيتامول للأطفال مقابل حديث النيات',
      question: 'ما هي الجرعة المناسبة لدواء الباراسيتامول للأطفال حسب الوزن؟',
      task: 'GENERAL',
      claim: {
        claimId: 'c_31',
        statement: 'جرعة الباراسيتامول تحسب بـ 15 ملغ لكل كغ من وزن الطفل كل 6 ساعات',
        requiredEvidenceType: 'TEXTUAL_EVIDENCE'
      },
      chunkId: 'rec_hadith_bukhari_1_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.UNRELATED,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 32. INCIDENTAL: Personal Divorce Oath vs General Chastity Definition
    {
      id: 'hp_32_divorce_oath_incidental',
      name: 'فخ سياقي: فتوى طلاق شخصية مقابل تعريف العفة العام',
      question: 'زوجي حلف علي بالطلاق وأنا غاضبة هل يقع طلاقي؟',
      task: 'PERSONAL_FATWA',
      claim: {
        claimId: 'c_32',
        statement: 'حلف الزوج بالطلاق يوقع الفرقة فورا في واقعتي الشخصية دون حاجة لمفتي',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_term_jamhara_iffah_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.INCIDENTAL,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    }
  ];

  it('should run full holdout benchmark on 32 Claim x Evidence pairs and evaluate metrics', async () => {
    let totalPairs = HOLDOUT_PAIRS.length;
    let correctRelations = 0;
    let directTruePositives = 0;
    let directFalsePositives = 0;
    let directFalseNegatives = 0;
    let supportingTruePositives = 0;
    let contradictionCorrect = 0;
    let totalContradictions = 0;
    let answersExactCorrect = 0;
    let supportsClaimCorrect = 0;
    let preservesIntentCorrect = 0;
    let schemaValidCount = 0;
    let apiFailures = 0;

    const latencies = [];
    const failures = [];
    const detailedResults = [];

    // Confusion matrix counters
    const matrix = {
      DIRECT: { DIRECT: 0, SUPPORTING: 0, CONTEXTUAL: 0, INCIDENTAL: 0, UNRELATED: 0 },
      SUPPORTING: { DIRECT: 0, SUPPORTING: 0, CONTEXTUAL: 0, INCIDENTAL: 0, UNRELATED: 0 },
      CONTEXTUAL: { DIRECT: 0, SUPPORTING: 0, CONTEXTUAL: 0, INCIDENTAL: 0, UNRELATED: 0 },
      INCIDENTAL: { DIRECT: 0, SUPPORTING: 0, CONTEXTUAL: 0, INCIDENTAL: 0, UNRELATED: 0 },
      UNRELATED: { DIRECT: 0, SUPPORTING: 0, CONTEXTUAL: 0, INCIDENTAL: 0, UNRELATED: 0 }
    };

    for (const pair of HOLDOUT_PAIRS) {
      const chunk = pair.syntheticChunk || repo.getChunk(pair.chunkId);
      assert.ok(chunk, `Chunk ${pair.chunkId} must exist`);

      const interpretation = {
        originalQuestion: pair.question,
        task: pair.task,
        userGoal: pair.question,
        claimsToResolve: [pair.claim],
        isPersonalFatwa: pair.task === 'PERSONAL_FATWA'
      };

      const retrievalResult = {
        queryId: `qret_${pair.id}`,
        claims: [
          {
            claimId: pair.claim.claimId,
            candidates: [chunk]
          }
        ]
      };

      const startTime = performance.now();
      const result = await service.verifyEvidence({
        interpretation,
        retrievalResult
      });
      const elapsed = performance.now() - startTime;
      latencies.push(elapsed);

      const ev = result.claims[0]?.evidence[0];
      assert.ok(ev, `Evidence verdict must exist for pair ${pair.id}`);

      if (ev.verificationStatus === VERIFICATION_STATUS.VERIFIED) {
        schemaValidCount++;
      } else {
        apiFailures++;
      }

      // Record Confusion Matrix
      const actualRel = ev.relation;
      const expectedRel = pair.expectedRelation;
      if (matrix[expectedRel] && matrix[expectedRel][actualRel] !== undefined) {
        matrix[expectedRel][actualRel]++;
      }

      // Exact relation match
      const relationMatch = actualRel === expectedRel;
      if (relationMatch) {
        correctRelations++;
      }

      // Direct precision / recall counters
      if (expectedRel === EVIDENCE_RELATIONS.DIRECT && actualRel === EVIDENCE_RELATIONS.DIRECT) {
        directTruePositives++;
      }
      if (expectedRel !== EVIDENCE_RELATIONS.DIRECT && actualRel === EVIDENCE_RELATIONS.DIRECT) {
        directFalsePositives++;
      }
      if (expectedRel === EVIDENCE_RELATIONS.DIRECT && actualRel !== EVIDENCE_RELATIONS.DIRECT) {
        directFalseNegatives++;
      }

      // Supporting counters
      if (expectedRel === EVIDENCE_RELATIONS.SUPPORTING && actualRel === EVIDENCE_RELATIONS.SUPPORTING) {
        supportingTruePositives++;
      }

      // Contradiction counters
      if (pair.expectedContradicts) {
        totalContradictions++;
        if (ev.contradictsClaim === true) {
          contradictionCorrect++;
        }
      }

      // Boolean metrics
      if (ev.answersExactClaim === pair.expectedAnswersExact) answersExactCorrect++;
      if (ev.supportsClaim === pair.expectedSupports) supportsClaimCorrect++;
      const expectedIntent = pair.expectedAnswersExact; // Intent typically tracks exact answerability
      if (ev.preservesQuestionIntent === expectedIntent) preservesIntentCorrect++;

      const isPass = relationMatch && (ev.contradictsClaim === pair.expectedContradicts);
      if (!isPass) {
        failures.push({
          pair,
          actualVerdict: ev,
          reason: `Relation mismatch: expected ${expectedRel}, got ${actualRel} (contradictsClaim: ${ev.contradictsClaim})`
        });
      }

      detailedResults.push({
        id: pair.id,
        name: pair.name,
        expected: expectedRel,
        actual: actualRel,
        answersExact: ev.answersExactClaim,
        supports: ev.supportsClaim,
        contradicts: ev.contradictsClaim,
        confidence: ev.confidence,
        status: isPass ? 'PASS' : 'FAIL',
        latency: elapsed
      });
    }

    // Compute Metrics
    const relationAccuracy = correctRelations / totalPairs;
    const directPrecision = (directTruePositives + directFalsePositives) > 0
      ? directTruePositives / (directTruePositives + directFalsePositives)
      : 1.0;
    const directRecall = (directTruePositives + directFalseNegatives) > 0
      ? directTruePositives / (directTruePositives + directFalseNegatives)
      : 1.0;
    const contradictionAcc = totalContradictions > 0 ? contradictionCorrect / totalContradictions : 1.0;
    const answersExactAcc = answersExactCorrect / totalPairs;
    const supportsClaimAcc = supportsClaimCorrect / totalPairs;
    const preservesIntentAcc = preservesIntentCorrect / totalPairs;

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const meanLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    // Display Holdout Results
    console.log('\n======================================================');
    console.log('    MISHKAT PHASE 5 FRESH HOLDOUT EVALUATION RESULTS  ');
    console.log('                 (FRESH HOLDOUT FIRST RUN)            ');
    console.log('======================================================');
    console.log(`Total Claim x Evidence Pairs:     ${totalPairs}`);
    console.log(`Overall Relation Accuracy:        ${(relationAccuracy * 100).toFixed(2)}% (${correctRelations}/${totalPairs})`);
    console.log(`DIRECT Precision:                 ${(directPrecision * 100).toFixed(2)}% (${directTruePositives}/${directTruePositives + directFalsePositives})`);
    console.log(`DIRECT Recall:                    ${(directRecall * 100).toFixed(2)}% (${directTruePositives}/${directTruePositives + directFalseNegatives})`);
    console.log(`False DIRECT Count:               ${directFalsePositives}`);
    console.log(`Contradiction Accuracy:           ${(contradictionAcc * 100).toFixed(2)}% (${contradictionCorrect}/${totalContradictions})`);
    console.log(`answersExactClaim Accuracy:       ${(answersExactAcc * 100).toFixed(2)}% (${answersExactCorrect}/${totalPairs})`);
    console.log(`supportsClaim Accuracy:           ${(supportsClaimAcc * 100).toFixed(2)}% (${supportsClaimCorrect}/${totalPairs})`);
    console.log(`preservesIntent Accuracy:         ${(preservesIntentAcc * 100).toFixed(2)}% (${preservesIntentCorrect}/${totalPairs})`);
    console.log(`Schema Validity Rate:             ${((schemaValidCount / totalPairs) * 100).toFixed(2)}%`);
    console.log(`API Failures:                     ${apiFailures}`);
    console.log(`Latency p50:                      ${p50.toFixed(2)} ms`);
    console.log(`Latency p95:                      ${p95.toFixed(2)} ms`);
    console.log(`Mean Latency:                     ${meanLatency.toFixed(2)} ms`);
    console.log('======================================================');

    console.log('\n--- CONFUSION MATRIX (Rows: Expected, Columns: Actual) ---');
    console.log('Expected \\ Actual  DIRECT  SUPPORTING  CONTEXTUAL  INCIDENTAL  UNRELATED');
    for (const [expRel, row] of Object.entries(matrix)) {
      console.log(`${expRel.padEnd(17)} ${String(row.DIRECT).padEnd(7)} ${String(row.SUPPORTING).padEnd(11)} ${String(row.CONTEXTUAL).padEnd(11)} ${String(row.INCIDENTAL).padEnd(11)} ${row.UNRELATED}`);
    }

    console.log('\n--- DETAILED PAIR SUMMARY ---');
    for (const d of detailedResults) {
      console.log(`[${d.status}] ${d.id} | Exp: ${d.expected.padEnd(10)} | Act: ${d.actual.padEnd(10)} | Ans:${d.answersExact ? 'T' : 'F'} Sup:${d.supports ? 'T' : 'F'} Contra:${d.contradicts ? 'T' : 'F'} | Latency: ${d.latency.toFixed(1)}ms`);
    }

    if (failures.length > 0) {
      console.log('\n--- FAILURE BREAKDOWN ---');
      for (const f of failures) {
        console.log(`\nFailure on [${f.pair.id}] ${f.pair.name}:`);
        console.log(`Question: ${f.pair.question}`);
        console.log(`Claim: ${f.pair.claim.statement}`);
        console.log(`Expected: ${f.pair.expectedRelation} (contra: ${f.pair.expectedContradicts})`);
        console.log(`Actual: ${f.actualVerdict.relation} (contra: ${f.actualVerdict.contradictsClaim})`);
        console.log(`Reason: ${f.actualVerdict.reason}`);
      }
    } else {
      console.log('\n>>> ZERO FAILURES! All 32 fresh holdout pairs classified with 100% precision.');
    }
    console.log('======================================================\n');

    // Strict safety assertions (Priority: False DIRECT must be 0)
    assert.equal(directFalsePositives, 0, 'SAFETY CRITICAL: False DIRECT acceptance count must be 0');
    assert.ok(relationAccuracy >= 0.85, `Overall Relation Accuracy must be >= 85% (got ${(relationAccuracy * 100).toFixed(1)}%)`);
    assert.ok(directRecall >= 0.85, `DIRECT Recall must be >= 85% (got ${(directRecall * 100).toFixed(1)}%)`);
    assert.equal(contradictionAcc, 1.0, 'Contradiction accuracy must be 100%');
  });
});
