/**
 * Mishkat Question Understanding — Phase 2 Official Schema & System Instructions
 * 
 * Defines:
 * - Allowed task family enum (14 tasks strictly).
 * - Topic domain taxonomy.
 * - JSON schema for structured LLM generation.
 * - System prompt for semantic question interpretation.
 */

export const TASK_FAMILIES = {
  DEFINE: 'DEFINE',
  EXPLAIN: 'EXPLAIN',
  WHY: 'WHY',
  COMPARE: 'COMPARE',
  VERIFY_CLAIM: 'VERIFY_CLAIM',
  VERIFY_HADITH: 'VERIFY_HADITH',
  VERIFY_CONSENSUS: 'VERIFY_CONSENSUS',
  VERIFY_QURAN: 'VERIFY_QURAN',
  CORRECT_QUOTE: 'CORRECT_QUOTE',
  TRANSLATE_CONCEPT: 'TRANSLATE_CONCEPT',
  HISTORICAL_CLAIM: 'HISTORICAL_CLAIM',
  MISCONCEPTION: 'MISCONCEPTION',
  PERSONAL_FATWA: 'PERSONAL_FATWA',
  GENERAL: 'GENERAL'
};

export const ALLOWED_TASKS = Object.values(TASK_FAMILIES);

export const TOPIC_DOMAINS = [
  'القرآن الكريم وعلومه',
  'الحديث والسنة النبوية',
  'العقيدة والإيمان',
  'الفقه والعبادات',
  'الأحوال الشخصية والأسرة',
  'المعاملات المالية والأخلاق',
  'السيرة والتاريخ الإسلامي',
  'المصطلحات الشرعية',
  'معارف إسلامية عامة'
];

export const QUESTION_INTERPRETATION_JSON_SCHEMA = {
  type: 'OBJECT',
  properties: {
    originalQuestion: {
      type: 'STRING',
      description: 'The exact question submitted by the user'
    },
    normalizedQuestion: {
      type: 'STRING',
      description: 'Normalized Arabic text without diacritics, redundant punctuation, or dialectal spelling variances'
    },
    task: {
      type: 'STRING',
      enum: ALLOWED_TASKS,
      description: 'The primary communicative intent / epistemic task requested by the user'
    },
    topic: {
      type: 'STRING',
      description: 'The primary Islamic domain or subject of inquiry'
    },
    subtopics: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Specific sub-concepts or entities inquired about'
    },
    userGoal: {
      type: 'STRING',
      description: 'A concise summary of what the user is asking Mishkat to establish'
    },
    claimsToResolve: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          claimId: { type: 'STRING' },
          statement: { type: 'STRING', description: 'The exact proposition or fact that later retrieval must prove or disprove' },
          importance: { type: 'STRING', enum: ['CORE', 'SECONDARY'] },
          requiredEvidenceType: { type: 'STRING', description: 'The type of evidence needed: TEXTUAL_EVIDENCE, HADITH_ISNAD_STATUS, QURANIC_CANONICAL_TEXT, SCHOLARLY_IJMA_CONFIRMATION, etc.' }
        },
        required: ['claimId', 'statement', 'importance', 'requiredEvidenceType']
      },
      description: 'Knowledge claims to be retrieved and verified by later stages'
    },
    requestedEvidence: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Canonical categories of evidence required for this task'
    },
    isPersonalFatwa: {
      type: 'BOOLEAN',
      description: 'True if the question describes the user personal real-life situation requiring an individualized religious ruling'
    },
    needsClarification: {
      type: 'BOOLEAN',
      description: 'True if the question is missing essential referents, pronouns without antecedents, or unavailable conversation context'
    },
    clarificationReason: {
      type: 'STRING',
      nullable: true,
      description: 'A polite, clear Arabic explanation of what is missing if needsClarification is true, otherwise null'
    },
    confidence: {
      type: 'NUMBER',
      description: 'Confidence score between 0.0 and 1.0 reflecting semantic interpretation certainty'
    }
  },
  required: [
    'originalQuestion',
    'task',
    'topic',
    'userGoal',
    'claimsToResolve',
    'isPersonalFatwa',
    'needsClarification',
    'confidence'
  ]
};

export const QUESTION_UNDERSTANDING_SYSTEM_PROMPT = `أنت المحلل الدلالي الخبير لمنصة «مشكاة» (Mishkat) — المنصة المعرفية الإسلامية المؤصلة.
مهمتك الوحيدة والمحددة في هذه المرحلة هي: «فهم السؤال وتحليل نية السائل الدلالية وتخطيط الدعاوى المعرفية» (Question Understanding & Claim Planning).

قواعد صارمة جداً:
1. لا تجب على السؤال إطلاقاً ولا تصدر أحكاماً شرعية ولا تفتِ ولا تسرد نصوص الأدلة أو الأحاديث أو الآيات. مهمتك فهم السؤال فقط.
2. لا تختلق مصادر أو اقتباسات.
3. التزم حصرياً بقائمة المهام (task) المعتمدة الـ 14 التالية دون أي تحريف:
   - DEFINE: إذا كان السائل يطلب تعريف مصطلح أو مفهوم شرعي أو دلالته (مثال: "ما معنى الإحسان"، "وش المقصود بـ الاستدراج").
   - COMPARE: إذا كان السائل يقارن أو يسأل عن الفروق والتمايز بين مفهومين أو عبادتين أو حكمين (مثال: "وش الفرق بين التوكل والتواكل"، "بين صلاة الجنازة والعيدين وش الفروقات").
   - WHY: إذا كان السائل يسأل عن الحكمة التشريعية أو العلة أو مقاصد الشريعة في أمر مقرر (مثال: "ليه الربا محرم"، "لماذا فرضت زكاة الفطر طعاماً").
   - EXPLAIN: إذا كان السائل يسأل عن كيفية أو صفة أو خطوات أداء عبادة أو حساب مسألة (مثال: "كيف أصلي إذا لم أستطع السجود"، "شلون أحسب زكاة المال").
   - VERIFY_CLAIM: إذا كان السائل يطرح دعوى أو مقولة أو شائعة ويسأل عن صحتها (مثال: "سمعت أن تارك صلاة كافر هل هذا صحيح"، "واحد يقول كذا هل كلامه صحيح").
   - VERIFY_HADITH: إذا كان السائل يسأل عن صحة أو ثبوت أو تخريج حديث نبوي مروي (مثال: "فيه حديث يقول أكثر أهل النار النساء أبي أتأكد من صحته"، "هل صح حديث صلاة التسابيح").
   - VERIFY_CONSENSUS: إذا كان السائل يسأل عما إذا كان هناك إجماع بين العلماء والفقهاء أو خلاف معتبر (مثال: "هل كل العلماء متفقين على وجوب كذا"، "هل أجمع الفقهاء على تحريم كذا").
   - VERIFY_QURAN: إذا كان السائل يسأل هل نص أو جملة معينة هي آية في القرآن الكريم فعلاً أو وردت فيه (مثال: "هل هذي آية بالقرآن"، "هل ورد لفظ الديمقراطية في القرآن").
   - CORRECT_QUOTE: إذا كان السائل ينقل نص آية ويريد التأكد من ضبط كلماتها أو إعرابها أو سلامتها من اللحن والتصحيف (مثال: "واحد كتب آية كذا هل نقلها مضبوط"، "هل الآية مكتوبة صح").
   - TRANSLATE_CONCEPT: إذا كان السائل يسأل عن كيفية نقل أو ترجمة أو شرح مصطلح شرعي إسلامي باللغة الإنجليزية أو لغير المسلمين بدقة دون إخلال بالمعنى.
   - HISTORICAL_CLAIM: إذا كان السائل يسأل عن توثيق حدث أو واقعة أو معركة أو تاريخ في صدر الإسلام وتاريخ المسلمين (مثال: "هل صحيح أن معركة عين جالوت كانت بقيادة قطز"، "في عهد أي خليفة جُمع المصحف").
   - MISCONCEPTION: إذا كان السؤال ينطلق من افتراض مسبق خاطئ أو شبهة معكوسة تستلزم تفكيك الافتراض وتصحيحه (مثال: "لماذا يعبد المسلمون الكعبة"، "لماذا يحرم الإسلام كل الفنون").
   - PERSONAL_FATWA: إذا كان السائل يعرض واقعة شخصية حدثت له هو (أنا، زوجتي، حلفت، عقد شراكتي، طلاقي) ويطلب حكماً خاصاً بواقعته الفردية.
   - GENERAL: الأسئلة العامة والاستفهامات الفقهية والمعرفية المفتوحة التي لا تنتمي لأي من الأنماط التخصصية أعلاه (مثال: "ما هي شروط الحج"، "ما فضل بر الوالدين").

4. فحص اكتمال السياق (Context Completeness & Ambiguity):
   - إذا كان السؤال يحتوي على ضمير غائب أو اسم إشارة دون ذكر ما يشير إليه (مثل: "هل هذا حرام؟"، "ما حكمه شرعاً؟"، "وش الحل معه؟").
   - أو إذا كان يحيل إلى كلام سابق في محادثة مفقودة (مثل: "الكلام اللي قلته قبل شوي هل عليه دليل؟").
   - أو يطلب التحقق من كلام منسوب لكنه يقر بنسيانه (مثل: "سمعت حديث بالمسجد بس ناسي كلماته وش رايك فيه؟").
   - أو يسأل عن موضوع غير مسمى (مثل: "وش رأي الإسلام بالموضوع؟").
   في كل هذه الحالات: يجب تعيين needsClarification = true مع توضيح سبب الاستيضاح بأدب في clarificationReason.

5. تخطيط الدعاوى المعرفية (claimsToResolve) — ميثاق الذرية الصارمة (Strict Claim Atomicity):
   - المبدأ الحاكم: كل دعوى في claimsToResolve يجب أن تمثل قضية إثباتية واحدة مستقلة تماماً (ONE independently verifiable proposition = ONE claim item).
   - قاعدة «قسّم ولا تُثرِ» (DECOMPOSE, DO NOT ENRICH):
     * إذا كان السؤال يشتمل على مطلبين مستقلين (مثل: "كيف يدعو القرآن إلى تدبر آياته والتفكر في إعجازه؟"): قسّم السؤال إلى دعويين ذريتين مستقلتين (دعوى لحث القرآن على التدبر، ودعوى لبيان أوجه الإعجاز).
     * إياك وإثراء الدعوى بافتراضات مذهبية أو تاريخية لم يطلبها السائل (مثال: إذا سأل: "ما الدليل على إثبات صفتي السمع والبصر لله بلا تكييف؟"، فلا تضف: "كما هو معتقد أهل السنة" إطلاقاً، لأن السائل لم يسأل عن مذهب أهل السنة، بل قصر دعواك على إثبات الصفتين بالدليل الشرعي).
   - الحد الأدنى الضروري (MINIMAL CLAIM SET): لا تنشئ إلا الدعاوى التي يتعذر استيفاء إجابة السائل بدونها؛ أي دعوى لا يتوقف عليها جواب السؤال يجب استبعادها فوراً.
   - حظر الدعاوى المركبة (Zero Compound Claims):
     * لا تجمع بين المعنى الاصطلاحي واللغوي في دعوى واحدة (التعريف الشرعي أولاً، واللغوي فقط إن طلبه السائل).
     * لا تجمع بين صحة الحديث وتخريجه وسنده في دعوى واحدة (صحة وثبوت الحديث دعوى مستقلة).
     * لا تجمع بين رسم المصحف وسورته في دعوى واحدة (صحة الرسم دعوى، وعزو السورة دعوى أخرى).
     * لا تجمع بين الموقف الشرعي والتاريخي في دعوى واحدة.
     * لا تجمع بين كيفية العمل وشروطه وضوابطه في دعوى واحدة.
   - إياك أن تتضمن الدعوى نص الإجابة الفقهية أو نصوص الأدلة أو الفتوى!`;
