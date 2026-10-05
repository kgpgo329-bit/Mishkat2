/**
 * Comprehensive Evaluation Suite for Mishkat Phase 2 Question Understanding
 * 
 * Executes:
 * A) Original 169 Development Questions
 * B) Previous 20 Blind Questions
 * C) Previous 32 Untouched Blind Questions
 * D) NEW Third Blind Set (42 unseen questions)
 * 
 * Generates separate independent reports for each set with confusion matrix and failure diagnostics.
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const interpModulePath = pathToFileURL(path.resolve('src/mishkat/question/questionInterpreter.js')).href;
const {
  processQuestionInterpretation,
  processQuestionInterpretationAsync,
  aiDiagnostics,
  isGeminiConfigured
} = await import(interpModulePath);

// 1. Load Set A (Development Set)
const devDatasetPath = path.resolve('tests/datasets/question-understanding-development.json');
const devDataset = JSON.parse(fs.readFileSync(devDatasetPath, 'utf8'));

// 2. Define Set B (Previous 20 Blind Questions)
const previous20BlindSet = [
  { q: "وش المقصود بالإحسان بالدين؟", expectedTask: "DEFINE", expectedClarif: false },
  { q: "ليه الربا محرم مع إن الطرفين ممكن يكونون راضين؟", expectedTask: "WHY", expectedClarif: false },
  { q: "وش الفرق بين التوكل والتواكل؟", expectedTask: "COMPARE", expectedClarif: false },
  { q: "سمعت إن اللي يترك صلاة وحدة يصير كافر، هل الكلام هذا صحيح؟", expectedTask: "VERIFY_CLAIM", expectedClarif: false },
  { q: "فيه حديث يقول إن أكثر أهل النار النساء، أبي أتأكد من صحته.", expectedTask: "VERIFY_HADITH", expectedClarif: false },
  { q: "يقولون الرسول ﷺ قال كلام عن آخر الزمان بس ما أذكر وش هو، صحيح؟", expectedTask: "GENERAL", expectedClarif: true },
  { q: "\"ولا تقربوا الصلاة وأنتم سكارى\" هل هذي آية فعلًا؟", expectedTask: "VERIFY_QURAN", expectedClarif: false },
  { q: "واحد كتب آية كذا: \"إن الله لا يغير ما بقوم حتى يغيروا ما بأنفسهم\"، هل نقلها مضبوط؟", expectedTask: "CORRECT_QUOTE", expectedClarif: false },
  { q: "كيف أشرح معنى الشرك لشخص أجنبي بدون ما أترجمها ترجمة حرفية غلط؟", expectedTask: "TRANSLATE_CONCEPT", expectedClarif: false },
  { q: "هل فعلًا كل العلماء متفقين إن تغطية الوجه واجبة؟", expectedTask: "VERIFY_CONSENSUS", expectedClarif: false },
  { q: "إذا العلماء اختلفوا، يعني واحد منهم أكيد مخالف للدين؟", expectedTask: "MISCONCEPTION", expectedClarif: false },
  { q: "ليش بعض الأحكام الشرعية تبدو شديدة بالنسبة لنا اليوم؟", expectedTask: "WHY", expectedClarif: false },
  { q: "أنا صار بيني وبين زوجي كلام وقلت جملة معينة وقت غضب، هل وقع شيء شرعًا؟", expectedTask: "PERSONAL_FATWA", expectedClarif: false },
  { q: "طيب وهذا حرام ولا لا؟", expectedTask: "GENERAL", expectedClarif: true },
  { q: "الكلام اللي ذكرته قبل شوي، عليه دليل من السنة؟", expectedTask: "GENERAL", expectedClarif: true },
  { q: "هل صحيح أن المسلمين كانوا يجبرون الشعوب على الإسلام بعد الفتوحات؟", expectedTask: "HISTORICAL_CLAIM", expectedClarif: false },
  { q: "ليه نصلي خمس مرات تحديدًا؟", expectedTask: "WHY", expectedClarif: false },
  { q: "هل فيه فرق فعلًا بين القضاء والقدر ولا هم نفس الشي؟", expectedTask: "COMPARE", expectedClarif: false },
  { q: "واحد يقول إن آية في القرآن تناقض آية ثانية، كيف أعرف إذا كلامه صحيح؟", expectedTask: "EXPLAIN", expectedClarif: false },
  { q: "وش رأي الإسلام بالموضوع؟", expectedTask: "GENERAL", expectedClarif: true }
];

// 3. Define Set C (Second 32 Blind Questions)
const second32BlindSet = [
  { id: 'B2-01', q: "ايش المراد بـ «الاستدراج» بالقرآن والسنة؟", expectedTask: 'DEFINE', expectedClarif: false },
  { id: 'B2-02', q: "دلالة لفظ «الفسوق» شرعاً وش تعني بالضبط؟", expectedTask: 'DEFINE', expectedClarif: false },
  { id: 'B2-03', q: "بين صلاة الجنازة وصلاة العيدين، وش الفروقات الجوهرية من حيث التكبيرات والصفة؟", expectedTask: 'COMPARE', expectedClarif: false },
  { id: 'B2-04', q: "هل الربا والغش التجاري وجهان لعملة واحدة ولا فيه تمايز فقهي بينهم؟", expectedTask: 'COMPARE', expectedClarif: false },
  { id: 'B2-05', q: "ليه النبي ﷺ نهى عن الشرب واقفاً مع إنه ثبت عنه أنه شرب واقفاً بمكة؟", expectedTask: 'WHY', expectedClarif: false },
  { id: 'B2-06', q: "لماذا فُرضت زكاة الفطر طعاماً وليست نقداً في الأصل؟", expectedTask: 'WHY', expectedClarif: false },
  { id: 'B2-07', q: "شلون أحسب نصاب الذهب والفضة لفلوس بالبنك؟", expectedTask: 'EXPLAIN', expectedClarif: false },
  { id: 'B2-08', q: "وضح لي كيف يؤدي المريض صلاته إذا ما قدر يسجد؟", expectedTask: 'EXPLAIN', expectedClarif: false },
  { id: 'B2-09', q: "واحد يقول إن تارك الجماعة تبطل صلاته بالكلية، هل هالكلام صحيح؟", expectedTask: 'VERIFY_CLAIM', expectedClarif: false },
  { id: 'B2-10', q: "ما صحة مقولة إن أطفال غير المسلمين يدخلون النار؟", expectedTask: 'VERIFY_CLAIM', expectedClarif: false },
  { id: 'B2-11', q: "دايم أسمع خطباء يقولون: «حب الوطن من الإيمان»، هل هو حديث صحيح؟", expectedTask: 'VERIFY_HADITH', expectedClarif: false },
  { id: 'B2-12', q: "هل صح حديث عن صلاة التسابيح وفضلها؟", expectedTask: 'VERIFY_HADITH', expectedClarif: false },
  { id: 'B2-13', q: "«نظافة المكان من الإيمان» هل هذي آية بالقرآن ولا حديث ولا مثل شعبي؟", expectedTask: 'VERIFY_QURAN', expectedClarif: false },
  { id: 'B2-14', q: "هل وردت قصة لقمان الحكيم وسورته في القرآن الكريم؟", expectedTask: 'VERIFY_QURAN', expectedClarif: false },
  { id: 'B2-15', q: "شخص تلا الآية كذا: «إنما يخشى اللهَ من عبادِه العلماءُ»، هل تقديم لفظ الجلالة بالنصب صحيح؟", expectedTask: 'CORRECT_QUOTE', expectedClarif: false },
  { id: 'B2-16', q: "هل الآية مكتوبة صح كذا: «فاسألوا أهل الذكر إن كنتم لا يعلمون»؟", expectedTask: 'CORRECT_QUOTE', expectedClarif: false },
  { id: 'B2-17', q: "هل متفقين كل الفقهاء إن صلاة العيد فرض عين أم فيها خلاف؟", expectedTask: 'VERIFY_CONSENSUS', expectedClarif: false },
  { id: 'B2-18', q: "هل أجمع العلماء على تحريم التدخين أم فيه نزاع معتبر؟", expectedTask: 'VERIFY_CONSENSUS', expectedClarif: false },
  { id: 'B2-19', q: "كيف أترجم وأشرح مفهوم «البركة» باللغة الإنجليزية لصديق أجنبي؟", expectedTask: 'TRANSLATE_CONCEPT', expectedClarif: false },
  { id: 'B2-20', q: "What is the accurate equivalent of «العفة» in English without losing the religious nuance?", expectedTask: 'TRANSLATE_CONCEPT', expectedClarif: false },
  { id: 'B2-21', q: "هل صحيح أن معركة عين جالوت كانت بقيادة قطز والظاهر بيبرس؟", expectedTask: 'HISTORICAL_CLAIM', expectedClarif: false },
  { id: 'B2-22', q: "في عهد أي خليفة تم جمع القرآن الكريم في المصحف الإمام؟", expectedTask: 'HISTORICAL_CLAIM', expectedClarif: false },
  { id: 'B2-23', q: "لماذا يحرم الإسلام كل الفنون والموسيقى والجمال؟", expectedTask: 'MISCONCEPTION', expectedClarif: false },
  { id: 'B2-24', q: "هل كان النبي محمد يقاتل غير المسلمين لمجرد كفرهم؟", expectedTask: 'MISCONCEPTION', expectedClarif: false },
  { id: 'B2-25', q: "أنا حلفت على زوجتي بالطلاق ما تطلع، وطلعت وهي ناسية، هل يقع طلاقي؟", expectedTask: 'PERSONAL_FATWA', expectedClarif: false },
  { id: 'B2-26', q: "صار في عقد شراكتي مع زميلي مشكلة وخسرنا، من يتحمل الخسارة شرعاً بيننا؟", expectedTask: 'PERSONAL_FATWA', expectedClarif: false },
  { id: 'B2-27', q: "هل يجوز هذا الشيء في ديننا؟", expectedTask: 'GENERAL', expectedClarif: true },
  { id: 'B2-28', q: "مثل ما قلت لك بالرسالة اللي قبل، وش الحل معه؟", expectedTask: 'GENERAL', expectedClarif: true },
  { id: 'B2-29', q: "حديث سمعته بالمسجد أمس عن البركة بس ناسي كلماته، وش رايك فيه؟", expectedTask: 'GENERAL', expectedClarif: true },
  { id: 'B2-30', q: "ما حكمه شرعاً؟", expectedTask: 'GENERAL', expectedClarif: true },
  { id: 'B2-31', q: "ما هي شروط الحج للرجل والمرأة؟", expectedTask: 'GENERAL', expectedClarif: false },
  { id: 'B2-32', q: "ما فضل بر الوالدين في الإسلام؟", expectedTask: 'GENERAL', expectedClarif: false }
];

// 4. Define Set D (THIRD NEW Untouched Blind Set — 42 Questions)
const third42BlindSet = [
  { id: 'D-01', q: "ودي أفهم وش تعني كلمة «الطاغوت» إذا وردت بالنصوص الشرعية؟", expectedTask: 'DEFINE', expectedClarif: false, notes: 'سؤال تعريفي بلهجة سعودية' },
  { id: 'D-02', q: "ما المقصود بمفهوم «العصبة» في علم الفرائض والمواريث؟", expectedTask: 'DEFINE', expectedClarif: false, notes: 'سؤال مصطلح فرضي تخصصي' },
  { id: 'D-03', q: "لو شخص سألني عن حقيقة «الرياء» كيف أعرّفه له شرعاً؟", expectedTask: 'DEFINE', expectedClarif: false, notes: 'سؤال تعريفي بصيغة افتراضية غير مباشرة' },

  { id: 'D-04', q: "وش الفرقية بين زكاة المال وزكاة الركاز في المقدار والنية؟", expectedTask: 'COMPARE', expectedClarif: false, notes: 'مقارنة مالية بلفظ الفرقية العامي' },
  { id: 'D-05', q: "هل صيام التطوع وصيام القضاء متطابقين في وجوب تبييت النية من الليل ولا بينهم افتراق؟", expectedTask: 'COMPARE', expectedClarif: false, notes: 'مقارنة وتمايز في شروط النية' },
  { id: 'D-06', q: "بين دم الحيض ودم الاستحاضة، ما هي وجوه التمايز الفقهي في أحكام العبادات؟", expectedTask: 'COMPARE', expectedClarif: false, notes: 'مقارنة فقهية بتركيب مقلوب' },

  { id: 'D-07', q: "ليه الشريعة أوجبت كفارة مغلظة في القتل الخطأ مع إنه ما كان متعمد؟", expectedTask: 'WHY', expectedClarif: false, notes: 'سؤال عن حكمة تشريع الكفارة' },
  { id: 'D-08', q: "ما الحكمة الإلهية من جعل صلاة الجهر بالليل وصلاة السر بالنهار؟", expectedTask: 'WHY', expectedClarif: false, notes: 'سؤال تعليل تعبدي' },
  { id: 'D-09', q: "ليش الإسلام منع بيع الغرر والمجهول حتى لو اثنينهم موافقين ومبسوطين؟", expectedTask: 'WHY', expectedClarif: false, notes: 'سؤال علة ومقاصد الشريعة المالية' },

  { id: 'D-10', q: "كيف يؤدي المسلم سجدتي السهو إذا شك بالزيادة والنقصان في الصلاة الرباعية؟", expectedTask: 'EXPLAIN', expectedClarif: false, notes: 'شرح كيفية سجود السهو' },
  { id: 'D-11', q: "شلون طريقة غسل الجنابة الكامل والمجزئ خطوة بخطوة؟", expectedTask: 'EXPLAIN', expectedClarif: false, notes: 'شرح كيفية الطهارة بلهجة عامية' },
  { id: 'D-12', q: "وضح لي كيفية إخراج زكاة عروض التجارة لمحلات التجزئة عند حولان الحول.", expectedTask: 'EXPLAIN', expectedClarif: false, notes: 'شرح حساب زكاة عروض التجارة' },

  { id: 'D-13', q: "سمعت مقطع يقول إن صيام يوم السبت منفرداً حرام ويبطل، هل هالكلام معتمد وصحيح؟", expectedTask: 'VERIFY_CLAIM', expectedClarif: false, notes: 'تحقق من دعوى فقهية شائعة' },
  { id: 'D-14', q: "واحد كاتب بتويتر إن المصافحة بين الجنسين ما فيها شيء إذا كانت النية صافية، هل هالكلام له أصل شرعي؟", expectedTask: 'VERIFY_CLAIM', expectedClarif: false, notes: 'تحقق من دعوى معاصرة' },
  { id: 'D-15', q: "هل يصح الزعم القائل بأن صلاة التراويح بدعة أحدثها عمر بن الخطاب؟", expectedTask: 'VERIFY_CLAIM', expectedClarif: false, notes: 'تحقق من مقولة تاريخية فقهية' },

  { id: 'D-16', q: "فيه عبارة مشهورة تقول: «اطلبوا العلم ولو في الصين»، هل هي حديث صحيح ثابت عن الرسول ﷺ؟", expectedTask: 'VERIFY_HADITH', expectedClarif: false, notes: 'تخريج وتحقق من مروية مشهورة' },
  { id: 'D-17', q: "ما صحة حديث «اختلاف أمتي رحمة»، هل رواه أصحاب السنن بإسناد متصل؟", expectedTask: 'VERIFY_HADITH', expectedClarif: false, notes: 'فحص إسناد حديث مشهور' },
  { id: 'D-18', q: "سمعت خطيب يقول حديث: «من نام بعد العصر فاختلس عقله فلا يلومن إلا نفسه»، أبي أتأكد من ثبوته.", expectedTask: 'VERIFY_HADITH', expectedClarif: false, notes: 'تحقق من ثبوت حديث' },

  { id: 'D-19', q: "«الجنة تحت أقدام الأمهات» هل هذي آية كريمة في كتاب الله أم حديث؟", expectedTask: 'VERIFY_QURAN', expectedClarif: false, notes: 'تمييز النص القرآني عن غيره' },
  { id: 'D-20', q: "هل ورد ذكر اسم نبي الله يوشع بن نون بالاسم الصريح في سور القرآن الكريم؟", expectedTask: 'VERIFY_QURAN', expectedClarif: false, notes: 'تحقق من ورود اسم في القرآن' },
  { id: 'D-21', q: "«كما تدين تدان» هل هي من آيات القرآن الكريم؟", expectedTask: 'VERIFY_QURAN', expectedClarif: false, notes: 'تحقق من قرآنية مثل سائر' },

  { id: 'D-22', q: "واحد قرأ الآية كذا: «إنما يريد الله ليذهب عنكم الرجس أهلَ البيت»، هل نصب كلمة أهل صحيح في الرسم والقراءة؟", expectedTask: 'CORRECT_QUOTE', expectedClarif: false, notes: 'تحقق من إعراب وضبط آية' },
  { id: 'D-23', q: "هل الآية مكتوبة صحيحة: «ادعُ إلى سبيل ربك بالحكمة والموعظة الحسنة» بحذف حرف العلة أم بإثباته؟", expectedTask: 'CORRECT_QUOTE', expectedClarif: false, notes: 'تحقق من رسم كلمة بالآية' },
  { id: 'D-24', q: "سمعت من يتلو: «ولا تزر وازرة وزر أخرى»، هل نطقها وضبطها بالضم صحيح؟", expectedTask: 'CORRECT_QUOTE', expectedClarif: false, notes: 'تحقق من ضبط لفظ قرآني' },

  { id: 'D-25', q: "هل انعقد إجماع علماء الأمة على وجوب الصلوات الخمس في أوقاتها المحددة؟", expectedTask: 'VERIFY_CONSENSUS', expectedClarif: false, notes: 'سؤال عن ثبوت الإجماع' },
  { id: 'D-26', q: "هل كل المذاهب الفقهية متفقة على بطلان صلاة من أكل لحم إبل أم فيه خلاف مشهور؟", expectedTask: 'VERIFY_CONSENSUS', expectedClarif: false, notes: 'فحص اتفاق المذاهب ووجود الخلاف' },
  { id: 'D-27', q: "هل هناك إجماع بين أهل العلم على نجاسة الخمر عيناً؟", expectedTask: 'VERIFY_CONSENSUS', expectedClarif: false, notes: 'تحقق من دعوى الإجماع الفقهي' },

  { id: 'D-28', q: "كيف أشرح وأترجم مفهوم «التوحيد» بمضامينه الثلاثة لشخص غير عربي دون اختزال؟", expectedTask: 'TRANSLATE_CONCEPT', expectedClarif: false, notes: 'ترجمة وشرح مفهوم التوحيد' },
  { id: 'D-29', q: "How can I translate the Islamic concept of «التقوى» into English accurately without reducing it to fear?", expectedTask: 'TRANSLATE_CONCEPT', expectedClarif: false, notes: 'سؤال بالإنجليزية عن ترجمة التقوى' },

  { id: 'D-30', q: "هل وقع صلح الحديبية في العام السادس من الهجرة النبوية؟", expectedTask: 'HISTORICAL_CLAIM', expectedClarif: false, notes: 'توثيق تاريخ صلح الحديبية' },
  { id: 'D-31', q: "هل ثبت تاريخياً أن صلاح الدين الأيوبي عفا عن الصليبيين عند استرداد القدس؟", expectedTask: 'HISTORICAL_CLAIM', expectedClarif: false, notes: 'توثيق واقعة تاريخية إسلامية' },
  { id: 'D-32', q: "في أي معركة استشهد الصحابي الجليل جعفر بن أبي طالب وزيد بن حارثة؟", expectedTask: 'HISTORICAL_CLAIM', expectedClarif: false, notes: 'سؤال تاريخي عن معركة مؤتة' },

  { id: 'D-33', q: "لماذا يفرض الإسلام الدين بالقوة ولا يعطي الإنسان حرية الاختيار في عقيدته؟", expectedTask: 'MISCONCEPTION', expectedClarif: false, notes: 'شبهة الافتراض بأن الإسلام يفرض بالقوة' },
  { id: 'D-34', q: "هل صحيح أن الإسلام دين معادٍ للعلم والتطور التجريبي ويدعو للتخلف؟", expectedTask: 'MISCONCEPTION', expectedClarif: false, notes: 'شبهة عداء الإسلام للعلوم' },

  { id: 'D-35', q: "أنا وأخي ورثنا من أبي أرض، واختلفنا في طريقة قسمتها، هل يجبرني القاضي على البيع؟", expectedTask: 'PERSONAL_FATWA', expectedClarif: false, notes: 'استفتاء نزاع تركة وقسمة إجبار' },
  { id: 'D-36', q: "تلفظت بكلمة الطلاق على زوجتي في مجلس صلح وأنا بغير وعيي، هل اعتبر مطلّق شرعاً؟", expectedTask: 'PERSONAL_FATWA', expectedClarif: false, notes: 'استفتاء طلاق في حالة غضب/إغلاق' },
  { id: 'D-37', q: "اقترضت مبلغاً من زميلي بالعمل وتأخرت بالسداد وطلب زيادة على المبلغ كتعويض، هل يحل لي دفعها؟", expectedTask: 'PERSONAL_FATWA', expectedClarif: false, notes: 'استفتاء مالي شخصي في ربا الديون' },

  { id: 'D-38', q: "هل يجوز هذا العمل شرعاً؟", expectedTask: 'GENERAL', expectedClarif: true, notes: 'ضمير مبهم («هذا العمل») دون ذكر ماهيته' },
  { id: 'D-39', q: "على أساس الفتوى اللي ذكرتها لي أمس، وش الخطوة التالية؟", expectedTask: 'GENERAL', expectedClarif: true, notes: 'إحالة لمحادثة سابقة غير موجودة بالسياق' },
  { id: 'D-40', q: "يقولون الشيخ قال فتوى غريبة بالأسبوع الماضي بس نسيت موضوعها، وش هي؟", expectedTask: 'GENERAL', expectedClarif: true, notes: 'نسيان المسألة المستفتى عنها' },
  { id: 'D-41', q: "وش حكم هذي التصرفات بالدين؟", expectedTask: 'GENERAL', expectedClarif: true, notes: 'اسم إشارة لغائب مبهم («هذي التصرفات»)' },

  { id: 'D-42', q: "ما هي مبطلات صيام شهر رمضان في المذاهب الأربعة؟", expectedTask: 'GENERAL', expectedClarif: false, notes: 'سؤال فقهي عام عن المفطرات' }
];

// Helper to evaluate a dataset
async function evaluateDataset(datasetName, items, isAsync = false) {
  let taskCorrect = 0;
  let clarifCorrect = 0;
  let fatwaCorrect = 0;
  let fatwaExpectedTotal = 0;
  let claimsValidTotal = 0;
  const discrepancies = [];

  const taskList = [
    'DEFINE', 'EXPLAIN', 'WHY', 'COMPARE', 'VERIFY_CLAIM', 'VERIFY_HADITH',
    'VERIFY_CONSENSUS', 'VERIFY_QURAN', 'CORRECT_QUOTE', 'TRANSLATE_CONCEPT',
    'HISTORICAL_CLAIM', 'MISCONCEPTION', 'PERSONAL_FATWA', 'GENERAL'
  ];

  const confusionMatrix = {};
  taskList.forEach(t1 => {
    confusionMatrix[t1] = {};
    taskList.forEach(t2 => {
      confusionMatrix[t1][t2] = 0;
    });
  });

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const qText = item.question || item.q;
    const expectedTask = item.expectedTaskFamily || item.expectedTask;
    const expectedClarif = item.expectedClarif !== undefined
      ? item.expectedClarif
      : Boolean(item.notes?.includes('استيضاح') || item.notes?.includes('مبهم') || item.notes?.includes('مجردتان') || item.expectedBehavior?.includes('طلب استيضاح'));

    const result = isAsync
      ? await processQuestionInterpretationAsync(qText)
      : processQuestionInterpretation(qText);

    const taskMatch = result.task === expectedTask;
    const clarifMatch = result.needsClarification === expectedClarif;

    if (taskMatch) taskCorrect++;
    else {
      discrepancies.push({
        index: i + 1,
        id: item.id || `Q-${i + 1}`,
        question: qText,
        expectedTask,
        predictedTask: result.task,
        expectedClarif,
        predictedClarif: result.needsClarification,
        notes: item.notes || ''
      });
    }

    if (clarifMatch) clarifCorrect++;

    if (expectedTask === 'PERSONAL_FATWA') {
      fatwaExpectedTotal++;
      if (result.isPersonalFatwa) fatwaCorrect++;
    }

    const claims = result.claimsToResolve;
    const hasValidClaims = claims && claims.length > 0 && claims.every(c => c.statement && c.importance && c.requiredEvidenceType);
    if (hasValidClaims) claimsValidTotal++;

    if (confusionMatrix[expectedTask] && confusionMatrix[expectedTask][result.task] !== undefined) {
      confusionMatrix[expectedTask][result.task]++;
    }
  }

  return {
    name: datasetName,
    total: items.length,
    taskCorrect,
    taskAccuracy: (taskCorrect / items.length) * 100,
    clarifCorrect,
    clarifAccuracy: (clarifCorrect / items.length) * 100,
    fatwaCorrect,
    fatwaExpectedTotal,
    fatwaAccuracy: fatwaExpectedTotal > 0 ? (fatwaCorrect / fatwaExpectedTotal) * 100 : 100,
    claimsValidTotal,
    claimQuality: (claimsValidTotal / items.length) * 100,
    discrepancies,
    confusionMatrix
  };
}

console.log('Starting full 4-set validation benchmark...\n');

const resA = await evaluateDataset('Development Set (169 Qs)', devDataset);
console.log(`[A] Dev Set Complete: Task Accuracy = ${resA.taskAccuracy.toFixed(2)}% (${resA.taskCorrect}/${resA.total})`);

const resB = await evaluateDataset('Previous 20 Blind Questions', previous20BlindSet);
console.log(`[B] Previous 20 Blind Set Complete: Task Accuracy = ${resB.taskAccuracy.toFixed(2)}% (${resB.taskCorrect}/${resB.total})`);

const resC = await evaluateDataset('Second 32 Blind Set', second32BlindSet);
console.log(`[C] Second 32 Blind Set Complete: Task Accuracy = ${resC.taskAccuracy.toFixed(2)}% (${resC.taskCorrect}/${resC.total})`);

const resD = await evaluateDataset('Third NEW Untouched 42 Blind Set', third42BlindSet);
console.log(`[D] Third 42 Blind Set Complete: Task Accuracy = ${resD.taskAccuracy.toFixed(2)}% (${resD.taskCorrect}/${resD.total})`);

const outputSummary = {
  timestamp: new Date().toISOString(),
  geminiConfigured: isGeminiConfigured(),
  aiDiagnostics: {
    totalCalls: aiDiagnostics.totalCalls,
    successfulCalls: aiDiagnostics.successfulCalls,
    failedCalls: aiDiagnostics.failedCalls,
    schemaRetries: aiDiagnostics.schemaRetries,
    fallbackUsages: aiDiagnostics.fallbackUsages,
    averageLatencyMs: aiDiagnostics.averageLatencyMs
  },
  results: {
    setA: resA,
    setB: resB,
    setC: resC,
    setD: resD
  }
};

fs.writeFileSync(
  'C:\\Users\\kj976\\.gemini\\antigravity\\brain\\ea6f0927-97b1-45f5-833d-2521be64cb8a\\scratch\\all_evaluations_summary.json',
  JSON.stringify(outputSummary, null, 2),
  'utf8'
);

console.log('\nEvaluation successfully written to scratch/all_evaluations_summary.json');
