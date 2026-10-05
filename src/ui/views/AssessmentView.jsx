import React, { useState } from 'react';
import { Award, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';

export default function AssessmentView({
  questions = [],
  assessmentId = null,
  onSubmitAssessment,
  onCancel,
  isSubmitting = false
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});

  // Fallback assessment questions if none provided
  const defaultQuestions = [
    {
      assessmentItemId: 'q-1',
      question: 'أي مما يلي يصف بدقة مصدر القرآن الكريم وفق العقيدة الإسلامية الصحيحة؟',
      concept: 'مصدر القرآن الكريم ونفي التأليف البشري',
      options: [
        { optionId: 'opt-a', text: 'هو كلام الله تعالى المُنزل على رسوله ﷺ بلفظه ومعناه بواسطة جبريل عليه السلام.' },
        { optionId: 'opt-b', text: 'هو تأليف النبي محمد ﷺ استلهمه من الكتب والشرائع السابقة في جزيرة العرب.' },
        { optionId: 'opt-c', text: 'هو وحي بالمعنى فقط وصاغه النبي ﷺ بألفاظه وأسلوبه الأدبي.' },
        { optionId: 'opt-d', text: 'هو كتاب تاريخي يحكي أحداث القرون الماضية دون تشريع ديني ملزم.' }
      ]
    },
    {
      assessmentItemId: 'q-2',
      question: 'ما هو الأصل في اختلاف الفقهاء في بعض المسائل الفرعية الاجتهادية؟',
      concept: 'أسباب اختلاف الفقهاء ومشروعية الاجتهاد',
      options: [
        { optionId: 'opt-a', text: 'سعة مدارك الفهم، واختلاف دلالات الألفاظ، وتفاوت بلوغ النصوص مع اتفاقهم على تعظيم الوحي.' },
        { optionId: 'opt-b', text: 'تعارض وتناقض حقيقي في نصوص القرآن الكريم والسنة النبوية الصحيحة.' },
        { optionId: 'opt-c', text: 'انقسام مقصود بين المدارس الفقهية لإلغاء العمل ببعض الأحكام الشرعية.' },
        { optionId: 'opt-d', text: 'الاعتماد على الآراء العقلية المجردة دون الرجوع إلى الأدلة النقلية.' }
      ]
    },
    {
      assessmentItemId: 'q-3',
      question: 'عند وجود دعوى تزعم وجود حديث نبوي غير معروف، ما هو الموقف المنهجي الصحيح لمشكاة؟',
      concept: 'توثيق الحديث النبوي والتحقق من صحة الإسناد',
      options: [
        { optionId: 'opt-a', text: 'الامتناع الصادق والتوقف المنهجي (INSUFFICIENT) دون اختلاق نص أو نسبته للنبي ﷺ.' },
        { optionId: 'opt-b', text: 'توليد صياغة مشابهة من ذاكرة الذكاء الاصطناعي مع تقدير المعنى العام.' },
        { optionId: 'opt-c', text: 'قبول أي لفظ مادام يوافق المعاني الأخلاقية العامة دون حاجة لمصدر معتمد.' },
        { optionId: 'opt-d', text: 'استبدال الحديث المزعوم بآية قرآنية تشبهه في اللفظ دون إشارة للمستخدم.' }
      ]
    },
    {
      assessmentItemId: 'q-4',
      question: 'ما الفرق الجوهري بين التوكل الشرعي والتواكل المذموم؟',
      concept: 'التوكل والأخذ بالأسباب',
      options: [
        { optionId: 'opt-a', text: 'التوكل يجمع بين صدق اعتماد القلب على الله مع بذل الأسباب المشروعة، بينما التواكل ترك للأسباب.' },
        { optionId: 'opt-b', text: 'التواكل هو أعلى مراتب اليقين لأن الإنسان يستغني فيه عن العمل والسعي.' },
        { optionId: 'opt-c', text: 'لا فرق بينهما في الاصطلاح الشرعي وكلاهما بمعنى تفويض الأمر دون عمل.' },
        { optionId: 'opt-d', text: 'التوكل يختص بالأمور الأخروية والتواكل يختص بالسعي الدنيوي والرزق.' }
      ]
    }
  ];

  const currentQuestions = questions.length > 0 ? questions : defaultQuestions;
  const currentQ = currentQuestions[currentIndex] || currentQuestions[0];
  const currentItemId = currentQ.assessmentItemId || currentQ.itemId || currentQ.id;
  const isLast = currentIndex === currentQuestions.length - 1;
  const answeredCount = Object.keys(selectedAnswers).length;

  const handleSelectOption = (optionId) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentItemId]: optionId
    });
  };

  const handleNext = () => {
    if (!isLast) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleFinish = () => {
    if (onSubmitAssessment) {
      // Send item IDs and selected options cleanly to the server bridge
      const submission = Object.entries(selectedAnswers).map(([itemId, optionId]) => ({
        assessmentItemId: itemId,
        itemId,
        selectedOptionId: optionId
      }));
      onSubmitAssessment(submission, assessmentId);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#1A5243]/60">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#103C31] text-[#34D399] text-xs font-semibold mb-2">
            <Award className="w-3.5 h-3.5" />
            اختبار الرحلة المعرفية
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            قياس الاستيعاب والفهم المعرفي
          </h2>
        </div>

        <button
          onClick={onCancel}
          className="text-xs text-[#7CA79B] hover:text-white transition-colors"
        >
          خروج مؤقت
        </button>
      </div>

      {/* Progress Indicators */}
      <div className="mb-6 flex items-center justify-between text-xs text-[#D1EAE2]">
        <span>السؤال {currentIndex + 1} من {currentQuestions.length}</span>
        <span>المكتمل: {answeredCount} / {currentQuestions.length}</span>
      </div>

      <div className="w-full h-2 bg-[#0D332A] rounded-full overflow-hidden mb-8 border border-[#1A5243]">
        <div
          className="h-full bg-[#34D399] transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / currentQuestions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-6 sm:p-8 shadow-xl mb-6">
        {currentQ.concept && (
          <div className="text-xs text-[#34D399] font-medium mb-3">
            المفهوم المستهدف: {currentQ.concept}
          </div>
        )}

        <h3 className="text-lg sm:text-xl font-bold text-white mb-6 leading-relaxed">
          {currentQ.question}
        </h3>

        {/* Options */}
        <div className="space-y-3">
          {(currentQ.options || []).map((opt) => {
            const optId = opt.optionId || opt.id;
            const isSelected = selectedAnswers[currentItemId] === optId;
            return (
              <button
                key={optId}
                type="button"
                onClick={() => handleSelectOption(optId)}
                className={`w-full text-right p-4 rounded-xl border transition-all duration-150 flex items-start gap-3.5 ${
                  isSelected
                    ? 'bg-[#103C31] border-[#34D399] text-white shadow-md'
                    : 'bg-[#0D332A] border-[#1A5243] text-[#D1EAE2] hover:bg-[#15483B] hover:border-[#34D399]/40'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isSelected
                      ? 'border-[#34D399] bg-[#34D399] text-[#06231C]'
                      : 'border-[#1A5243] bg-[#06231C]'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <span className="text-sm sm:text-base leading-relaxed">{opt.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0 || isSubmitting}
          className="px-4 py-2 rounded-xl bg-[#0D332A] hover:bg-[#103C31] border border-[#1A5243] text-sm text-[#D1EAE2] disabled:opacity-40 disabled:hover:bg-[#0D332A] flex items-center gap-2 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          السابق
        </button>

        {!isLast ? (
          <button
            onClick={handleNext}
            className="px-6 py-2 rounded-xl bg-[#34D399] hover:bg-[#6EE7B7] text-[#06231C] font-bold text-sm flex items-center gap-2 transition-colors"
          >
            التالي
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={answeredCount < currentQuestions.length || isSubmitting}
            className="px-6 py-2 rounded-xl bg-[#34D399] hover:bg-[#6EE7B7] disabled:opacity-40 disabled:hover:bg-[#34D399] text-[#06231C] font-bold text-sm flex items-center gap-2 transition-colors"
          >
            {isSubmitting ? 'جاري التحقق والتقييم...' : 'تسليم التقييم'}
            <CheckCircle2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
