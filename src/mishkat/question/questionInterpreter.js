/**
 * Mishkat Question Interpreter — Phase 2 Semantic Architecture
 * 
 * Orchestrates Question Understanding:
 * 1. Primary AI Layer: Server-side Gemini Semantic Interpreter via aiQuestionInterpreter.js.
 * 2. Schema Validation: Strict deterministic verification via questionValidator.js.
 * 3. Semantic Claim Planning: Enriches and verifies claims via claimPlanner.js.
 * 4. Deterministic Fallback Layer: Multi-signal heuristic analyzer used when AI is offline or credentials unavailable.
 */

import { TASK_FAMILIES, ALLOWED_TASKS } from './questionSchema.js';
import { callGeminiQuestionInterpreter, isGeminiConfigured, aiDiagnostics } from './aiQuestionInterpreter.js';
import { validateQuestionInterpretation } from './questionValidator.js';
import { planClaimsForQuestion, decomposeCompoundClaims } from './claimPlanner.js';

export { TASK_FAMILIES, ALLOWED_TASKS, aiDiagnostics, isGeminiConfigured };

/**
 * Normalizes Arabic text for semantic matching:
 * - Removes tashkeel (diacritics) & tatweel
 * - Standardizes alefs (إأآٱ -> ا)
 * - Standardizes alif maqsura and yeh (ى -> ي)
 * - Standardizes hamzas (ؤ, ئ -> ء)
 * - Standardizes taa marbuta (ة -> ه)
 * - Removes punctuation and excess whitespace
 */
export function normalizeArabicText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'ء')
    .replace(/ئ/g, 'ء')
    .replace(/ة/g, 'ه')
    .replace(/[؟?؟!.,:؛،"'{}\[\]()«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Evaluates context-completeness:
 * "Can this question be understood and acted on without information that is missing from current input/context?"
 */
export function detectAmbiguity(rawQuestion, normQuestion) {
  const words = normQuestion.split(' ').filter(Boolean);

  // 1. Severe brevity without concrete subject (1-2 words)
  if (words.length <= 2) {
    const isGreetingOrGeneric = [
      'مرحبا', 'السلام عليكم', 'الو', 'هلا', 'سؤال', 'اريد فتوي', 'حديث', 'ايه', 'حكم', 'حديث صحيح'
    ].includes(normQuestion);
    if (isGreetingOrGeneric || words.length === 1) {
      return {
        needsClarification: true,
        clarificationReason: 'السؤال مقتضب جداً ولا يحتوي على موضوع محدد أو سياق كافٍ للفهم والاستدلال.'
      };
    }
  }

  // 2. References to conversation history / past turns not in current input:
  const pastTurnPatterns = [
    /قبل شوي/,
    /قبل قليل/,
    /اللي ذكرته/,
    /اللي قلته/,
    /كلامي السابق/,
    /الموضوع السابق/,
    /الرساله السابقه/,
    /سؤالي السابق/,
    /مثل ما قلت لك/
  ];
  for (const ptrn of pastTurnPatterns) {
    if (ptrn.test(normQuestion)) {
      return {
        needsClarification: true,
        clarificationReason: 'السؤال يحيل إلى سياق أو حديث سابق في المحادثة غير مذكور في نص السؤال الحالي، ويلزم بيان تفصيله.'
      };
    }
  }

  // 3. Attributed statement where user acknowledges forgetting / not knowing the wording:
  const amnesiaPatterns = [
    /(ما اذكر|لا اذكر|نسيت|ناسي|ما ادري|لا يحضرني|لا اعلم).*(وش هو|نصه|لفظه|وش كان|ما هو|كلماته|متنه)/,
    /(كلام|شيء|حديث).*(ما اذكر|نسيت|ناسي|لا اعلم)/
  ];
  for (const ptrn of amnesiaPatterns) {
    if (ptrn.test(normQuestion)) {
      return {
        needsClarification: true,
        clarificationReason: 'السؤال يطلب التحقق من كلام منسوب مع الإقرار بعدم معرفة نصه أو فحواه، ويتعذر التخريج والاستدلال دون ذكر متن أو دعوى محددة.'
      };
    }
  }

  // 4. Standalone empty topical references: e.g. "وش رأي الإسلام بالموضوع؟"
  if (/^(وش|ما|شنو|ايش|كيف|هل)?\s*(راي|موقف|حكم)?\s*(الاسلام|الشرع|الدين)?\s*(في|ب)?(الموضوع|السالفه|القصه)\s*(\؟|\?)?$/.test(normQuestion) ||
      normQuestion === 'وش راي الاسلام بالموضوع' ||
      normQuestion === 'ما حكم الموضوع') {
    return {
      needsClarification: true,
      clarificationReason: 'السؤال يستفهم عن رأي الإسلام في «الموضوع» دون ذكر المسألة أو الفعل المراد معرفة حكمه.'
    };
  }

  // 5. Demonstrative phrases pointing to unstated antecedents:
  const vagueDemonstrativePhrases = [
    'هذا الكلام',
    'هذا القول',
    'هذا الفعل',
    'هذا الشيء',
    'هذا الامر',
    'هذا الحديث',
    'هذا النص',
    'هذا المعني',
    'هذا التصرف',
    'هذا الحكم',
    'هذي المساله'
  ];

  for (const phrase of vagueDemonstrativePhrases) {
    if (normQuestion.includes(phrase)) {
      const beforePhrase = normQuestion.split(phrase)[0]?.trim() || '';
      const afterPhrase = normQuestion.split(phrase)[1]?.trim() || '';

      const hasPrecedingClaim = beforePhrase.length > 15 && (
        beforePhrase.includes('ان') || beforePhrase.includes('يقول') || beforePhrase.includes('سمعت') || beforePhrase.includes('ترك')
      );
      const hasFollowingExplanation = afterPhrase.length > 15 && (
        afterPhrase.startsWith('وهو') || afterPhrase.startsWith('بان') || afterPhrase.startsWith('الذي')
      );

      if (!hasPrecedingClaim && !hasFollowingExplanation) {
        return {
          needsClarification: true,
          clarificationReason: `السؤال يعتمد على إحالة مبهمة («${phrase}») دون ذكر فحوى الدعوى أو النص المراد بحثه.`
        };
      }
    }
  }

  // 6. Bare anaphoric questions without an explicit antecedent:
  const barePatterns = [
    /^(طيب\s*)?(و\s*)?(هل\s*)?(هذا|هو|هي|ذاك|ذلك|هذا\s*الشيء|هذي\s*المساله)\s*(حرام|حلال|جاءز|جائز|صحيح|صدق|باطل|مكروه|واجب)(\s*(ولا\s*لا|شرعا|في\s*الاسلام|في\s*ديننا))?$/,
    /^(طيب\s*)?(و\s*)?(ما\s*حكم|وش\s*حكم|ايش\s*حكم|شو\s*حكم)\s*(هذا|هذا\s*الفعل|هذا\s*الشيء|ذلك|ه|هذي\s*المساله)(\s*(في\s*الاسلام|شرعا))?$/,
    /^(هل\s*هو\s*(جاءز|جائز)|هل\s*هذا\s*(جاءز|جائز)|هل\s*يجوز\s*هذا\s*الشيء|هل\s*هذا\s*صحيح|ما\s*الدليل\s*عليه|اريد\s*فتوي)(\s*(شرعا|في\s*ديننا))?$/,
    /^قالوا\s*انه\s*(حرام|حلال)\s*صدق$/
  ];

  for (const p of barePatterns) {
    if (p.test(normQuestion)) {
      return {
        needsClarification: true,
        clarificationReason: 'السؤال يستفهم عن ضمير غائب أو إشارة لأمر سابق («هذا» / «هو») دون ذكر المسألة أو الفعل المسؤول عنه.'
      };
    }
  }

  return { needsClarification: false, clarificationReason: null };
}

/**
 * Detects personal fatwa situations requiring an individualized ruling
 */
export function detectPersonalFatwa(rawQuestion, normQuestion) {
  const firstPersonMarkers = [
    'انا', 'معي', 'لي', 'عندي', 'بيني', 'علي', 'في ذمتي', 'نحن', 'توفي والدي',
    'زوجتي', 'زوجي', 'والدي', 'والدنا', 'اخي', 'اختي', 'صديقي', 'طلاقي', 'عقدي', 'عملي', 'وظيفتي',
    'طلقت', 'حلفت', 'يميني', 'نذرت', 'صليت', 'نسيت', 'سويت', 'تخانقت', 'تخاصمت',
    'اشتريت', 'بعت', 'اقترضت', 'شكيت', 'هجرني', 'تزوجت', 'ولدت', 'اسقطت', 'صار في عقد', 'عقد شراكتي'
  ];

  const hasFirstPerson = firstPersonMarkers.some(marker => {
    const regex = new RegExp(`(^|\\s)${marker}(\\s|$)`);
    return regex.test(normQuestion);
  });

  const personalDecreeMarkers = [
    'هل زواجي صحيح',
    'هل يقع طلاقي',
    'هل يقع الطلاق',
    'هل طلاقي واقع',
    'هل انا اثم',
    'هل علي اعاده',
    'هل صلاتي صحيحه',
    'ماذا افعل الان',
    'وش اسوي الحين',
    'هل علي كفاره',
    'هل صومي باطل',
    'هل يلزمني كفاره',
    'كيف نقسم التركه',
    'نقسم التركه',
    'هل يحق لزوجي',
    'هل يحق لزوجتي',
    'هل يحق لي',
    'صار في عقد زواجي',
    'صار في عقد عملي',
    'صار في عقد شراكتي',
    'صار بيني وبين',
    'من يتحمل الفرق',
    'من يتحمل الخساره',
    'من يتحمل الخسارة',
    'هل اترك وظيفتي',
    'هل يلزمني صيام',
    'هل علي صيام',
    'شكيت هل صليت',
    'هل وقع شيء شرعا',
    'هل وقع شيء'
  ];

  const hasPersonalDecree = personalDecreeMarkers.some(phrase => normQuestion.includes(phrase));

  if (hasFirstPerson && hasPersonalDecree) {
    return {
      isPersonalFatwa: true,
      userGoal: 'استفتاء شخصي في واقعة فردية خاصة تستوجب النظر القضائي والفتيا المباشرة'
    };
  }

  if (normQuestion.startsWith('هل يقع طلاقي') || normQuestion.startsWith('هل طلاقي واقع')) {
    return {
      isPersonalFatwa: true,
      userGoal: 'استفتاء شخصي في مسألة طلاق تستوجب مراجعة المفتي لسماع الأطراف'
    };
  }

  return { isPersonalFatwa: false };
}

/**
 * Detects misconceptions and loaded false premises
 */
export function detectMisconception(rawQuestion, normQuestion) {
  const misconceptionPatterns = [
    {
      regex: /يعبد(ون)?.*الكعبه|عباده.*الكعبه|يسجد(ون)?.*(للحجر|للكعبه|للصنم)|سجود.*للحجر/i,
      topic: 'الكعبة المشرفة والتوحيد والقبلة',
      premise: 'افتراض أن المسلمين يعبدون الكعبة أو يتخذونها وثناً',
      userGoal: 'تصحيح الفهم الخاطئ وبيان التوحيد وأن الكعبة قبلة وليست معبوداً'
    },
    {
      regex: /(قران.*(تاليف|صنع|كتبه|الفه|الف|اقتبس|اقتبسه).*(محمد|الرسول|النبي))|((الف|كتب|صنع|تاليف).*(محمد|الرسول|النبي).*قران)|هل القران من (تاليف|صنع) محمد/i,
      topic: 'مصدر القرآن الكريم ونفي التأليف البشري',
      premise: 'زعم أن القرآن الكريم من تأليف النبي محمد ﷺ أو مقتبس من غيره',
      userGoal: 'بيان مصدر القرآن وأنه وحي رباني معجز ونفي التأليف البشري عنه'
    },
    {
      regex: /اسلام.*(ارهاب|قتل الابرياء|العنف العشوائي)|(احل|اباح).*الاسلام.*(الارهاب|القتل بغير حق|الرشوه)/i,
      topic: 'مقاصد الإسلام في حفظ النفس وحرمة الدماء والأموال',
      premise: 'الخلط والزعم بأن الإسلام يبيح الإرهاب أو قتل الأبرياء أو الرشوة',
      userGoal: 'بيان حرمة الدماء والأموال في الإسلام وتجريم العدوان والإرهاب والرشوة'
    },
    {
      regex: /اسلام.*(يكره|يعادي|يبغض).*(غير المسلمين|اهل الاديان|البشريه|الفرح)|يكره الاسلام الفرح/i,
      topic: 'معاملة غير المسلمين ومنهج الفطرة في الإسلام',
      premise: 'الافتراض بأن الإسلام يوجب كراهية غير المسلمين أو يحرم الفرح الفطري',
      userGoal: 'بيان البر والقسط مع غير المسلمين وسماحة الإسلام ودين الفطرة واليسر'
    },
    {
      regex: /يحرم.*الاسلام.*(العقل|التفكير|العلم|كل شيء|كل الفنون|الموسيقي والجمال)|يحتقر الاسلام.*(الثقافات|العلوم)/i,
      topic: 'منزلة العقل والتفكير والعلوم والفنون في الإسلام',
      premise: 'الزعم بأن الإسلام يعادي العقل أو يمنع التفكير والبحث العلمي أو يحرم كل الفنون والجمال',
      userGoal: 'بيان منهج الإسلام في تهذيب الفنون وإباحة الجمال المباح ودعوة القرآن للتفكر'
    },
    {
      regex: /يظلم.*الاسلام.*المراه|المراه.*مظلومه.*الاسلام|اهانه.*المراه|المراه في الميراث.*نصف الرجل/i,
      topic: 'مكانة المرأة وحقوقها في الإسلام',
      premise: 'افتراض أن الأحكام الشرعية تنتقص من كرامة المرأة أو تظلمها في الميراث',
      userGoal: 'إيضاح تكريم الإسلام للمرأة وبيان العدالة وتكامل الحقوق وحالات الميراث'
    },
    {
      regex: /النبي محمد هو اله المسلمين|محمد هو اله/i,
      topic: 'عقيدة التوحيد ورسالة النبي محمد ﷺ',
      premise: 'الظن بأن المسلمين يؤلهون النبي محمداً ﷺ',
      userGoal: 'تأصيل التوحيد وبيان أن النبي ﷺ عبد الله ورسوله'
    },
    {
      regex: /الاسلام يمنع.*التداوي|يوجب التواكل/i,
      topic: 'التداوي والأخذ بالأسباب في الإسلام',
      premise: 'الزعم بأن الإسلام يمنع من الطب أو يوجب التواكل المذموم',
      userGoal: 'بيان الأمر النبوي الصريح بالتداوي وتكامل الإيمان بالقدر مع السعي'
    },
    {
      regex: /اجبر.*الاسلام.*(الناس|الشعوب).*الدخول فيه|اجبر الناس في التاريخ/i,
      topic: 'حرية الاعتقاد ونفي الإكراه في الدين',
      premise: 'الزعم بأن الإسلام أجبر الشعوب على الدخول فيه تاريخياً',
      userGoal: 'تأصيل نفي الإكراه في الدين بنص القرآن والوقائع التاريخية الثابتة'
    },
    {
      regex: /يبيح الاسلام الكذب.*(للمصلحه الشخصيه|لمصلحته)/i,
      topic: 'حرمة الكذب وضوابط الضرورة في الإسلام',
      premise: 'الافتراض بأن الإسلام يبيح الكذب للمصالح الشخصية',
      userGoal: 'تأكيد تحريم الكذب أصلاً وأن الرخص محصورة في الإصلاح ودرء المفاسد دون أكل حق'
    },
    {
      regex: /اذا العلماء اختلفوا.*واحد منهم.*مخالف للدين/i,
      topic: 'أدب الاختلاف والاجتهاد الفقهي',
      premise: 'افتراض أن وقوع الخلاف الفقهي يعني لزوماً مخالفة أحدهم لأصل الدين',
      userGoal: 'بيان مشروعية الاختلاف السائغ في الفروع ورحمة الأمة بتعدد الأنظار الاجتهادية'
    },
    {
      regex: /يقاتل.*غير المسلمين لمجرد كفرهم|القتال لمجرد الكفر|قاتل لمجرد الكفر/i,
      topic: 'فقه الجهاد وعلة القتال في الإسلام',
      premise: 'افتراض أن النبي ﷺ كان يقاتل غير المسلمين لمجرد كفرهم',
      userGoal: 'بيان أن علة القتال في الإسلام هي دفع العدوان وحماية حرية الدعوة لا الإكراه على المعتقد'
    }
  ];

  for (const item of misconceptionPatterns) {
    if (item.regex.test(normQuestion)) {
      return {
        isMisconception: true,
        topic: item.topic,
        premise: item.premise,
        userGoal: item.userGoal
      };
    }
  }

  return { isMisconception: false };
}

/**
 * Detects Translation & Cross-Lingual Concept explanation
 */
export function detectTranslation(rawQuestion, normQuestion) {
  const isTranslation =
    normQuestion.includes('بالانجليزي') ||
    normQuestion.includes('باللغه الانجليزيه') ||
    normQuestion.includes('ترجمه') ||
    normQuestion.includes('ترجم') ||
    normQuestion.includes('how to say') ||
    normQuestion.includes('in english') ||
    normQuestion.includes('equivalent') ||
    normQuestion.includes('nuance') ||
    (normQuestion.includes('ما يقابل') && normQuestion.includes('انجليزي')) ||
    (normQuestion.includes('شخص اجنبي') && (normQuestion.includes('اشرح') || normQuestion.includes('ترجم')));

  if (isTranslation) {
    return {
      isTranslation: true,
      userGoal: 'فهم المفهوم الشرعي باللغة العربية أولاً ثم معرفة المقابل الإنجليزي الدقيق مع بيان الفروق الدلالية'
    };
  }

  return { isTranslation: false };
}

/**
 * Detects Hadith inquiry:
 * - Mentions hadith or prophetic statement AND seeks verification, grading, or source.
 */
export function detectHadithInquiry(rawQuestion, normQuestion) {
  const hasHadithSubject =
    normQuestion.includes('حديث') ||
    normQuestion.includes('قال الرسول') ||
    normQuestion.includes('قال النبي') ||
    normQuestion.includes('عن الرسول') ||
    normQuestion.includes('عن النبي') ||
    normQuestion.includes('روي البخاري') ||
    normQuestion.includes('رواه البخاري') ||
    normQuestion.includes('رواه مسلم') ||
    normQuestion.includes('روي مسلم');

  const hasVerificationIntent =
    normQuestion.includes('صحه') ||
    normQuestion.includes('صحيح') ||
    normQuestion.includes('اتاكد من صحته') ||
    normQuestion.includes('اتأكد من صحته') ||
    normQuestion.includes('هل صح') ||
    normQuestion.includes('هل ثبت') ||
    normQuestion.includes('هل ورد') ||
    normQuestion.includes('هل قال') ||
    normQuestion.includes('مكذوب') ||
    normQuestion.includes('موضوع') ||
    normQuestion.includes('ضعيف') ||
    normQuestion.includes('تخريج') ||
    normQuestion.includes('درجه') ||
    normQuestion.includes('ما نص') ||
    normQuestion.includes('اعطني حديث') ||
    normQuestion.includes('ابي حديث') ||
    normQuestion.includes('اريد حديث') ||
    normQuestion.includes('جيب لي حديث') ||
    normQuestion.includes('هل رواه البخاري') ||
    normQuestion.includes('هل رواه مسلم') ||
    normQuestion.includes('هل اخرجه') ||
    normQuestion.includes('هل هذا حديث');

  if (hasHadithSubject && (hasVerificationIntent || normQuestion.startsWith('هل رواه البخاري') || normQuestion.startsWith('هل رواه مسلم'))) {
    return true;
  }

  // Bare queries like "حديث صحيح"
  if (normQuestion.startsWith('حديث ') && normQuestion.split(' ').length <= 4) {
    return true;
  }

  return false;
}

/**
 * Detects Quran inquiries:
 * 1. CORRECT_QUOTE: Verifying orthography, wording, correction of quoted verse.
 * 2. VERIFY_QURAN: Verifying if a statement/text is actually a verse in the Quran.
 */
export function detectQuranInquiry(rawQuestion, normQuestion) {
  const hasQuranTerm =
    normQuestion.includes('ايه') ||
    normQuestion.includes('ايات') ||
    normQuestion.includes('قران') ||
    normQuestion.includes('سوره') ||
    normQuestion.includes('مصحف');

  // Correction triggers
  const correctionTriggers = [
    'هل نقلها مضبوط',
    'نقلها مضبوط',
    'هل كتابتها صحيحه',
    'هل نقلها صحيح',
    'هل الايه تقول',
    'هل القراءه صحيحه',
    'كيف تصحيحها',
    'ما نصها الصحيح',
    'بالنصب ام الرفع',
    'بالنصب صحيح',
    'بالرفع صحيح',
    'تصحيحها',
    'هل الايه صحيحه هكذا',
    'هل الايه مكتوبه صح',
    'مكتوبه صح كذا',
    'سمعت شخص يقول'
  ];

  if (correctionTriggers.some(t => normQuestion.includes(t)) || (hasQuranTerm && normQuestion.includes('بالنصب'))) {
    return { isQuran: true, isCorrectQuote: true };
  }

  // Verification triggers (checking whether text is a Quranic verse)
  const verificationTriggers = [
    'هل هذي ايه',
    'هل هذه ايه',
    'هل هي ايه',
    'هل هذي ايه فعلا',
    'هل هذه ايه فعلا',
    'هل في القران ايه تقول',
    'هل في القران ايه',
    'هل في القران',
    'هل هذا من القران',
    'هل وردت هذه الايه',
    'صحه الايه',
    'هل الايه صحيحه',
    'ايه قرانيه وما سورتها',
    'ذكر اسم النبي احمد صراحه',
    'هل ورد لفظ',
    'هل وردت قصه'
  ];

  if (verificationTriggers.some(t => normQuestion.includes(t)) || (hasQuranTerm && (normQuestion.includes('هل ورد') || normQuestion.includes('هل ذكر')))) {
    return { isQuran: true, isCorrectQuote: false };
  }

  return { isQuran: false, isCorrectQuote: false };
}

/**
 * Detects Consensus (Ijma) inquiries
 */
export function detectConsensusInquiry(rawQuestion, normQuestion) {
  if (normQuestion.includes('معني الاجماع') || normQuestion.includes('تعريف الاجماع')) {
    return false;
  }

  const consensusPatterns = [
    /كل (العلماء|الفقهاء) متفقين/,
    /متفقين كل (العلماء|الفقهاء)/,
    /جميع (العلماء|الفقهاء) متفقين/,
    /هل اجمع (العلماء|الفقهاء)/,
    /هل هناك اجماع/,
    /هل (العلماء|الفقهاء) متفقون/,
    /هل اتفق (الفقهاء|العلماء)/,
    /هل اجمع المسلمون/,
    /محل اتفاق/,
    /هل خالف احد/
  ];

  return consensusPatterns.some(ptrn => ptrn.test(normQuestion));
}

/**
 * Detects Historical claims
 */
export function detectHistoricalClaim(rawQuestion, normQuestion) {
  const historicalKeywords = [
    'انتشر الاسلام بالسيف',
    'انتشار الاسلام بالسيف',
    'بحد السيف',
    'يجبرون الشعوب علي الاسلام',
    'اجبار الشعوب',
    'بعد الفتوحات',
    'عين جالوت',
    'معركه عين جالوت',
    'حطين',
    'القادسيه',
    'اليرموك',
    'اول مسجد بني',
    'متي كانت غزوه',
    'متي وقعت غزوه',
    'متي وقعت معركه',
    'كيف فتحت',
    'من اول من اسلم',
    'من هو اول من اسلم',
    'في عهد اي خليفه',
    'تاريخ بناء',
    'حرق طارق بن زياد السفن',
    'صلح الحديبيه',
    'فتح مكه',
    'وفاه النبي',
    'الخلفاء الراشدين',
    'سيره النبي',
    'النسخه العثمانيه',
    'كتبت النسخه العثمانيه',
    'المصحف الامام',
    'شارك علي بن ابي طالب في كل الغزوات',
    'دخل الاسلام الي اندونيسيا',
    'فتح القسطنطينيه'
  ];

  return historicalKeywords.some(kw => normQuestion.includes(kw));
}

/**
 * Detects Comparison inquiries
 */
export function detectComparisonInquiry(rawQuestion, normQuestion) {
  const comparePhrases = [
    'ما الفرق بين',
    'وش الفرق بين',
    'ايش الفرق بين',
    'شو الفرق بين',
    'الفرق بين',
    'مقارنه بين',
    'ايهما افضل',
    'ايهما اعظم',
    'هل هناك فرق بين',
    'هل فيه فرق بين',
    'هل يوجد فرق بين',
    'هل فيه فرق فعلا بين',
    'وش الفروقات',
    'وجهان لعمله واحده',
    'تمايز فقهي'
  ];

  if (comparePhrases.some(phrase => normQuestion.includes(phrase))) {
    return true;
  }

  // Dual concept contrast: "هل فيه فرق ... ولا هم نفس الشي" or "بين X و Y ... فروقات"
  if (normQuestion.includes('فرق') && (normQuestion.includes('ولا هم نفس الشي') || normQuestion.includes('نفس الشيء') || normQuestion.includes('شيء واحد') || normQuestion.includes('بين'))) {
    return true;
  }

  return false;
}

/**
 * Detects WHY / Wisdom / Legislative Rationale inquiries
 */
export function detectWhyInquiry(rawQuestion, normQuestion) {
  // Guard: "ما حكمه شرعا" or bare "ما حكمه" (asking for ruling)
  if (/^ما حكمه(\s*شرعا|\s*في\s*الاسلام)?$/.test(normQuestion) || normQuestion.startsWith('ما حكمه شرعا')) {
    return false;
  }

  // Matches "ما حكمة كذا" / "ما الحكمة من كذا" / "حكمة تشريع كذا"
  if (
    normQuestion.startsWith('ما حكمه ') ||
    normQuestion.startsWith('ما الحكمه ') ||
    normQuestion.startsWith('ما الحكمه من ') ||
    normQuestion.startsWith('حكمه تشريع ')
  ) {
    return true;
  }

  const whyStartWords = ['لماذا', 'ليش', 'ليه', 'ما الحكمه', 'ما سبب', 'ما عله', 'لاي سبب'];
  return whyStartWords.some(w => {
    const regex = new RegExp(`(^|\\s)${w}(\\s|$)`);
    return regex.test(normQuestion);
  });
}

/**
 * Detects Definition inquiries
 */
export function detectDefinitionInquiry(rawQuestion, normQuestion) {
  if (
    normQuestion.includes('شروط') ||
    normQuestion.includes('اركان') ||
    normQuestion.includes('ما حكم') ||
    normQuestion.includes('ما فضل') ||
    normQuestion.includes('ما كفاره') ||
    normQuestion.includes('صلح الحديبيه') ||
    normQuestion.includes('غزوه')
  ) {
    return false;
  }

  const defPhrases = [
    'ما المقصود ب',
    'وش المقصود ب',
    'ايش المقصود ب',
    'شو المقصود ب',
    'المقصود ب',
    'ما المراد ب',
    'وش المراد ب',
    'ايش المراد ب',
    'المراد ب',
    'دلاله لفظ',
    'ما معني',
    'وش معني',
    'ايش معني',
    'شنو معني',
    'شو معني',
    'ما مفهوم',
    'وش مفهوم',
    'ايش مفهوم',
    'تعريف',
    'ما حقيقه',
    'وش يعني',
    'ايش يعني',
    'ماذا يعني',
    'وش تعني'
  ];

  if (defPhrases.some(phrase => normQuestion.includes(phrase))) {
    return true;
  }

  if (
    normQuestion.startsWith('ما هو ') ||
    normQuestion.startsWith('ما هي ') ||
    normQuestion.startsWith('وش هو ') ||
    normQuestion.startsWith('وش هي ')
  ) {
    return true;
  }

  return false;
}

/**
 * Detects Explain / How-to inquiries
 */
export function detectExplainInquiry(rawQuestion, normQuestion) {
  const explainStarts = ['كيف', 'شلون', 'اشرح لي', 'وضح لي', 'بين كيفيه', 'طريقه اداء', 'كيفيه'];
  return explainStarts.some(w => {
    const regex = new RegExp(`(^|\\s)${w}(\\s|$)`);
    return regex.test(normQuestion);
  });
}

/**
 * Detects general claim verification
 */
export function detectClaimVerification(rawQuestion, normQuestion) {
  const claimStarts = [
    'هل صحيح ان',
    'هل صدق ان',
    'هل يصح ان',
    'ما صحه القول بان',
    'ما صحه مقوله',
    'ما صحه',
    'هل صحيح',
    'هل صدق'
  ];

  if (claimStarts.some(w => {
    const regex = new RegExp(`(^|\\s)${w}(\\s|$)`);
    return regex.test(normQuestion);
  })) {
    return true;
  }

  const suffixTriggers = [
    /هل (هذا )?(ال)?كلام (هذا )?صحيح/,
    /هل هالكلام صحيح/,
    /هل هذا صحيح/,
    /صحيح هذا الكلام/,
    /ابي اتاكد من صحته/,
    /اريد التاكد من صحته/,
    /هل يصح هذا/,
    /هل يثبت هذا/,
    /قالوا\s*انه.*صدق/
  ];

  if (suffixTriggers.some(regex => regex.test(normQuestion))) {
    return true;
  }

  return false;
}

/**
 * Extracts Topic & Subtopics independently of task signals
 */
export function extractTopicAndSubtopics(rawQuestion, normQuestion) {
  const hasQuranExplicit = normQuestion.includes('ايه') || normQuestion.includes('ايات') || normQuestion.includes('قران') || normQuestion.includes('سوره') || normQuestion.includes('مصحف');
  const hasHadithExplicit = normQuestion.includes('حديث') || normQuestion.includes('سنه') || normQuestion.includes('اسناد') || normQuestion.includes('تخريج');
  const hasHistoryExplicit = normQuestion.includes('فتوحات') || normQuestion.includes('غزوه') || normQuestion.includes('معركه') || normQuestion.includes('تاريخ') || normQuestion.includes('خلفاء') || normQuestion.includes('عين جالوت');

  const topicMap = [
    { key: 'القرآن الكريم وعلومه', terms: ['قران', 'ايه', 'ايات', 'تفسير', 'سوره', 'مصحف', 'تلاوه', 'اعجاز'] },
    { key: 'الحديث والسنة النبوية', terms: ['حديث', 'سنه', 'نبي', 'رسول', 'بخاري', 'اسناد', 'تخريج'] },
    { key: 'العقيدة والإيمان', terms: ['ايمان', 'توحيد', 'اركان الايمان', 'شرك', 'غيب', 'ملائكه', 'يوم القيامه', 'قضاء', 'قدر', 'اسماء الله', 'صفات'] },
    { key: 'الفقه والعبادات', terms: ['صلاه', 'صلي', 'نصلي', 'صيام', 'نصوم', 'زكاه', 'حج', 'وضوء', 'طهاره', 'وتر', 'جماعه', 'رمضان', 'عمره', 'سجود السهو', 'فقه', 'فرض', 'واجب', 'حرام', 'حلال', 'مستحب', 'مكروه'] },
    { key: 'الأحوال الشخصية والأسرة', terms: ['زواج', 'نكاح', 'طلاق', 'عده', 'خلع', 'نفقه', 'حضانه', 'ميراث', 'تركه', 'عقد زواج', 'فسخ نكاح'] },
    { key: 'المعاملات المالية والأخلاق', terms: ['بيع', 'شراء', 'ربا', 'غش', 'صدق', 'كذب', 'وفاء بالعهد', 'امانه', 'خيانه', 'اخلاق', 'افشاء اسرار', 'غيبه', 'نميمه', 'شراكه', 'خساره'] },
    { key: 'السيرة والتاريخ الإسلامي', terms: ['تاريخ', 'غزوه', 'معركه', 'فتوحات', 'فتح', 'صحابه', 'مسجد قباء', 'هجره', 'خلفاء', 'عهد', 'عين جالوت'] },
    { key: 'المصطلحات الشرعية', terms: ['استدلال', 'اجتهاد', 'قياس', 'تقوي', 'احسان', 'توكل', 'تواكل', 'مفهوم', 'اصطلاح', 'استدراج', 'فسوق'] }
  ];

  let detectedTopic = 'معارف إسلامية عامة';
  const subtopics = [];

  if (hasQuranExplicit && !hasHadithExplicit) {
    detectedTopic = 'القرآن الكريم وعلومه';
  } else if (hasHistoryExplicit && !hasQuranExplicit && !hasHadithExplicit) {
    detectedTopic = 'السيرة والتاريخ الإسلامي';
  } else {
    for (const item of topicMap) {
      for (const term of item.terms) {
        if (normQuestion.includes(term)) {
          detectedTopic = item.key;
          if (!subtopics.includes(term)) {
            subtopics.push(term);
          }
        }
      }
    }
  }

  return { topic: detectedTopic, subtopics: subtopics.slice(0, 3) };
}

/**
 * Deterministic Semantic Fallback Interpreter
 * 
 * @param {string} originalQuestion
 * @returns {Object} Validated question understanding marked with interpretationMode = "FALLBACK"
 */
export function interpretQuestionDeterministic(originalQuestion) {
  if (!originalQuestion || typeof originalQuestion !== 'string' || originalQuestion.trim().length === 0) {
    return {
      originalQuestion: originalQuestion || '',
      normalizedQuestion: '',
      task: TASK_FAMILIES.GENERAL,
      topic: 'غير محدد',
      subtopics: [],
      userGoal: 'طلب استيضاح لغياب نص السؤال',
      claimsToResolve: [
        {
          claimId: 'claim-clarify-1',
          statement: 'طلب استيضاح وتحديد موضوع المسألة لتعذر الاستدلال مع غياب نص السؤال',
          importance: 'CORE',
          requiredEvidenceType: 'USER_CLARIFICATION'
        }
      ],
      requestedEvidence: [],
      isPersonalFatwa: false,
      needsClarification: true,
      clarificationReason: 'لم يتم إدخال نص للسؤال.',
      confidence: 0,
      interpretationMode: 'FALLBACK'
    };
  }

  const normalized = normalizeArabicText(originalQuestion);
  const ambiguity = detectAmbiguity(originalQuestion, normalized);
  const fatwa = detectPersonalFatwa(originalQuestion, normalized);
  const translation = detectTranslation(originalQuestion, normalized);
  const misconception = detectMisconception(originalQuestion, normalized);
  const quranInquiry = detectQuranInquiry(originalQuestion, normalized);
  const hadithInquiry = detectHadithInquiry(originalQuestion, normalized);
  const consensusInquiry = detectConsensusInquiry(originalQuestion, normalized);
  const historicalClaim = detectHistoricalClaim(originalQuestion, normalized);
  const compareInquiry = detectComparisonInquiry(originalQuestion, normalized);
  const whyInquiry = detectWhyInquiry(originalQuestion, normalized);
  const defInquiry = detectDefinitionInquiry(originalQuestion, normalized);
  const explainInquiry = detectExplainInquiry(originalQuestion, normalized);
  const claimVerification = detectClaimVerification(originalQuestion, normalized);

  const { topic, subtopics } = extractTopicAndSubtopics(originalQuestion, normalized);

  let task = TASK_FAMILIES.GENERAL;
  let userGoal = 'معرفة الحكم أو التوجيه الشرعي العام المؤصل بالدليل';
  let requestedEvidence = ['GENERAL_EVIDENCE'];
  let confidence = 0.75;

  // Multi-Signal Intent Resolution Hierarchy
  if (fatwa.isPersonalFatwa) {
    task = TASK_FAMILIES.PERSONAL_FATWA;
    userGoal = fatwa.userGoal || 'استفتاء شخصي خاص يتطلب الإحالة للجهات الإفتائية الرسمية';
    requestedEvidence = ['FATWA_AUTHORITY_REFERRAL'];
    confidence = 0.95;
  } else if (misconception.isMisconception) {
    task = TASK_FAMILIES.MISCONCEPTION;
    userGoal = misconception.userGoal;
    requestedEvidence = ['DIRECT_TEXT', 'REFUTATION_EVIDENCE'];
    confidence = 0.93;
  } else if (translation.isTranslation) {
    task = TASK_FAMILIES.TRANSLATE_CONCEPT;
    userGoal = translation.userGoal;
    requestedEvidence = ['TERMINOLOGY_DICTIONARY', 'CONCEPTUAL_EXPLANATION'];
    confidence = 0.95;
  } else if (quranInquiry.isQuran) {
    task = quranInquiry.isCorrectQuote ? TASK_FAMILIES.CORRECT_QUOTE : TASK_FAMILIES.VERIFY_QURAN;
    userGoal = quranInquiry.isCorrectQuote
      ? 'التحقق من صحة كتابة أو ضبط الآية القرآنية وتصحيح ما وقع فيها من لحن أو نقل خاطئ'
      : 'التحقق من صحة نسبة النص إلى القرآن الكريم وضبط ألفاظه وسورته';
    requestedEvidence = ['QURAN_CANONICAL_TEXT', 'TAFSEER'];
    confidence = 0.94;
  } else if (hadithInquiry) {
    task = TASK_FAMILIES.VERIFY_HADITH;
    userGoal = 'تخريج الحديث والتحقق من سنده وثبوته في كتب الحديث المعتمدة';
    requestedEvidence = ['HADITH_AUTHENTICITY', 'ISNAD_STATUS'];
    confidence = 0.92;
  } else if (defInquiry) {
    task = TASK_FAMILIES.DEFINE;
    userGoal = 'بيان التعريف اللغوي والشرعي الاصطلاحي للمفهوم بدقة وتأصيل';
    requestedEvidence = ['SCHOLARLY_DEFINITION', 'DICTIONARY'];
    confidence = 0.91;
  } else if (consensusInquiry) {
    task = TASK_FAMILIES.VERIFY_CONSENSUS;
    userGoal = 'التحقق من وجود إجماع فقهي وتمييزه عن مسائل الخلاف والاجتهاد';
    requestedEvidence = ['SCHOLARLY_CONSENSUS_IJMA'];
    confidence = 0.92;
  } else if (historicalClaim) {
    task = TASK_FAMILIES.HISTORICAL_CLAIM;
    userGoal = 'توثيق الرواية التاريخية الإسلامية بالوقائع الثابتة والمصادر المعتمدة';
    requestedEvidence = ['HISTORICAL_SOURCES', 'SEERAH'];
    confidence = 0.90;
  } else if (compareInquiry) {
    task = TASK_FAMILIES.COMPARE;
    userGoal = 'بيان الفروق الجوهرية والتمايز المفاهيمي بين المسائل أو المصطلحات المقارنة';
    requestedEvidence = ['SCHOLARLY_COMPARISON'];
    confidence = 0.92;
  } else if (whyInquiry) {
    task = TASK_FAMILIES.WHY;
    userGoal = 'بيان حكمة وعلة التشريع ومقاصد الشريعة الإسلامية في الحكم أو المنع';
    requestedEvidence = ['WISDOM_RATIONALE', 'MAQASID_SHARIAH'];
    confidence = 0.91;
  } else if (explainInquiry) {
    task = TASK_FAMILIES.EXPLAIN;
    userGoal = 'شرح الكيفية والصفة الشرعية للأمر أو العبادة بوضوح وتفصيل';
    requestedEvidence = ['EXPLANATORY_EVIDENCE'];
    confidence = 0.89;
  } else if (claimVerification) {
    task = TASK_FAMILIES.VERIFY_CLAIM;
    userGoal = 'فحص صحة الدعوى والتحقق من ثبوتها الشرعي أو بطلانها';
    requestedEvidence = ['AUTHENTIC_VERIFICATION'];
    confidence = 0.88;
  } else {
    task = TASK_FAMILIES.GENERAL;
    userGoal = 'معرفة الحكم أو التوجيه الشرعي العام المؤصل بالدليل';
    requestedEvidence = ['GENERAL_EVIDENCE'];
    confidence = 0.75;
  }

  if (ambiguity.needsClarification) {
    confidence = 0.90;
  }

  const rawClaims = planClaimsForQuestion({
    originalQuestion,
    normalizedQuestion: normalized,
    task,
    topic: misconception.isMisconception ? misconception.topic : topic,
    userGoal,
    isPersonalFatwa: fatwa.isPersonalFatwa,
    needsClarification: ambiguity.needsClarification,
    clarificationReason: ambiguity.clarificationReason
  });

  const claimsToResolve = decomposeCompoundClaims(rawClaims, {
    originalQuestion,
    normalizedQuestion: normalized,
    task,
    topic: misconception.isMisconception ? misconception.topic : topic
  });

  return {
    originalQuestion,
    normalizedQuestion: normalized,
    task,
    topic: misconception.isMisconception ? misconception.topic : topic,
    subtopics,
    userGoal,
    claimsToResolve,
    requestedEvidence,
    isPersonalFatwa: fatwa.isPersonalFatwa,
    needsClarification: ambiguity.needsClarification,
    clarificationReason: ambiguity.clarificationReason,
    confidence,
    interpretationMode: 'FALLBACK'
  };
}

/**
 * Primary Asynchronous Question Interpreter Pipeline:
 * Question -> AI Semantic Interpreter -> Schema Validator -> Claim Planning -> Result
 * If AI is offline/unconfigured -> Deterministic Fallback
 * 
 * @param {string} originalQuestion
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function processQuestionInterpretationAsync(originalQuestion, options = {}) {
  // If AI is configured and not explicitly disabled
  if (isGeminiConfigured() && options.forceFallback !== true) {
    const aiResult = await callGeminiQuestionInterpreter(originalQuestion, options);
    if (aiResult.success && aiResult.data) {
      // Re-plan / enrich claims using ClaimPlanner if claims were sparse, then decompose
      const rawClaims = aiResult.data.claimsToResolve && aiResult.data.claimsToResolve.length > 0
        ? aiResult.data.claimsToResolve
        : planClaimsForQuestion({
            originalQuestion,
            normalizedQuestion: aiResult.data.normalizedQuestion,
            task: aiResult.data.task,
            topic: aiResult.data.topic,
            userGoal: aiResult.data.userGoal,
            isPersonalFatwa: aiResult.data.isPersonalFatwa,
            needsClarification: aiResult.data.needsClarification,
            clarificationReason: aiResult.data.clarificationReason
          });

      const claims = decomposeCompoundClaims(rawClaims, {
        originalQuestion,
        normalizedQuestion: aiResult.data.normalizedQuestion,
        task: aiResult.data.task,
        topic: aiResult.data.topic
      });

      return {
        ...aiResult.data,
        claimsToResolve: claims,
        interpretationMode: 'AI'
      };
    }
  }

  // Fallback if AI not configured, errored, or forced
  aiDiagnostics.fallbackUsages++;
  return interpretQuestionDeterministic(originalQuestion);
}

/**
 * Synchronous Question Interpreter function (for tests, dev scripts, and components)
 * 
 * @param {string} originalQuestion
 * @returns {Object}
 */
export function processQuestionInterpretation(originalQuestion) {
  return interpretQuestionDeterministic(originalQuestion);
}

export default processQuestionInterpretation;
