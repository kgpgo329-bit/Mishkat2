/**
 * Mishkat Canonical Approved Source Registry
 * 
 * Manages official, vetted Islamic knowledge sources.
 * Adheres strictly to the Approved Source Registry contract:
 * {
 *   sourceId: "unique-stable-id",
 *   sourceName: "اسم المصدر",
 *   sourceUrl: "original source URL or null",
 *   provider: "source/provider",
 *   domain: "QURAN | TAFSIR | HADITH | AQEEDAH | FIQH | HISTORY | MISCONCEPTIONS | TERMINOLOGY | DAWAH",
 *   sourceType: "BOOK | WEBSITE | ENCYCLOPEDIA | DICTIONARY | COLLECTION | DOCUMENT",
 *   language: "ar",
 *   approved: true,
 *   authorityLevel: "PRIMARY | APPROVED_REFERENCE | SUPPORTING",
 *   version: null,
 *   retrievedAt: null,
 *   notes: null
 * }
 */

import {
  KNOWLEDGE_DOMAINS,
  SOURCE_TYPES,
  AUTHORITY_LEVELS
} from './sourceTypes.js';

/**
 * Baseline Approved Sources Canonical List
 */
export const OFFICIAL_APPROVED_SOURCES = Object.freeze([
  // 1. QURAN
  {
    sourceId: 'src_quran_king_fahd',
    sourceName: 'مصحف المدينة النبوية - مجمع الملك فهد لطباعة المصحف الشريف',
    sourceUrl: 'https://qurancomplex.gov.sa',
    provider: 'مجمع الملك فهد لطباعة المصحف الشريف',
    domain: KNOWLEDGE_DOMAINS.QURAN,
    sourceType: SOURCE_TYPES.BOOK,
    language: 'ar',
    approved: true,
    authorityLevel: AUTHORITY_LEVELS.PRIMARY,
    version: 'حفص عن عاصم بالرسم العثماني',
    retrievedAt: '2026-10-04T00:00:00.000Z',
    notes: 'المصدر المعياري المعتمد للنص القرآني الموثق بالرسم العثماني الكامل.'
  },
  {
    sourceId: 'src_quran_quranpedia',
    sourceName: 'موسوعة القرآن الكريم - قرآن بيديا',
    sourceUrl: 'https://quranpedia.net',
    provider: 'قرآن بيديا (Quranpedia)',
    domain: KNOWLEDGE_DOMAINS.QURAN,
    sourceType: SOURCE_TYPES.WEBSITE,
    language: 'ar',
    approved: true,
    authorityLevel: AUTHORITY_LEVELS.APPROVED_REFERENCE,
    version: '1.0',
    retrievedAt: '2026-10-04T00:00:00.000Z',
    notes: 'بوابة رقمية موثقة لبيانات الآيات والسور والترتيب النزولي.'
  },

  // 2. TAFSIR
  {
    sourceId: 'src_tafsir_dorar',
    sourceName: 'موسوعة التفسير - الدرر السنية',
    sourceUrl: 'https://dorar.net/tafseer',
    provider: 'مؤسسة الدرر السنية',
    domain: KNOWLEDGE_DOMAINS.TAFSIR,
    sourceType: SOURCE_TYPES.ENCYCLOPEDIA,
    language: 'ar',
    approved: true,
    authorityLevel: AUTHORITY_LEVELS.APPROVED_REFERENCE,
    version: 'الموسوعة التفسيرية الميسرة',
    retrievedAt: '2026-10-04T00:00:00.000Z',
    notes: 'تفسير موثق جامع لأقوال السلف والقرون الثلاثة الأولى مع تحرير معتمد.'
  },
  {
    sourceId: 'src_tafsir_tabari',
    sourceName: 'جامع البيان عن تأويل آي القرآن (تفسير الطبري)',
    sourceUrl: 'https://shamela.ws/book/43',
    provider: 'الإمام محمد بن جرير الطبري (ت 310 هـ)',
    domain: KNOWLEDGE_DOMAINS.TAFSIR,
    sourceType: SOURCE_TYPES.BOOK,
    language: 'ar',
    approved: true,
    authorityLevel: AUTHORITY_LEVELS.PRIMARY,
    version: 'تحقيق شاكر / التركي',
    retrievedAt: '2026-10-04T00:00:00.000Z',
    notes: 'إمام كتب التفسير بالمأثور من القرون الثلاثة الأولى الفاضلة.'
  },

  // 3. HADITH
  {
    sourceId: 'src_hadith_bukhari',
    sourceName: 'الجامع المسند الصحيح المختصر (صحيح البخاري)',
    sourceUrl: 'https://dorar.net/hadith',
    provider: 'الإمام محمد بن إسماعيل البخاري (ت 256 هـ)',
    domain: KNOWLEDGE_DOMAINS.HADITH,
    sourceType: SOURCE_TYPES.BOOK,
    language: 'ar',
    approved: true,
    authorityLevel: AUTHORITY_LEVELS.PRIMARY,
    version: 'الطبعة السلطانية المعتمدة',
    retrievedAt: '2026-10-04T00:00:00.000Z',
    notes: 'أصح كتاب بعد كتاب الله عز وجل، يحفظ الأحاديث المسندة الصحيحة.'
  },
  {
    sourceId: 'src_hadith_muslim',
    sourceName: 'المسند الصحيح المختصر بنقل العدل عن العدل (صحيح مسلم)',
    sourceUrl: 'https://dorar.net/hadith',
    provider: 'الإمام مسلم بن الحجاج النيسابوري (ت 261 هـ)',
    domain: KNOWLEDGE_DOMAINS.HADITH,
    sourceType: SOURCE_TYPES.BOOK,
    language: 'ar',
    approved: true,
    authorityLevel: AUTHORITY_LEVELS.PRIMARY,
    version: 'تحقيق محمد فؤاد عبد الباقي',
    retrievedAt: '2026-10-04T00:00:00.000Z',
    notes: 'ثاني الصحيحين في التوثيق والضبط وصنعة الإسناد.'
  },
  {
    sourceId: 'src_hadith_dorar',
    sourceName: 'الموسوعة الحديثية - الدرر السنية',
    sourceUrl: 'https://dorar.net/hadith',
    provider: 'مؤسسة الدرر السنية',
    domain: KNOWLEDGE_DOMAINS.HADITH,
    sourceType: SOURCE_TYPES.ENCYCLOPEDIA,
    language: 'ar',
    approved: true,
    authorityLevel: AUTHORITY_LEVELS.APPROVED_REFERENCE,
    version: 'الإصدار المحدث',
    retrievedAt: '2026-10-04T00:00:00.000Z',
    notes: 'مرجع التخريج وبيان أحكام أئمة الحديث المتقدمين والمتأخرين.'
  },
  {
    sourceId: 'src_hadith_shamela',
    sourceName: 'المكتبة الشاملة - كتب السنة وشروحها',
    sourceUrl: 'https://shamela.ws',
    provider: 'المكتبة الشاملة الرقمية',
    domain: KNOWLEDGE_DOMAINS.HADITH,
    sourceType: SOURCE_TYPES.COLLECTION,
    language: 'ar',
    approved: true,
    authorityLevel: AUTHORITY_LEVELS.APPROVED_REFERENCE,
    version: 'الطبعات المحققة مقابلة على المخطوطات',
    retrievedAt: '2026-10-04T00:00:00.000Z',
    notes: 'مستودع المرويات المسندة من كتب السنن والمسانيد المعتمدة.'
  },

  // 4. AQEEDAH
  {
    sourceId: 'src_aqeedah_dorar',
    sourceName: 'الموسوعة العقدية - الدرر السنية',
    sourceUrl: 'https://dorar.net/aqeeda',
    provider: 'مؤسسة الدرر السنية',
    domain: KNOWLEDGE_DOMAINS.AQEEDAH,
    sourceType: SOURCE_TYPES.ENCYCLOPEDIA,
    language: 'ar',
    approved: true,
    authorityLevel: AUTHORITY_LEVELS.APPROVED_REFERENCE,
    version: 'الموسوعة العقدية المحررة',
    retrievedAt: '2026-10-04T00:00:00.000Z',
    notes: 'تقرير عقيدة أهل السنة والجماعة مستدلاً بنصوص الكتاب والسنة وآثار السلف.'
  },

  // 5. FIQH
  {
    sourceId: 'src_fiqh_dorar',
    sourceName: 'الموسوعة الفقهية - الدرر السنية',
    sourceUrl: 'https://dorar.net/feqhia',
    provider: 'مؤسسة الدرر السنية',
    domain: KNOWLEDGE_DOMAINS.FIQH,
    sourceType: SOURCE_TYPES.ENCYCLOPEDIA,
    language: 'ar',
    approved: true,
    authorityLevel: AUTHORITY_LEVELS.APPROVED_REFERENCE,
    version: 'الموسوعة الفقهية المقارنة',
    retrievedAt: '2026-10-04T00:00:00.000Z',
    notes: 'عرض مسائل الفقه الإسلامي على المذاهب الأربعة مع أدلتها ومواطن الإجماع والخلاف.'
  },

  // 6. HISTORY & SEERAH
  {
    sourceId: 'src_history_dorar',
    sourceName: 'الموسوعة التاريخية والسيرة النبوية - الدرر السنية',
    sourceUrl: 'https://dorar.net/history',
    provider: 'مؤسسة الدرر السنية',
    domain: KNOWLEDGE_DOMAINS.HISTORY,
    sourceType: SOURCE_TYPES.ENCYCLOPEDIA,
    language: 'ar',
    approved: true,
    authorityLevel: AUTHORITY_LEVELS.APPROVED_REFERENCE,
    version: 'الموسوعة التاريخية المحررة',
    retrievedAt: '2026-10-04T00:00:00.000Z',
    notes: 'توثيق أحداث السيرة النبوية والتاريخ الإسلامي بالروايات المعتمدة ونقد الضعيف.'
  },

  // 7. MISCONCEPTIONS & DIALOGUE
  {
    sourceId: 'src_misconceptions_bayyinat',
    sourceName: 'كتاب بيّنات: براهين وأدلة في تفنيد الشبهات والتساؤلات المتكررة',
    sourceUrl: 'https://dawa.center/file/7937',
    provider: 'مركز دعوة (Dawa Center)',
    domain: KNOWLEDGE_DOMAINS.MISCONCEPTIONS,
    sourceType: SOURCE_TYPES.BOOK,
    language: 'ar',
    approved: true,
    authorityLevel: AUTHORITY_LEVELS.APPROVED_REFERENCE,
    version: 'الإصدار الأول المعتمد',
    retrievedAt: '2026-10-04T00:00:00.000Z',
    notes: 'مرجع أصيل في معالجة الشبهات الفكرية والأسئلة الحوارية المتكررة بالأدلة والبراهين.'
  },

  // 8. ISLAMIC TERMINOLOGY & TRANSLATION
  {
    sourceId: 'src_terminology_jamhara',
    sourceName: 'معجم الجمهرة للمصطلحات الإسلامية وترجماتها',
    sourceUrl: 'https://islamic-content.com/dictionary',
    provider: 'منصة المحتوى الإسلامي (Islamic Content)',
    domain: KNOWLEDGE_DOMAINS.TERMINOLOGY,
    sourceType: SOURCE_TYPES.DICTIONARY,
    language: 'ar',
    approved: true,
    authorityLevel: AUTHORITY_LEVELS.APPROVED_REFERENCE,
    version: 'الإصدار المعجمي الرقمي',
    retrievedAt: '2026-10-04T00:00:00.000Z',
    notes: 'المرجع المفضل للمصطلحات الدينية والشرعية وترجماتها الدقيقة لمنع الترجمة الحرفية.'
  },

  // 9. DAWAH & GENERAL ISLAMIC CONTENT
  {
    sourceId: 'src_dawah_center',
    sourceName: 'بوابة مركز دعوة للبحوث والدراسات',
    sourceUrl: 'https://dawa.center',
    provider: 'مركز دعوة (Dawa Center)',
    domain: KNOWLEDGE_DOMAINS.DAWAH,
    sourceType: SOURCE_TYPES.WEBSITE,
    language: 'ar',
    approved: true,
    authorityLevel: AUTHORITY_LEVELS.SUPPORTING,
    version: 'البوابة المحدثة',
    retrievedAt: '2026-10-04T00:00:00.000Z',
    notes: 'دراسات دعوية ومنهجية وتأصيلية في الخطاب الإسلامي المعاصر.'
  },
  {
    sourceId: 'src_dawah_islamic_content',
    sourceName: 'منصة المحتوى الإسلامي المفتوح',
    sourceUrl: 'https://islamic-content.com',
    provider: 'منصة المحتوى الإسلامي',
    domain: KNOWLEDGE_DOMAINS.DAWAH,
    sourceType: SOURCE_TYPES.WEBSITE,
    language: 'ar',
    approved: true,
    authorityLevel: AUTHORITY_LEVELS.SUPPORTING,
    version: 'النسخة الرقمية المفتوحة',
    retrievedAt: '2026-10-04T00:00:00.000Z',
    notes: 'محتوى إسلامي مترجم ومراجع بمختلف اللغات العالمية لدعم التواصل والدعوة.'
  }
]);

/**
 * SourceRegistry Class
 * Maintains registered sources in-memory and enforces registration policies.
 */
export class SourceRegistry {
  constructor(initialSources = OFFICIAL_APPROVED_SOURCES) {
    this._sources = new Map();
    for (const src of initialSources) {
      this.registerSource(src);
    }
  }

  /**
   * Registers a source into the registry.
   * Validates stable ID, approved status, domain, and prevents duplicate IDs.
   * 
   * @param {Object} source
   * @returns {Object} registered source
   */
  registerSource(source) {
    if (!source || typeof source !== 'object') {
      throw new Error('INVALID_SOURCE: Source must be a valid non-empty object.');
    }

    if (!source.sourceId || typeof source.sourceId !== 'string' || source.sourceId.trim() === '') {
      throw new Error('INVALID_SOURCE_ID: Source must provide a non-empty stable string sourceId.');
    }

    const trimmedId = source.sourceId.trim();

    if (this._sources.has(trimmedId)) {
      throw new Error(`DUPLICATE_SOURCE_ID: Source with id "${trimmedId}" is already registered.`);
    }

    if (source.approved !== true) {
      throw new Error(`UNAPPROVED_SOURCE: Source "${trimmedId}" must have approved: true.`);
    }

    if (!source.sourceName || typeof source.sourceName !== 'string' || source.sourceName.trim() === '') {
      throw new Error(`INVALID_SOURCE_NAME: Source "${trimmedId}" must have a valid sourceName.`);
    }

    if (!source.domain || !Object.values(KNOWLEDGE_DOMAINS).includes(source.domain)) {
      throw new Error(`INVALID_SOURCE_DOMAIN: Source "${trimmedId}" has invalid or unsupported domain: ${source.domain}`);
    }

    if (!source.sourceType || !Object.values(SOURCE_TYPES).includes(source.sourceType)) {
      throw new Error(`INVALID_SOURCE_TYPE: Source "${trimmedId}" has invalid sourceType: ${source.sourceType}`);
    }

    if (!source.authorityLevel || !Object.values(AUTHORITY_LEVELS).includes(source.authorityLevel)) {
      throw new Error(`INVALID_AUTHORITY_LEVEL: Source "${trimmedId}" has invalid authorityLevel: ${source.authorityLevel}`);
    }

    const normalizedSource = {
      sourceId: trimmedId,
      sourceName: source.sourceName.trim(),
      sourceUrl: source.sourceUrl || null,
      provider: source.provider || null,
      domain: source.domain,
      sourceType: source.sourceType,
      language: source.language || 'ar',
      approved: true,
      authorityLevel: source.authorityLevel,
      version: source.version || null,
      retrievedAt: source.retrievedAt || null,
      notes: source.notes || null
    };

    this._sources.set(trimmedId, Object.freeze(normalizedSource));
    return normalizedSource;
  }

  /**
   * Retrieves a source by its stable sourceId
   * @param {string} sourceId 
   * @returns {Object|null}
   */
  getSource(sourceId) {
    if (!sourceId || typeof sourceId !== 'string') return null;
    return this._sources.get(sourceId.trim()) || null;
  }

  /**
   * Checks whether a sourceId exists and is approved
   * @param {string} sourceId 
   * @returns {boolean}
   */
  isSourceApproved(sourceId) {
    const src = this.getSource(sourceId);
    return Boolean(src && src.approved === true);
  }

  /**
   * Retrieves all registered sources
   * @returns {Array<Object>}
   */
  getAllSources() {
    return Array.from(this._sources.values());
  }

  /**
   * Retrieves all sources in a given domain
   * @param {string} domain 
   * @returns {Array<Object>}
   */
  getSourcesByDomain(domain) {
    return this.getAllSources().filter(s => s.domain === domain);
  }

  /**
   * Returns count of registered sources
   */
  get count() {
    return this._sources.size;
  }
}

// Default singleton registry
export const defaultSourceRegistry = new SourceRegistry();

export default SourceRegistry;
