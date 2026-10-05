/**
 * Mishkat Phase 5A: Final Fresh Holdout Benchmark
 * 
 * STRICT PROTOCOL (Section 22):
 * - 40 NEW unseen Claim x Evidence pairs
 * - No copies from previous holdout (tests/evidenceVerificationHoldout.test.js)
 * - No copies from few-shot prompt examples
 * - No expected labels in model input
 * - Balanced difficult relations: DIRECT, SUPPORTING, CONTEXTUAL, INCIDENTAL, UNRELATED
 * - At least 10 cases designed as potential False DIRECT traps
 * - Includes explicit contradictions
 * - Uses real production KnowledgeChunks from data/knowledge/chunks/knowledge_chunks.json
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

describe('Mishkat Phase 5A: Final Semantic Evidence Verification Fresh Holdout (First Run)', () => {
  let service;
  let repo;

  before(async () => {
    repo = defaultTrustedSourceRepository;
    if (repo.chunkCount === 0) {
      repo.loadFromDisk('data/knowledge');
    }
    service = new EvidenceVerificationService();
  });

  // 40 Curated Fresh Holdout Claim x Evidence Pairs
  const FINAL_HOLDOUT_PAIRS = [
    // 01. DIRECT: Quran 4:82 Verification
    {
      id: 'fhp_01_quran_4_82_direct',
      name: 'آية نفي التناقض عن القرآن (النساء 82)',
      question: 'أبحث عن آية تدعو لتدبر القرآن وتنفي وجود أي تناقض فيه',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_f01',
        statement: 'قوله تعالى: ولو كان من عند غير الله لوجدوا فيه اختلافا كثيرا آية قرآنية في سورة النساء تدل على إعجاز القرآن ونفي التناقض',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_4_82_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 02. SUPPORTING: False DIRECT Trap - Universal Principle vs Specific Orientalist Rebuttal
    {
      id: 'fhp_02_quran_4_82_trap',
      name: 'فخ دلالي: آية عامة مقابل تفنيد تفصيلي لشبهات المستشرقين',
      question: 'هل زعم المستشرقين بوجود تناقض واختلاف بين آيات القرآن صحيح؟',
      task: 'RESOLVE_MISCONCEPTION',
      claim: {
        claimId: 'c_f02',
        statement: 'القرآن الكريم بريء من التناقض وقد أثبت علماء التفسير التوافق التام ودحضوا شبهات المستشرقين في كل موضع',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_quran_4_82_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 03. DIRECT: Misconception Rebuttal on Quran Origin
    {
      id: 'fhp_03_quran_origin_direct',
      name: 'دحض شبهة تأليف النبي للقرآن من بينات',
      question: 'كيف نرد على من يقول إن النبي محمداً ألف القرآن أو اقتبسه من الرهبان؟',
      task: 'RESOLVE_MISCONCEPTION',
      claim: {
        claimId: 'c_f03',
        statement: 'زعم تأليف النبي للقرآن باطل لأميته وتحدي القرآن لأفصح العرب ولتباين أسلوب القرآن التام عن الحديث النبوي',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_misc_bayyinat_quran_origin_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 04. INCIDENTAL: Lexical Trap - Hadith mentioning Quran in different context
    {
      id: 'fhp_04_jibril_hadith_lexical_trap',
      name: 'فخ تشابه لفظي: ذكر القرآن في حديث جبريل',
      question: 'كيف نرد على من يقول إن النبي محمداً ألف القرآن أو اقتبسه من الرهبان؟',
      task: 'RESOLVE_MISCONCEPTION',
      claim: {
        claimId: 'c_f04',
        statement: 'زعم تأليف النبي للقرآن باطل لأميته وتحدي القرآن لأفصح العرب',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_hadith_bukhari_50_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.INCIDENTAL,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 05. DIRECT: Definition of Barakah
    {
      id: 'fhp_05_barakah_definition_direct',
      name: 'تعريف مصطلح البركة لغة واصطلاحاً من الجمهرة',
      question: 'ما هو مفهوم البركة اصطلاحاً ولغة في ديننا؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_f05',
        statement: 'البركة لغة النماء والزيادة وثبوت الخير، واصطلاحا فيض الخير الإلهي في الشيء وثبوته فيه',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      chunkId: 'rec_term_jamhara_barakah_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 06. INCIDENTAL: Lexical Trap - Historical chunk mentioning blessing casually
    {
      id: 'fhp_06_barakah_lexical_trap',
      name: 'فخ تشابه لفظي: ذكر البركة عرضاً في فتح مكة',
      question: 'ما هو مفهوم البركة اصطلاحاً ولغة في ديننا؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_f06',
        statement: 'البركة لغة النماء والزيادة وثبوت الخير',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      chunkId: 'rec_hist_dorar_makkah_amnesty_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.INCIDENTAL,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 07. DIRECT: Definition of Iffah
    {
      id: 'fhp_07_iffah_definition_direct',
      name: 'تعريف مصطلح العفة من الجمهرة',
      question: 'وش معنى العفة عند علماء الأخلاق والشريعة؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_f07',
        statement: 'العفة ضبط النفس ونزاهتها عن المحرمات والشهوات الدنيئة وهي خُلق إسلامي أصيل',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      chunkId: 'rec_term_jamhara_iffah_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 08. CONTEXTUAL: Definition of Iffah applied to marriage difficulty
    {
      id: 'fhp_08_iffah_contextual',
      name: 'سياق خلق العفة عند تعذر النكاح',
      question: 'كيف يتصرف الشاب إذا عجز عن تكاليف الزواج الشرعي؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_f08',
        statement: 'يستحب لمن عجز عن الزواج الاستعفاف بالصوم وضبط النفس',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_term_jamhara_iffah_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.CONTEXTUAL,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 09. DIRECT: Hadith of Injustice in Sahih Muslim
    {
      id: 'fhp_09_injustice_hadith_direct',
      name: 'الحديث القدسي في تحريم الظلم من صحيح مسلم',
      question: 'أبي نص الحديث القدسي اللي يقول فيه ربنا: يا عبادي إني حرمت الظلم على نفسي',
      task: 'VERIFY_HADITH',
      claim: {
        claimId: 'c_f09',
        statement: 'حديث: يا عبادي إني حرمت الظلم على نفسي وجعلته بينكم محرما حديث قدسي صحيح مروي في صحيح مسلم عن أبي ذر',
        requiredEvidenceType: 'HADITH_ISNAD_STATUS'
      },
      chunkId: 'rec_hadith_muslim_2577_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 10. SUPPORTING: False DIRECT Trap - Broad Injustice Hadith vs Specific Judicial Detention Ruling
    {
      id: 'fhp_10_injustice_trap',
      name: 'فخ دلالي: حديث تحريم الظلم مقابل حكم الحبس التعسفي في القضاء',
      question: 'هل يجوز للقاضي الحبس التعسفي للمتهم دون بينة؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_f10',
        statement: 'يحرم الحبس التعسفي شرعاً لأن الظلم محرم بنص الشريعة والحديث القدسي',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_hadith_muslim_2577_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 11. DIRECT: Quran 49:13 Verification
    {
      id: 'fhp_11_quran_49_13_direct',
      name: 'آية وحدة الأصل البشري والتفاضل بالتقوى (الحجرات 13)',
      question: 'ما الآية التي تدل على تكافؤ البشر وأن أكرمهم عند الله أتقاهم؟',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_f11',
        statement: 'إن أكرمكم عند الله أتقاكم آية من سورة الحجرات تبين معيار التفاضل الرباني بين الناس',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_49_13_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 12. SUPPORTING: False DIRECT Trap - Quran 49:13 vs Compound Non-Discrimination Legal Doctrine
    {
      id: 'fhp_12_quran_49_13_trap',
      name: 'فخ دلالي: آية الحجرات مقابل منظومة نفي العنصرية المركبة',
      question: 'هل يقبل الإسلام العنصرية والتمييز العرقي بين القبائل والشعوب؟',
      task: 'RESOLVE_MISCONCEPTION',
      claim: {
        claimId: 'c_f12',
        statement: 'الإسلام حرم التمييز العنصري واعتبر الناس سواسية كأسنَان المشط ولا فضل لعربي على أعجمي إلا بالتقوى',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_quran_49_13_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 13. CONTRADICTION / DIRECT: Direct Rebuttal of Racism Allegation
    {
      id: 'fhp_13_racism_contradiction',
      name: 'تناقض صريح: زعم تفوق جنس بشري على آخر في أصل الخلقة',
      question: 'هل دين الإسلام يشجع العصبية القبلية وتفوق جنس بشري على آخر؟',
      task: 'RESOLVE_MISCONCEPTION',
      claim: {
        claimId: 'c_f13',
        statement: 'دين الإسلام يعتبر أن بعض الأجناس البشرية أرقى خلقياً بطبيعتها من أجناس أخرى بغض النظر عن التقوى',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_quran_49_13_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },
    // 14. DIRECT: Quran 112:2 Verification
    {
      id: 'fhp_14_quran_112_2_direct',
      name: 'الآية الثانية من سورة الإخلاص',
      question: 'ما هي الآية الثانية من سورة الإخلاص؟',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_f14',
        statement: 'اللَّهُ الصَّمَدُ هي الآية الثانية من سورة الإخلاص',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_112_2_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 15. DIRECT: Quran 112:3 Verification
    {
      id: 'fhp_15_quran_112_3_direct',
      name: 'الآية الثالثة من سورة الإخلاص',
      question: 'ما نص الآية الكريمة: لم يلد ولم يولد في المصحف؟',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_f15',
        statement: 'لَمْ يَلِدْ وَلَمْ يُولَدْ هي الآية الثالثة من سورة الإخلاص',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_112_3_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 16. DIRECT: Quran 112:4 Verification
    {
      id: 'fhp_16_quran_112_4_direct',
      name: 'الآية الرابعة من سورة الإخلاص',
      question: 'ما هي خاتمة سورة الإخلاص؟',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_f16',
        statement: 'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ هي الآية الرابعة والختامية لسورة الإخلاص',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_quran_112_4_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 17. SUPPORTING: False DIRECT Trap - Tafsir for Canonical Quran Verse
    {
      id: 'fhp_17_tafsir_for_quran_trap',
      name: 'فخ دلالي: نص التفسير مقابل نص الآيات الأربع من المصحف',
      question: 'ما نص الآيات الأربع لسورة الإخلاص في المصحف الشريف؟',
      task: 'VERIFY_QURAN',
      claim: {
        claimId: 'c_f17',
        statement: 'سورة الإخلاص تتكون من أربع آيات محكمات تبدأ بقل هو الله أحد وتختم بكفوا أحد',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
      },
      chunkId: 'rec_tafsir_dorar_ikhlas_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 18. DIRECT: Meaning of Al-Samad from Tafsir
    {
      id: 'fhp_18_samad_tafsir_direct',
      name: 'معنى الصمد من تفسير الدرر السنية لسورة الإخلاص',
      question: 'ما معنى اسم الله الصمد في تفسير سورة الإخلاص؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_f18',
        statement: 'الصمد في التفسير هو السيد الذي يصمد إليه الخلائق في حوائجهم والذي لا جوف له المستغني عن كل أحد',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_tafsir_dorar_ikhlas_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 19. DIRECT: Historical Event of Makkah Amnesty
    {
      id: 'fhp_19_makkah_amnesty_direct',
      name: 'فتح مكة والعفو العام عن أهلها',
      question: 'متى كان فتح مكة وماذا قال النبي لأهل قريش بعد النصر؟',
      task: 'VERIFY_HISTORICAL',
      claim: {
        claimId: 'c_f19',
        statement: 'وقع فتح مكة في رمضان سنة 8 هجرية وقال النبي لأهلها اذهبوا فأنتم الطلقاء عافيا عنهم',
        requiredEvidenceType: 'HISTORICAL_REPORT'
      },
      chunkId: 'rec_hist_dorar_makkah_amnesty_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 20. SUPPORTING: False DIRECT Trap - Single Incident vs Universal Historical Negative
    {
      id: 'fhp_20_makkah_amnesty_trap',
      name: 'فخ دلالي: عفو فتح مكة مقابل دعوى سلمية كل المعارك النبوية',
      question: 'هل كانت جميع معارك النبي صلى الله عليه وسلم خالية من أي قتال؟',
      task: 'VERIFY_HISTORICAL',
      claim: {
        claimId: 'c_f20',
        statement: 'كل فتوحات وغزوات النبي صلى الله عليه وسلم تمت بالسلم المطلق دون أي إراقة دماء',
        requiredEvidenceType: 'HISTORICAL_REPORT'
      },
      chunkId: 'rec_hist_dorar_makkah_amnesty_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 21. DIRECT: Dawah Dialogue Methodology
    {
      id: 'fhp_21_dawah_methodology_direct',
      name: 'منهجية الحوار والدعوة مع غير المسلمين',
      question: 'وش الأسلوب والمنهج المطلوب في محاورة غير المسلمين ودعوتهم؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_f21',
        statement: 'منهجية الدعوة تقوم على الإقناع العقلي والرفق واللين والتركيز على المشتركات الإنسانية ومحاسن الإسلام',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_dawah_center_methodology_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 22. CONTEXTUAL: Dawah Dialogue applied to Commercial Negotiation
    {
      id: 'fhp_22_dawah_contextual',
      name: 'تطبيق أدب الحوار العام على التفاوض التجاري',
      question: 'كيف أفاوض شريكي الأجنبي غير المسلم في صفقة تجارية؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_f22',
        statement: 'ينبغي التلطف وحسن الخلق في التفاوض مع الشركاء الأجانب تأسيسا على منهج الحوار باللين',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_dawah_center_methodology_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.CONTEXTUAL,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 23. DIRECT: Non-Muslim Rights
    {
      id: 'fhp_23_non_muslim_rights_direct',
      name: 'عصمة دماء وأموال غير المسلمين المعاهدين',
      question: 'هل يحمي الإسلام دماء وأموال غير المسلمين المعاهدين والمقيمين؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_f23',
        statement: 'دماء وأموال المعاهدين والمستأمنين معصومة في الشريعة ولا يجوز الغدر بهم أو الاعتداء عليهم',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_dawah_center_non_muslim_rights_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 24. CONTRADICTION / DIRECT: Direct Rebuttal of Looting Non-Muslim Property
    {
      id: 'fhp_24_loot_contradiction',
      name: 'تناقض صريح: زعم جواز سلب أموال المعاهدين',
      question: 'هل يجوز للمسلم في بلاد الإسلام سلب أموال المعاهدين أو الاستيلاء على ممتلكاتهم دون وجه حق؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_f24',
        statement: 'يجوز للمسلمين الاعتداء على أموال المعاهدين والمستأمنين وسلبها لأنهم ليسوا على دين الإسلام',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_dawah_center_non_muslim_rights_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },
    // 25. DIRECT: Fatwa vs General Ruling Principle
    {
      id: 'fhp_25_fatwa_rules_direct',
      name: 'التفريق بين الحكم الكلي المجرد والفتوى الفردية الخاصة',
      question: 'ما الفرق الأساسي بين الحكم الشرعي المجرد وبين الفتوى المنزلة على واقعة شخصية؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_f25',
        statement: 'الحكم الشرعي تقرير كلي مجرد بينما الفتوى تنزيل للحكم على واقعة شخصية مخصوصة تراعي حال المستفتي ومآلات فعله',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_fiqh_dorar_fatwa_rules_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 26. SUPPORTING: False DIRECT Trap - General Fatwa Rules vs Specific Zihar Case
    {
      id: 'fhp_26_fatwa_rules_trap',
      name: 'فخ دلالي: منهجية الفتوى العامة مقابل كفارة الظهار المحددة',
      question: 'أنا حلفت على زوجتي يمين ظهار وأنا غضبان، وش كفارتي بالتحديد؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_f26',
        statement: 'كفارة الظهار عتق رقبة فإن لم يجد فصيام شهرين متتابعين ووجوب التثبت من نية الحالف عبر المفتي',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_fiqh_dorar_fatwa_rules_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 27. DIRECT: Causes of Juristic Disagreement (Ikhtilaf)
    {
      id: 'fhp_27_ikhtilaf_reasons_direct',
      name: 'أسباب اختلاف الأئمة في المسائل الاجتهادية',
      question: 'ليه الفقهاء والأئمة الأربعة يختلفون في بعض الأحكام الفقهية؟',
      task: 'WHY',
      claim: {
        claimId: 'c_f27',
        statement: 'اختلاف الفقهاء يعود لأسباب معتبرة مثل تفاوت بلوغ الحديث وفهم دلالة النص والتعارض والترجيح بين الأدلة',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_fiqh_dorar_ikhtilaf_reasons_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 28. SUPPORTING: False DIRECT Trap - General Causes of Disagreement vs Specific Recitation Issue
    {
      id: 'fhp_28_ikhtilaf_reasons_trap',
      name: 'فخ دلالي: أسباب الخلاف الكلية مقابل مسألة قراءة الفاتحة للمأموم',
      question: 'هل اتفق الفقهاء على وجوب قراءة الفاتحة للمأموم في الصلاة الجهرية؟',
      task: 'VERIFY_CONSENSUS',
      claim: {
        claimId: 'c_f28',
        statement: 'مسألة قراءة المأموم للفاتحة محل خلاف معتبر بين الفقهاء لاختلافهم في فهم الأدلة وتعارضها',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_fiqh_dorar_ikhtilaf_reasons_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 29. DIRECT: Takfeer Controls and Impediments
    {
      id: 'fhp_29_takfeer_controls_direct',
      name: 'موانع تكفير المعين وضوابطه عند أهل السنة',
      question: 'ما هي موانع تكفير المعين عند أهل السنة والجماعة؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_f29',
        statement: 'موانع تكفير المعين تشمل الجهل والتأويل والإكراه والخطأ ولا يكفر المسلم إلا بعد استيفاء الشروط وانتفاء الموانع',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_aqeedah_dorar_takfeer_controls_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 30. CONTRADICTION / DIRECT: Direct Rebuttal of Hasty Takfeer
    {
      id: 'fhp_30_hasty_takfeer_contradiction',
      name: 'تناقض صريح: زعم تكفير كل مرتكب كبيرة فوراً دون فحص موانع',
      question: 'هل يحق لأي شخص تكفير المسلمين بمجرد ارتكاب الكبائر دون استيفاء شروط أو مراعاة موانع؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_f30',
        statement: 'يكفر كل مسلم يرتكب معصية كبيرة فوراً دون حاجة لإقامة حجة أو فحص لموانع الجهل والتأويل',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_aqeedah_dorar_takfeer_controls_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: false,
      expectedContradicts: true
    },
    // 31. SUPPORTING: False DIRECT Trap - Orthodox Sunni Takfeer Controls vs Kharijite History
    {
      id: 'fhp_31_kharijite_history_trap',
      name: 'فخ دلالي: ضوابط التكفير المنهجية مقابل التاريخ التفصيلي لفرقة الخوارج',
      question: 'من هم الخوارج في التاريخ وما هو معتقدهم في مرتكب الكبيرة؟',
      task: 'VERIFY_HISTORICAL',
      claim: {
        claimId: 'c_f31',
        statement: 'الخوارج فرقة تاريخية كفرت مرتكبي الكبائر واستحلت دماء المسلمين مخالفة ضوابط أهل السنة',
        requiredEvidenceType: 'HISTORICAL_REPORT'
      },
      chunkId: 'rec_aqeedah_dorar_takfeer_controls_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 32. SUPPORTING: False DIRECT Trap - Tawheed Pillars vs Ibn Taymiyyah's Comprehensive Ibadah Definition
    {
      id: 'fhp_32_ibadah_definition_trap',
      name: 'فخ دلالي: أقسام التوحيد مقابل الحد الاصطلاحي التام للعبادة',
      question: 'ما هو التعريف الدقيق للعبادة في الشريعة وأركانها؟',
      task: 'DEFINE_TERM',
      claim: {
        claimId: 'c_f32',
        statement: 'العبادة اسم جامع لكل ما يحبه الله ويرضاه من الأقوال والأعمال الباطنة والظاهرة',
        requiredEvidenceType: 'LEXICAL_DEFINITION'
      },
      chunkId: 'rec_aqeedah_dorar_tawheed_pillars_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 33. SUPPORTING: False DIRECT Trap - Kaaba Worship Rebuttal vs Full Architectural History of Kaaba
    {
      id: 'fhp_33_kaaba_history_trap',
      name: 'فخ دلالي: تفنيد عبادة الكعبة مقابل تاريخ بنائها المعماري عبر العصور',
      question: 'من الذي بنى الكعبة أول مرة وكم مرة أعيد بناؤها في التاريخ؟',
      task: 'VERIFY_HISTORICAL',
      claim: {
        claimId: 'c_f33',
        statement: 'بنى إبراهيم وإسماعيل عليهما السلام البيت الحرام، وأعيد بناؤه في عهد قريش وعبد الله بن الزبير',
        requiredEvidenceType: 'HISTORICAL_REPORT'
      },
      chunkId: 'rec_misc_bayyinat_kaaba_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 34. SUPPORTING: False DIRECT Trap - Sword Rebuttal vs Text of Omariyya Covenant
    {
      id: 'fhp_34_sword_omariyya_trap',
      name: 'فخ دلالي: نفي انتشار الإسلام بالسيف مقابل نص بنود العهدة العمرية',
      question: 'ما هي شروط العهدة العمرية التي كتبها عمر بن الخطاب لأهل القدس؟',
      task: 'VERIFY_HISTORICAL',
      claim: {
        claimId: 'c_f34',
        statement: 'العهدة العمرية منحت أهل إيلياء الأمان على كنائسهم وأنفسهم وأموالهم وأكدت حرية الاعتقاد',
        requiredEvidenceType: 'HISTORICAL_REPORT'
      },
      chunkId: 'rec_misc_bayyinat_sword_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.SUPPORTING,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 35. DIRECT: Jibril Hadith Verification
    {
      id: 'fhp_35_jibril_hadith_direct',
      name: 'حديث جبريل في مراتب الدين في صحيح البخاري',
      question: 'ما هو الحديث الذي يذكر مراتب الدين: الإسلام والإيمان والإحسان وعلامات الساعة؟',
      task: 'VERIFY_HADITH',
      claim: {
        claimId: 'c_f35',
        statement: 'حديث جبريل عليه السلام يوضح مراتب الدين الثلاث: الإسلام والإيمان والإحسان',
        requiredEvidenceType: 'HADITH_ISNAD_STATUS'
      },
      chunkId: 'rec_hadith_bukhari_50_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.DIRECT,
      expectedAnswersExact: true,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 36. CONTEXTUAL: Jibril Hadith applied to Sufi Metaphysical Terms
    {
      id: 'fhp_36_jibril_sufism_contextual',
      name: 'سياق مرتبة الإحسان مقابل اصطلاحات الفناء الصوفي',
      question: 'كيف نصل إلى مرتبة الفناء والمكاشفة الروحية في التصوف الفلسفي؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_f36',
        statement: 'الإحسان في الشريعة هو أن تعبد الله كأنك تراه فإن لم تكن تراه فإنه يراك دون مصطلحات الفناء الفلسفية',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_hadith_bukhari_50_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.CONTEXTUAL,
      expectedAnswersExact: false,
      expectedSupports: true,
      expectedContradicts: false
    },
    // 37. UNRELATED: Aerospace Engineering
    {
      id: 'fhp_37_aerospace_unrelated',
      name: 'سؤال هندسة طيران وفضاء خارج الشريعة بالكامل',
      question: 'كيف يتم حساب قوة الدفع الصاروخي في المحركات النفاثة متعددة المراحل؟',
      task: 'GENERAL',
      claim: {
        claimId: 'c_f37',
        statement: 'حساب قوة الدفع يعتمد على قانون نيوتن الثالث ومعدل تدفق كتلة الغازات المحترقة',
        requiredEvidenceType: 'SCIENTIFIC_EVIDENCE'
      },
      chunkId: 'rec_quran_16_125_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.UNRELATED,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 38. UNRELATED: Stock Day Trading
    {
      id: 'fhp_38_stock_trading_unrelated',
      name: 'سؤال تداول في سوق الأسهم الأمريكية ناسداك',
      question: 'ما هي أفضل استراتيجيات التداول اليومي في سوق الأسهم الأمريكية ناسداك؟',
      task: 'GENERAL',
      claim: {
        claimId: 'c_f38',
        statement: 'التحليل الفني للشموع اليابانية يساعد في تحديد نقاط الدخول والخروج في الأسهم',
        requiredEvidenceType: 'FINANCIAL_REPORT'
      },
      chunkId: 'rec_hadith_dorar_watani_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.UNRELATED,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 39. INCIDENTAL: Lexical Overlap on Money / Wealth
    {
      id: 'fhp_39_zakat_gold_incidental',
      name: 'فخ تشابه لفظي: آية الربا مقابل نصاب زكاة الذهب المعاصر',
      question: 'ما هو نصاب الذهب والفضة في زكاة المال بالجرامات المعاصرة؟',
      task: 'EXPLAIN_CONCEPT',
      claim: {
        claimId: 'c_f39',
        statement: 'نصاب الذهب 85 جراماً من عيار 24 ونصاب الفضة 595 جراماً',
        requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
      },
      chunkId: 'rec_quran_2_275_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.INCIDENTAL,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    },
    // 40. UNRELATED: Computer Graphics Ray Tracing
    {
      id: 'fhp_40_ray_tracing_unrelated',
      name: 'سؤال خوارزميات بطاقات الرسوميات ثلاثية الأبعاد',
      question: 'كيف تعمل خوارزمية تتبع الأشعة Ray Tracing في بطاقات الرسوميات الحديثة؟',
      task: 'GENERAL',
      claim: {
        claimId: 'c_f40',
        statement: 'تتبع الأشعة يحاكي المسار الفيزيائي للضوء وانعكاساته على الأسطح الثلاثية الأبعاد',
        requiredEvidenceType: 'TECHNICAL_SPEC'
      },
      chunkId: 'rec_term_jamhara_shirk_chk_0',
      expectedRelation: EVIDENCE_RELATIONS.UNRELATED,
      expectedAnswersExact: false,
      expectedSupports: false,
      expectedContradicts: false
    }
  ];

  it('Evaluates all 40 fresh holdout pairs on REAL Gemini AI without prior exposure', async () => {
    const totalPairs = FINAL_HOLDOUT_PAIRS.length;
    let correctRelations = 0;
    let directTruePositives = 0;
    let directFalsePositives = 0;
    let directFalseNegatives = 0;
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

    // Confusion Matrix: [Expected][Actual]
    const relationsList = [
      EVIDENCE_RELATIONS.DIRECT,
      EVIDENCE_RELATIONS.SUPPORTING,
      EVIDENCE_RELATIONS.CONTEXTUAL,
      EVIDENCE_RELATIONS.INCIDENTAL,
      EVIDENCE_RELATIONS.UNRELATED
    ];

    const matrix = {};
    for (const r1 of relationsList) {
      matrix[r1] = {};
      for (const r2 of relationsList) {
        matrix[r1][r2] = 0;
      }
    }

    console.log(`\nStarting Phase 5A Evaluation on ${totalPairs} Fresh Holdout Pairs...\n`);

    for (let i = 0; i < totalPairs; i++) {
      const pair = FINAL_HOLDOUT_PAIRS[i];
      const chunk = repo.getChunk(pair.chunkId);
      assert.ok(chunk, `KnowledgeChunk "${pair.chunkId}" must exist in production repository`);

      const interpretation = {
        originalQuestion: pair.question,
        task: pair.task,
        userGoal: `إجابة السؤال والتحقق من الادعاء: ${pair.name}`,
        claimsToResolve: [pair.claim]
      };

      const retrievalResult = {
        queryId: `qret_fholdout_${pair.id}`,
        claims: [
          {
            claimId: pair.claim.claimId,
            candidates: [chunk]
          }
        ]
      };

      const startTime = Date.now();
      let result;
      try {
        result = await service.verifyEvidence({
          interpretation,
          retrievalResult,
          options: { mode: 'ai', allowFallback: false }
        });
      } catch (err) {
        apiFailures++;
        console.error(`API Exception on pair [${pair.id}]:`, err.message);
        continue;
      }

      const latencyMs = Date.now() - startTime;
      latencies.push(latencyMs);

      const claimResult = result.claims?.[0];
      const ev = claimResult?.evidence?.[0];

      if (!ev) {
        apiFailures++;
        failures.push({ pair, error: 'No evidence returned' });
        continue;
      }

      // Enforce zero fallback
      assert.equal(ev.verificationMode, 'AI_VERIFICATION', `Pair ${pair.id} must be evaluated by REAL AI, not fallback!`);

      if (ev.verificationStatus === VERIFICATION_STATUS.VERIFIED) {
        schemaValidCount++;
      }

      // Pacing to avoid API rate limits
      if (i < totalPairs - 1) {
        await new Promise(r => setTimeout(r, 1200));
      }

      // Track Contradictions
      if (pair.expectedContradicts) {
        totalContradictions++;
        if (ev.contradictsClaim === true && ev.supportsClaim === false) {
          contradictionCorrect++;
        }
      }

      // Track Stage A metrics
      if (ev.answersExactClaim === pair.expectedAnswersExact) answersExactCorrect++;
      if (ev.supportsClaim === pair.expectedSupports) supportsClaimCorrect++;
      if (ev.preservesQuestionIntent === (pair.expectedRelation !== EVIDENCE_RELATIONS.UNRELATED && pair.expectedRelation !== EVIDENCE_RELATIONS.INCIDENTAL)) {
        preservesIntentCorrect++;
      }

      // Track Confusion Matrix
      const expRel = pair.expectedRelation;
      const actRel = ev.relation;

      if (matrix[expRel] && matrix[expRel][actRel] !== undefined) {
        matrix[expRel][actRel]++;
      }

      // Track DIRECT metrics
      if (expRel === EVIDENCE_RELATIONS.DIRECT && actRel === EVIDENCE_RELATIONS.DIRECT) {
        directTruePositives++;
      } else if (expRel !== EVIDENCE_RELATIONS.DIRECT && actRel === EVIDENCE_RELATIONS.DIRECT) {
        directFalsePositives++;
      } else if (expRel === EVIDENCE_RELATIONS.DIRECT && actRel !== EVIDENCE_RELATIONS.DIRECT) {
        directFalseNegatives++;
      }

      const isMatch = expRel === actRel;
      if (isMatch) {
        correctRelations++;
      } else {
        failures.push({
          pair,
          actualVerdict: ev,
          reasonMismatch: `Expected relation ${expRel}, got ${actRel}`
        });
      }

      detailedResults.push({
        id: pair.id,
        status: isMatch ? 'PASS' : 'FAIL',
        expected: expRel,
        actual: actRel,
        answersExact: ev.answersExactClaim,
        supports: ev.supportsClaim,
        contradicts: ev.contradictsClaim,
        scopeMatches: ev.scopeMatches,
        requiresExternalInference: ev.requiresExternalInference,
        latency: latencyMs
      });

      console.log(`[${i + 1}/${totalPairs}] ${pair.id}: ${isMatch ? 'PASS' : 'FAIL'} (Exp: ${expRel}, Act: ${actRel}, scope: ${ev.scopeMatches}, extInf: ${ev.requiresExternalInference}, ${latencyMs}ms)`);
    }

    // Calculations
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
    console.log('   MISHKAT PHASE 5A FINAL HOLDOUT EVALUATION RESULTS  ');
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
      console.log(`[${d.status}] ${d.id} | Exp: ${d.expected.padEnd(10)} | Act: ${d.actual.padEnd(10)} | scope:${d.scopeMatches ? 'T' : 'F'} extInf:${d.requiresExternalInference ? 'T' : 'F'} | Latency: ${d.latency.toFixed(1)}ms`);
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
      console.log('\n>>> ZERO FAILURES! All 40 fresh holdout pairs classified with 100% precision.');
    }
    console.log('======================================================\n');

    // Strict safety assertions (Priority: False DIRECT must be 0, DIRECT Precision >= 95%)
    assert.equal(directFalsePositives, 0, 'SAFETY CRITICAL: False DIRECT count must be 0');
    assert.ok(directPrecision >= 0.95, `DIRECT Precision must be >= 95% (got ${(directPrecision * 100).toFixed(1)}%)`);
    assert.ok(relationAccuracy >= 0.80, `Overall Relation Accuracy target >= 80% (got ${(relationAccuracy * 100).toFixed(1)}%)`);
    assert.equal(contradictionAcc, 1.0, 'Contradiction accuracy must be 100%');
  });
});
