/**
 * SYNTHETIC TEST FIXTURES FOR MISHKAT PHASE 3
 * 
 * STRICT COMPLIANCE:
 * - These fixtures are EXCLUSIVELY for software structure and unit test verification.
 * - They are clearly marked SYNTHETIC_FIXTURE.
 * - They must NEVER enter the production knowledge repository or be served as religious evidence.
 */

import { KNOWLEDGE_DOMAINS, EVIDENCE_TYPES, VERIFICATION_STATUSES } from '../../src/mishkat/knowledge/sourceTypes.js';

export const SYNTHETIC_TEST_FIXTURES = Object.freeze({
  // Synthetic Quran Record (Uses exact authentic Surat Al-Ikhlas Ayah 1 text for verified testing)
  validQuranRecord: {
    recordId: 'synth_quran_112_1',
    sourceId: 'src_quran_king_fahd',
    domain: KNOWLEDGE_DOMAINS.QURAN,
    title: 'سورة الإخلاص - آية 1',
    section: 'الجزء الثلاثون',
    subsection: 'سورة الإخلاص',
    text: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
    topics: ['التوحيد', 'أسماء الله وصفاته'],
    evidenceType: EVIDENCE_TYPES.QURANIC_CANONICAL_TEXT,
    reference: {
      surahNumber: 112,
      ayahNumber: 1,
      book: 'القرآن الكريم',
      volume: null,
      page: 604,
      chapter: 'سورة الإخلاص',
      hadithNumber: null
    },
    attribution: {
      author: 'كلام الله المعجز المنزل على رسوله ﷺ',
      scholar: null,
      narrator: null
    },
    verification: {
      status: VERIFICATION_STATUSES.VERIFIED,
      grading: null,
      gradingAuthority: 'إجماع الأمة وتواتر القراءات السبع والعشر'
    },
    sourceUrl: 'https://qurancomplex.gov.sa'
  },

  // Invalid Quran Record (Missing surahNumber or invalid range)
  invalidQuranRecord: {
    recordId: 'synth_quran_invalid',
    sourceId: 'src_quran_king_fahd',
    domain: KNOWLEDGE_DOMAINS.QURAN,
    title: 'سورة غير صالحة',
    section: '',
    text: 'نص تجريبي لاختبار الرفض',
    reference: {
      surahNumber: 999, // Invalid surah number (must be 1-114)
      ayahNumber: 0
    }
  },

  // Synthetic Hadith Record (Authentic Bukhari Hadith #1)
  validHadithRecord: {
    recordId: 'synth_hadith_bukhari_1',
    sourceId: 'src_hadith_bukhari',
    domain: KNOWLEDGE_DOMAINS.HADITH,
    title: 'حديث إنما الأعمال بالنيات',
    section: 'كتاب بدء الوحي',
    subsection: 'باب كيف كان بدء الوحي إلى رسول الله ﷺ',
    text: 'سَمِعْتُ عُمَرَ بْنَ الخَطَّابِ رَضِيَ اللَّهُ عَنْهُ عَلَى المِنْبَرِ قَالَ: سَمِعْتُ رَسُولَ اللَّهِ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ يَقُولُ: «إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى».',
    topics: ['النية', 'الإخلاص'],
    evidenceType: EVIDENCE_TYPES.HADITH_ISNAD_STATUS,
    reference: {
      hadithNumber: 1,
      book: 'صحيح البخاري',
      chapter: 'بدء الوحي',
      volume: 1,
      page: 6,
      surahNumber: null,
      ayahNumber: null
    },
    attribution: {
      narrator: 'عمر بن الخطاب رضي الله عنه',
      scholar: 'محمد بن إسماعيل البخاري',
      author: null
    },
    verification: {
      status: VERIFICATION_STATUSES.VERIFIED,
      grading: 'صحيح متفق عليه',
      gradingAuthority: 'أئمة الحديث بالإجماع'
    },
    sourceUrl: 'https://dorar.net/hadith'
  },

  // Synthetic Terminology Record
  validTerminologyRecord: {
    recordId: 'synth_term_tawheed',
    sourceId: 'src_terminology_jamhara',
    domain: KNOWLEDGE_DOMAINS.TERMINOLOGY,
    title: 'مفهوم التوحيد في الاصطلاح الشرعي',
    section: 'حرف التاء',
    subsection: 'أصول العقيدة',
    text: 'التوحيد لغة: جعل الشيء واحداً. وشرعاً: إفراد الله تعالى بما يختص به من الربوبية والألوهية والأسماء والصفات.',
    topics: ['التوحيد', 'المصطلحات العقدية'],
    evidenceType: EVIDENCE_TYPES.LEXICAL_DEFINITION,
    reference: {
      book: 'معجم المصطلحات الإسلامية',
      chapter: 'باب التاء'
    },
    attribution: {
      author: 'لجنة معجم الجمهرة',
      scholar: null,
      narrator: null
    },
    verification: {
      status: VERIFICATION_STATUSES.SOURCE_PROVIDED,
      grading: null,
      gradingAuthority: null
    },
    sourceUrl: 'https://islamic-content.com/dictionary'
  },

  // Synthetic Fiqh Record (Dorar Fiqh)
  validFiqhRecord: {
    recordId: 'synth_fiqh_sujood_sahw',
    sourceId: 'src_fiqh_dorar',
    domain: KNOWLEDGE_DOMAINS.FIQH,
    title: 'محل سجود السهو هل هو قبل السلام أم بعده؟',
    section: 'كتاب الصلاة',
    subsection: 'باب سجود السهو',
    text: 'اختلف الفقهاء في محل سجود السهو؛ فذهب الحنفية إلى أنه بعد السلام مطلقاً، وذهب الشافعية إلى أنه قبل السلام مطلقاً، وفصل المالكية والحنابلة بين الزيادة والنقصان.',
    topics: ['سجود السهو', 'الصلاة', 'الخلاف الفقهي'],
    evidenceType: EVIDENCE_TYPES.FIQH_OPINIONS,
    reference: {
      book: 'الموسوعة الفقهية',
      chapter: 'أحكام الصلاة'
    },
    attribution: {
      author: 'القسم العلمي بمؤسسة الدرر السنية',
      scholar: null,
      narrator: null
    },
    verification: {
      status: VERIFICATION_STATUSES.SOURCE_PROVIDED,
      grading: null,
      gradingAuthority: null
    },
    sourceUrl: 'https://dorar.net/feqhia'
  },

  // Synthetic Misconceptions Record (Bayyinat)
  validMisconceptionRecord: {
    recordId: 'synth_misc_bayyinat_1',
    sourceId: 'src_misconceptions_bayyinat',
    domain: KNOWLEDGE_DOMAINS.MISCONCEPTIONS,
    title: 'دعوى انتشار الإسلام بالسيف وإكراه الناس على الدخول فيه',
    section: 'شبهات تاريخية وتشريعية',
    subsection: 'حرية الاعتقاد',
    text: 'الدعوى: يزعم البعض أن الإسلام فرض دينه بالقوة. الحقيقة والبرهان: نصوص القرآن صريحة قطعية في منع الإكراه على الدين كقوله تعالى: ﴿لا إِكْرَاهَ فِي الدِّينِ﴾، والقتال في الإسلام شُرع للدفاع عن النفس ودفع العدوان وحماية حرية الدعوة.',
    topics: ['حرية الاعتقاد', 'دفع الشبهات', 'الجهاد في الإسلام'],
    evidenceType: EVIDENCE_TYPES.MISCONCEPTION_REBUTTAL,
    reference: {
      book: 'كتاب بيّنات',
      page: 45
    },
    attribution: {
      author: 'مركز دعوة',
      scholar: null,
      narrator: null
    },
    verification: {
      status: VERIFICATION_STATUSES.SOURCE_PROVIDED,
      grading: null,
      gradingAuthority: null
    },
    sourceUrl: 'https://dawa.center/file/7937'
  }
});
