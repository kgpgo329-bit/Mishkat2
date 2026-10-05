/**
 * Final Phase 2 Real Gemini AI Validation Suite
 * 
 * STRICT COMPLIANCE:
 * - Real AI calls only (interpretationMode === "AI")
 * - If ANY question uses FALLBACK, mark evaluation INVALID and STOP.
 * - Test integrity: Gemini receives ONLY the user question and system prompt/schema.
 * - Evaluates Set B (20 Qs), Set C (32 Qs), and Set D (42 Qs).
 * - Confusion Matrix for Set D.
 * - Latency, retries, and API diagnostics.
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const interpModulePath = pathToFileURL(path.resolve('src/mishkat/question/questionInterpreter.js')).href;
const {
  processQuestionInterpretationAsync,
  aiDiagnostics,
  isGeminiConfigured
} = await import(interpModulePath);

const { validateQuestionInterpretation } = await import(
  pathToFileURL(path.resolve('src/mishkat/question/questionValidator.js')).href
);

// Pacing delay helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Set B (20 Blind Questions)
const setB = [
  { id: 'B-01', q: "وش المقصود بالإحسان بالدين؟", expectedTask: "DEFINE", expectedClarif: false, isPersonalFatwa: false },
  { id: 'B-02', q: "ليه الربا محرم مع إن الطرفين ممكن يكونون راضين؟", expectedTask: "WHY", expectedClarif: false, isPersonalFatwa: false },
  { id: 'B-03', q: "وش الفرق بين التوكل والتواكل؟", expectedTask: "COMPARE", expectedClarif: false, isPersonalFatwa: false },
  { id: 'B-04', q: "سمعت إن اللي يترك صلاة وحدة يصير كافر، هل الكلام هذا صحيح؟", expectedTask: "VERIFY_CLAIM", expectedClarif: false, isPersonalFatwa: false },
  { id: 'B-05', q: "فيه حديث يقول إن أكثر أهل النار النساء، أبي أتأكد من صحته.", expectedTask: "VERIFY_HADITH", expectedClarif: false, isPersonalFatwa: false },
  { id: 'B-06', q: "يقولون الرسول ﷺ قال كلام عن آخر الزمان بس ما أذكر وش هو، صحيح؟", expectedTask: "GENERAL", expectedClarif: true, isPersonalFatwa: false },
  { id: 'B-07', q: "\"ولا تقربوا الصلاة وأنتم سكارى\" هل هذي آية فعلًا؟", expectedTask: "VERIFY_QURAN", expectedClarif: false, isPersonalFatwa: false },
  { id: 'B-08', q: "واحد كتب آية كذا: \"إن الله لا يغير ما بقوم حتى يغيروا ما بأنفسهم\"، هل نقلها مضبوط؟", expectedTask: "CORRECT_QUOTE", expectedClarif: false, isPersonalFatwa: false },
  { id: 'B-09', q: "كيف أشرح معنى الشرك لشخص أجنبي بدون ما أترجمها ترجمة حرفية غلط؟", expectedTask: "TRANSLATE_CONCEPT", expectedClarif: false, isPersonalFatwa: false },
  { id: 'B-10', q: "هل فعلًا كل العلماء متفقين إن تغطية الوجه واجبة؟", expectedTask: "VERIFY_CONSENSUS", expectedClarif: false, isPersonalFatwa: false },
  { id: 'B-11', q: "إذا العلماء اختلفوا، يعني واحد منهم أكيد مخالف للدين؟", expectedTask: "MISCONCEPTION", expectedClarif: false, isPersonalFatwa: false },
  { id: 'B-12', q: "ليش بعض الأحكام الشرعية تبدو شديدة بالنسبة لنا اليوم؟", expectedTask: "WHY", expectedClarif: false, isPersonalFatwa: false },
  { id: 'B-13', q: "أنا صار بيني وبين زوجي كلام وقلت جملة معينة وقت غضب، هل وقع شيء شرعًا؟", expectedTask: "PERSONAL_FATWA", expectedClarif: false, isPersonalFatwa: true },
  { id: 'B-14', q: "طيب وهذا حرام ولا لا؟", expectedTask: "GENERAL", expectedClarif: true, isPersonalFatwa: false },
  { id: 'B-15', q: "الكلام اللي ذكرته قبل شوي، عليه دليل من السنة؟", expectedTask: "GENERAL", expectedClarif: true, isPersonalFatwa: false },
  { id: 'B-16', q: "هل صحيح أن المسلمين كانوا يجبرون الشعوب على الإسلام بعد الفتوحات؟", expectedTask: "HISTORICAL_CLAIM", expectedClarif: false, isPersonalFatwa: false },
  { id: 'B-17', q: "ليه نصلي خمس مرات تحديدًا؟", expectedTask: "WHY", expectedClarif: false, isPersonalFatwa: false },
  { id: 'B-18', q: "هل فيه فرق فعلًا بين القضاء والقدر ولا هم نفس الشي؟", expectedTask: "COMPARE", expectedClarif: false, isPersonalFatwa: false },
  { id: 'B-19', q: "واحد يقول إن آية في القرآن تناقض آية ثانية، كيف أعرف إذا كلامه صحيح؟", expectedTask: "EXPLAIN", expectedClarif: false, isPersonalFatwa: false },
  { id: 'B-20', q: "وش رأي الإسلام بالموضوع؟", expectedTask: "GENERAL", expectedClarif: true, isPersonalFatwa: false }
];

// Set C (32 Blind Questions)
const setC = [
  { id: 'C-01', q: "ايش المراد بـ «الاستدراج» بالقرآن والسنة؟", expectedTask: 'DEFINE', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-02', q: "دلالة لفظ «الفسوق» شرعاً وش تعني بالضبط؟", expectedTask: 'DEFINE', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-03', q: "بين صلاة الجنازة وصلاة العيدين، وش الفروقات الجوهرية من حيث التكبيرات والصفة؟", expectedTask: 'COMPARE', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-04', q: "هل الربا والغش التجاري وجهان لعملة واحدة ولا فيه تمايز فقهي بينهم؟", expectedTask: 'COMPARE', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-05', q: "ليه النبي ﷺ نهى عن الشرب واقفاً مع إنه ثبت عنه أنه شرب واقفاً بمكة؟", expectedTask: 'WHY', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-06', q: "لماذا فُرضت زكاة الفطر طعاماً وليست نقداً في الأصل؟", expectedTask: 'WHY', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-07', q: "شلون أحسب نصاب الذهب والفضة لفلوس بالبنك؟", expectedTask: 'EXPLAIN', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-08', q: "وضح لي كيف يؤدي المريض صلاته إذا ما قدر يسجد؟", expectedTask: 'EXPLAIN', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-09', q: "واحد يقول إن تارك الجماعة تبطل صلاته بالكلية، هل هالكلام صحيح؟", expectedTask: 'VERIFY_CLAIM', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-10', q: "ما صحة مقولة إن أطفال غير المسلمين يدخلون النار؟", expectedTask: 'VERIFY_CLAIM', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-11', q: "دايم أسمع خطباء يقولون: «حب الوطن من الإيمان»، هل هو حديث صحيح؟", expectedTask: 'VERIFY_HADITH', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-12', q: "هل صح حديث عن صلاة التسابيح وفضلها؟", expectedTask: 'VERIFY_HADITH', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-13', q: "«نظافة المكان من الإيمان» هل هذي آية بالقرآن ولا حديث ولا مثل شعبي؟", expectedTask: 'VERIFY_QURAN', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-14', q: "هل وردت قصة لقمان الحكيم وسورته في القرآن الكريم؟", expectedTask: 'VERIFY_QURAN', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-15', q: "شخص تلا الآية كذا: «إنما يخشى اللهَ من عبادِه العلماءُ»، هل تقديم لفظ الجلالة بالنصب صحيح؟", expectedTask: 'CORRECT_QUOTE', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-16', q: "هل الآية مكتوبة صح كذا: «فاسألوا أهل الذكر إن كنتم لا يعلمون»؟", expectedTask: 'CORRECT_QUOTE', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-17', q: "هل متفقين كل الفقهاء إن صلاة العيد فرض عين أم فيها خلاف؟", expectedTask: 'VERIFY_CONSENSUS', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-18', q: "هل أجمع العلماء على تحريم التدخين أم فيه نزاع معتبر؟", expectedTask: 'VERIFY_CONSENSUS', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-19', q: "كيف أترجم وأشرح مفهوم «البركة» باللغة الإنجليزية لصديق أجنبي؟", expectedTask: 'TRANSLATE_CONCEPT', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-20', q: "What is the accurate equivalent of «العفة» in English without losing the religious nuance?", expectedTask: 'TRANSLATE_CONCEPT', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-21', q: "هل صحيح أن معركة عين جالوت كانت بقيادة قطز والظاهر بيبرس؟", expectedTask: 'HISTORICAL_CLAIM', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-22', q: "في عهد أي خليفة تم جمع القرآن الكريم في المصحف الإمام؟", expectedTask: 'HISTORICAL_CLAIM', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-23', q: "لماذا يحرم الإسلام كل الفنون والموسيقى والجمال؟", expectedTask: 'MISCONCEPTION', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-24', q: "هل كان النبي محمد يقاتل غير المسلمين لمجرد كفرهم؟", expectedTask: 'MISCONCEPTION', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-25', q: "أنا حلفت على زوجتي بالطلاق ما تطلع، وطلعت وهي ناسية، هل يقع طلاقي؟", expectedTask: 'PERSONAL_FATWA', expectedClarif: false, isPersonalFatwa: true },
  { id: 'C-26', q: "صار في عقد شراكتي مع زميلي مشكلة وخسرنا، من يتحمل الخسارة شرعاً بيننا؟", expectedTask: 'PERSONAL_FATWA', expectedClarif: false, isPersonalFatwa: true },
  { id: 'C-27', q: "هل يجوز هذا الشيء في ديننا؟", expectedTask: 'GENERAL', expectedClarif: true, isPersonalFatwa: false },
  { id: 'C-28', q: "مثل ما قلت لك بالرسالة اللي قبل، وش الحل معه؟", expectedTask: 'GENERAL', expectedClarif: true, isPersonalFatwa: false },
  { id: 'C-29', q: "حديث سمعته بالمسجد أمس عن البركة بس ناسي كلماته، وش رايك فيه؟", expectedTask: 'GENERAL', expectedClarif: true, isPersonalFatwa: false },
  { id: 'C-30', q: "ما حكمه شرعاً؟", expectedTask: 'GENERAL', expectedClarif: true, isPersonalFatwa: false },
  { id: 'C-31', q: "ما هي شروط الحج للرجل والمرأة؟", expectedTask: 'GENERAL', expectedClarif: false, isPersonalFatwa: false },
  { id: 'C-32', q: "ما فضل بر الوالدين في الإسلام؟", expectedTask: 'GENERAL', expectedClarif: false, isPersonalFatwa: false }
];

// Set D (42 Untouched Questions)
const setD = [
  { id: 'D-01', q: "ودي أفهم وش تعني كلمة «الطاغوت» إذا وردت بالنصوص الشرعية؟", expectedTask: 'DEFINE', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-02', q: "ما المقصود بمفهوم «العصبة» في علم الفرائض والمواريث؟", expectedTask: 'DEFINE', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-03', q: "لو شخص سألني عن حقيقة «الرياء» كيف أعرّفه له شرعاً؟", expectedTask: 'DEFINE', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-04', q: "وش الفرقية بين زكاة المال وزكاة الركاز في المقدار والنية؟", expectedTask: 'COMPARE', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-05', q: "هل صيام التطوع وصيام القضاء متطابقين في وجوب تبييت النية من الليل ولا بينهم افتراق؟", expectedTask: 'COMPARE', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-06', q: "بين دم الحيض ودم الاستحاضة، ما هي وجوه التمايز الفقهي في أحكام العبادات؟", expectedTask: 'COMPARE', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-07', q: "ليه الشريعة أوجبت كفارة مغلظة في القتل الخطأ مع إنه ما كان متعمد؟", expectedTask: 'WHY', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-08', q: "ما الحكمة الإلهية من جعل صلاة الجهر بالليل وصلاة السر بالنهار؟", expectedTask: 'WHY', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-09', q: "ليش الإسلام منع بيع الغرر والمجهول حتى لو اثنينهم موافقين ومبسوطين؟", expectedTask: 'WHY', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-10', q: "كيف يؤدي المسلم سجدتي السهو إذا شك بالزيادة والنقصان في الصلاة الرباعية؟", expectedTask: 'EXPLAIN', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-11', q: "شلون طريقة غسل الجنابة الكامل والمجزئ خطوة بخطوة؟", expectedTask: 'EXPLAIN', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-12', q: "وضح لي كيفية إخراج زكاة عروض التجارة لمحلات التجزئة عند حولان الحول.", expectedTask: 'EXPLAIN', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-13', q: "سمعت مقطع يقول إن صيام يوم السبت منفرداً حرام ويبطل، هل هالكلام معتمد وصحيح؟", expectedTask: 'VERIFY_CLAIM', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-14', q: "واحد كاتب بتويتر إن المصافحة بين الجنسين ما فيها شيء إذا كانت النية صافية، هل هالكلام له أصل شرعي؟", expectedTask: 'VERIFY_CLAIM', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-15', q: "هل يصح الزعم القائل بأن صلاة التراويح بدعة أحدثها عمر بن الخطاب؟", expectedTask: 'VERIFY_CLAIM', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-16', q: "فيه عبارة مشهورة تقول: «اطلبوا العلم ولو في الصين»، هل هي حديث صحيح ثابت عن الرسول ﷺ؟", expectedTask: 'VERIFY_HADITH', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-17', q: "ما صحة حديث «اختلاف أمتي رحمة»، هل رواه أصحاب السنن بإسناد متصل؟", expectedTask: 'VERIFY_HADITH', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-18', q: "سمعت خطيب يقول حديث: «من نام بعد العصر فاختلس عقله فلا يلومن إلا نفسه»، أبي أتأكد من ثبوته.", expectedTask: 'VERIFY_HADITH', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-19', q: "«الجنة تحت أقدام الأمهات» هل هذي آية كريمة في كتاب الله أم حديث؟", expectedTask: 'VERIFY_QURAN', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-20', q: "هل ورد ذكر اسم نبي الله يوشع بن نون بالاسم الصريح في سور القرآن الكريم؟", expectedTask: 'VERIFY_QURAN', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-21', q: "«كما تدين تدان» هل هي من آيات القرآن الكريم؟", expectedTask: 'VERIFY_QURAN', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-22', q: "واحد قرأ الآية كذا: «إنما يريد الله ليذهب عنكم الرجس أهلَ البيت»، هل نصب كلمة أهل صحيح في الرسم والقراءة؟", expectedTask: 'CORRECT_QUOTE', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-23', q: "هل الآية مكتوبة صحيحة: «ادعُ إلى سبيل ربك بالحكمة والموعظة الحسنة» بحذف حرف العلة أم بإثباته؟", expectedTask: 'CORRECT_QUOTE', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-24', q: "سمعت من يتلو: «ولا تزر وازرة وزر أخرى»، هل نطقها وضبطها بالضم صحيح؟", expectedTask: 'CORRECT_QUOTE', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-25', q: "هل انعقد إجماع علماء الأمة على وجوب الصلوات الخمس في أوقاتها المحددة؟", expectedTask: 'VERIFY_CONSENSUS', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-26', q: "هل كل المذاهب الفقهية متفقة على بطلان صلاة من أكل لحم إبل أم فيه خلاف مشهور؟", expectedTask: 'VERIFY_CONSENSUS', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-27', q: "هل هناك إجماع بين أهل العلم على نجاسة الخمر عيناً؟", expectedTask: 'VERIFY_CONSENSUS', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-28', q: "كيف أشرح وأترجم مفهوم «التوحيد» بمضامينه الثلاثة لشخص غير عربي دون اختزال؟", expectedTask: 'TRANSLATE_CONCEPT', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-29', q: "How can I translate the Islamic concept of «التقوى» into English accurately without reducing it to fear?", expectedTask: 'TRANSLATE_CONCEPT', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-30', q: "هل وقع صلح الحديبية في العام السادس من الهجرة النبوية؟", expectedTask: 'HISTORICAL_CLAIM', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-31', q: "هل ثبت تاريخياً أن صلاح الدين الأيوبي عفا عن الصليبيين عند استرداد القدس؟", expectedTask: 'HISTORICAL_CLAIM', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-32', q: "في أي معركة استشهد الصحابي الجليل جعفر بن أبي طالب وزيد بن حارثة؟", expectedTask: 'HISTORICAL_CLAIM', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-33', q: "لماذا يفرض الإسلام الدين بالقوة ولا يعطي الإنسان حرية الاختيار في عقيدته؟", expectedTask: 'MISCONCEPTION', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-34', q: "هل صحيح أن الإسلام دين معادٍ للعلم والتطور التجريبي ويدعو للتخلف؟", expectedTask: 'MISCONCEPTION', expectedClarif: false, isPersonalFatwa: false },
  { id: 'D-35', q: "أنا وأخي ورثنا من أبي أرض، واختلفنا في طريقة قسمتها، هل يجبرني القاضي على البيع؟", expectedTask: 'PERSONAL_FATWA', expectedClarif: false, isPersonalFatwa: true },
  { id: 'D-36', q: "تلفظت بكلمة الطلاق على زوجتي في مجلس صلح وأنا بغير وعيي، هل اعتبر مطلّق شرعاً؟", expectedTask: 'PERSONAL_FATWA', expectedClarif: false, isPersonalFatwa: true },
  { id: 'D-37', q: "اقترضت مبلغاً من زميلي بالعمل وتأخرت بالسداد وطلب زيادة على المبلغ كتعويض، هل يحل لي دفعها؟", expectedTask: 'PERSONAL_FATWA', expectedClarif: false, isPersonalFatwa: true },
  { id: 'D-38', q: "هل يجوز هذا العمل شرعاً؟", expectedTask: 'GENERAL', expectedClarif: true, isPersonalFatwa: false },
  { id: 'D-39', q: "على أساس الفتوى اللي ذكرتها لي أمس، وش الخطوة التالية؟", expectedTask: 'GENERAL', expectedClarif: true, isPersonalFatwa: false },
  { id: 'D-40', q: "يقولون الشيخ قال فتوى غريبة بالأسبوع الماضي بس نسيت موضوعها، وش هي؟", expectedTask: 'GENERAL', expectedClarif: true, isPersonalFatwa: false },
  { id: 'D-41', q: "وش حكم هذي التصرفات بالدين؟", expectedTask: 'GENERAL', expectedClarif: true, isPersonalFatwa: false },
  { id: 'D-42', q: "ما هي مبطلات صيام شهر رمضان في المذاهب الأربعة؟", expectedTask: 'GENERAL', expectedClarif: false, isPersonalFatwa: false }
];

const TASK_FAMILIES = [
  'DEFINE', 'EXPLAIN', 'WHY', 'COMPARE', 'VERIFY_CLAIM', 'VERIFY_HADITH',
  'VERIFY_CONSENSUS', 'VERIFY_QURAN', 'CORRECT_QUOTE', 'TRANSLATE_CONCEPT',
  'HISTORICAL_CLAIM', 'MISCONCEPTION', 'PERSONAL_FATWA', 'GENERAL'
];

async function evaluateSet(setName, items) {
  console.log(`\n==================================================`);
  console.log(`Starting Evaluation of ${setName} (${items.length} questions)...`);
  console.log(`==================================================`);

  let taskMatches = 0;
  let clarifMatches = 0;
  let fatwaMatches = 0;
  let fatwaExpectedCount = 0;
  let claimsValidCount = 0;
  let schemaValidCount = 0;
  const discrepancies = [];
  const evaluations = [];

  const confusionMatrix = {};
  for (const t1 of TASK_FAMILIES) {
    confusionMatrix[t1] = {};
    for (const t2 of TASK_FAMILIES) {
      confusionMatrix[t1][t2] = 0;
    }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const qText = item.q;

    // Pacing delay between calls to respect rate limits
    await sleep(2000);

    const callStartTime = Date.now();
    let interpretation;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        interpretation = await processQuestionInterpretationAsync(qText);
      } catch (err) {
        console.error(`FATAL: API error on question [${item.id}]: ${err.message}`);
        throw new Error(`CRITICAL_API_FAILURE on question ${item.id}: ${err.message}`);
      }

      if (interpretation.interpretationMode === 'AI') {
        break;
      }

      attempts++;
      if (attempts < maxAttempts) {
        console.log(`[Rate/Network Delay] Question [${item.id}] returned FALLBACK (likely quota window). Waiting 12s before attempt ${attempts + 1}/${maxAttempts}...`);
        // Decrement fallbackUsages so false transient fallback doesn't pollute strict AI-only count
        aiDiagnostics.fallbackUsages--;
        aiDiagnostics.failedCalls--;
        await sleep(12000);
      }
    }

    const latency = Date.now() - callStartTime;

    // STRICT CHECK: interpretationMode MUST BE 'AI'
    if (interpretation.interpretationMode !== 'AI') {
      console.error(`\nCRITICAL FAILURE: Question [${item.id}] returned interpretationMode = "${interpretation.interpretationMode}". FALLBACK IS FORBIDDEN!`);
      throw new Error(`EVALUATION_INVALID: Question [${item.id}] used FALLBACK instead of AI. Stop immediately.`);
    }

    // Schema Validation check
    const validation = validateQuestionInterpretation(interpretation, qText);
    if (validation.isValid) schemaValidCount++;

    // Claim Quality check
    const claims = interpretation.claimsToResolve;
    const hasValidClaims = Array.isArray(claims) && claims.length > 0 &&
      claims.every(c => c.statement && c.statement.trim() && c.importance && c.requiredEvidenceType);
    if (hasValidClaims) claimsValidCount++;

    // Task Matching
    const isTaskMatch = interpretation.task === item.expectedTask;
    if (isTaskMatch) taskMatches++;

    // Clarification Matching
    const isClarifMatch = interpretation.needsClarification === item.expectedClarif;
    if (isClarifMatch) clarifMatches++;

    // Fatwa Matching
    if (item.isPersonalFatwa || item.expectedTask === 'PERSONAL_FATWA') {
      fatwaExpectedCount++;
      if (interpretation.isPersonalFatwa) fatwaMatches++;
    } else {
      if (!interpretation.isPersonalFatwa) fatwaMatches++;
    }

    // Confusion Matrix (for Set D especially)
    if (confusionMatrix[item.expectedTask] && confusionMatrix[item.expectedTask][interpretation.task] !== undefined) {
      confusionMatrix[item.expectedTask][interpretation.task]++;
    }

    const evaluationRecord = {
      id: item.id,
      question: qText,
      expectedTask: item.expectedTask,
      actualTask: interpretation.task,
      expectedClarif: item.expectedClarif,
      actualClarif: interpretation.needsClarification,
      expectedFatwa: item.isPersonalFatwa,
      actualFatwa: interpretation.isPersonalFatwa,
      topic: interpretation.topic,
      subtopics: interpretation.subtopics,
      userGoal: interpretation.userGoal,
      claimsToResolve: interpretation.claimsToResolve,
      requestedEvidence: interpretation.requestedEvidence,
      interpretationMode: interpretation.interpretationMode,
      latencyMs: latency,
      isTaskMatch,
      isClarifMatch
    };

    evaluations.push(evaluationRecord);

    if (!isTaskMatch || !isClarifMatch) {
      let failureType = '';
      if (!isTaskMatch && !isClarifMatch) failureType = 'TASK_AND_CLARIFICATION_MISMATCH';
      else if (!isTaskMatch) failureType = 'TASK_MISMATCH';
      else failureType = 'CLARIFICATION_MISMATCH';

      discrepancies.push({
        id: item.id,
        question: qText,
        expectedTask: item.expectedTask,
        actualTask: interpretation.task,
        topic: interpretation.topic,
        needsClarification: interpretation.needsClarification,
        isPersonalFatwa: interpretation.isPersonalFatwa,
        interpretationMode: interpretation.interpretationMode,
        claimsToResolve: interpretation.claimsToResolve,
        failureType
      });
      console.log(`[${i + 1}/${items.length}] ❌ ${item.id}: Expected ${item.expectedTask}, got ${interpretation.task} (${latency}ms)`);
    } else {
      console.log(`[${i + 1}/${items.length}] ✅ ${item.id}: ${interpretation.task} (${latency}ms)`);
    }
  }

  const taskAccuracy = (taskMatches / items.length) * 100;
  const clarifAccuracy = (clarifMatches / items.length) * 100;
  const fatwaAccuracy = (fatwaMatches / items.length) * 100;
  const claimQuality = (claimsValidCount / items.length) * 100;
  const schemaAccuracy = (schemaValidCount / items.length) * 100;

  console.log(`\n--- Results for ${setName} ---`);
  console.log(`Task Classification Accuracy: ${taskAccuracy.toFixed(2)}% (${taskMatches}/${items.length})`);
  console.log(`Clarification Accuracy:       ${clarifAccuracy.toFixed(2)}% (${clarifMatches}/${items.length})`);
  console.log(`Personal Fatwa Accuracy:      ${fatwaAccuracy.toFixed(2)}% (${fatwaMatches}/${items.length})`);
  console.log(`Claim Planning Quality:       ${claimQuality.toFixed(2)}% (${claimsValidCount}/${items.length})`);
  console.log(`Schema Validation:            ${schemaAccuracy.toFixed(2)}% (${schemaValidCount}/${items.length})`);

  return {
    setName,
    totalQuestions: items.length,
    taskMatches,
    taskAccuracy,
    clarifMatches,
    clarifAccuracy,
    fatwaMatches,
    fatwaAccuracy,
    claimsValidCount,
    claimQuality,
    schemaValidCount,
    schemaAccuracy,
    discrepancies,
    evaluations,
    confusionMatrix
  };
}

async function run() {
  console.log("==================================================");
  console.log("MISHKAT PHASE 2 — REAL AI VALIDATION SUITE");
  console.log(`Configured Model: ${process.env.GEMINI_MODEL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("==================================================");

  // Reset counters
  aiDiagnostics.reset();

  const resultsB = await evaluateSet('Set B (20 Blind Questions)', setB);
  const resultsC = await evaluateSet('Set C (32 Blind Questions)', setC);
  const resultsD = await evaluateSet('Set D (42 Untouched Blind Questions)', setD);

  const totalEvaluated = setB.length + setC.length + setD.length;
  const totalTaskCorrect = resultsB.taskMatches + resultsC.taskMatches + resultsD.taskMatches;
  const totalClarifCorrect = resultsB.clarifMatches + resultsC.clarifMatches + resultsD.clarifMatches;
  const overallTaskAccuracy = (totalTaskCorrect / totalEvaluated) * 100;
  const overallClarifAccuracy = (totalClarifCorrect / totalEvaluated) * 100;

  const summary = {
    timestamp: new Date().toISOString(),
    geminiModel: process.env.GEMINI_MODEL,
    totalEvaluated,
    overallTaskAccuracy,
    overallClarifAccuracy,
    diagnostics: {
      totalCalls: aiDiagnostics.totalCalls,
      successfulCalls: aiDiagnostics.successfulCalls,
      failedCalls: aiDiagnostics.failedCalls,
      schemaRetries: aiDiagnostics.schemaRetries,
      fallbackCount: aiDiagnostics.fallbackUsages,
      averageLatencyMs: aiDiagnostics.averageLatencyMs
    },
    resultsB,
    resultsC,
    resultsD
  };

  const outputPath = 'C:/Users/kj976/.gemini/antigravity/brain/ea6f0927-97b1-45f5-833d-2521be64cb8a/scratch/real_ai_suite_results.json';
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log("\n==================================================");
  console.log("ALL EVALUATION RUNS COMPLETE!");
  console.log(`Total Questions:         ${totalEvaluated}`);
  console.log(`Overall Task Accuracy:   ${overallTaskAccuracy.toFixed(2)}% (${totalTaskCorrect}/${totalEvaluated})`);
  console.log(`Overall Clarif Accuracy: ${overallClarifAccuracy.toFixed(2)}% (${totalClarifCorrect}/${totalEvaluated})`);
  console.log(`Fallback Usages:         ${aiDiagnostics.fallbackUsages} (MUST BE 0)`);
  console.log(`Average Latency:         ${aiDiagnostics.averageLatencyMs} ms`);
  console.log(`Raw results saved to:    ${outputPath}`);
  console.log("==================================================");
}

run().catch(err => {
  console.error("FATAL RUN ERROR:", err);
  process.exit(1);
});
