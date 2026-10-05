import React from 'react';
import {
  Compass,
  CheckCircle,
  BookOpen,
  ArrowLeft,
  ChevronLeft,
  Sparkles,
  Award,
  FileText
} from 'lucide-react';

export default function JourneyView({
  records = [],
  journeyState = null,
  onSelectRecord,
  onStartAssessment,
  onViewReport,
  assessmentCompleted = false,
  isLoading = false
}) {
  // Sample educational records if no records have been created in this session yet
  const defaultRecords = [
    {
      id: 'rec-1',
      question: 'هل القرآن من تأليف محمد؟',
      date: '2025/06/10',
      topic: 'القرآن والعقيدة',
      status: 'VERIFIED'
    },
    {
      id: 'rec-2',
      question: 'ما حكم صلاة الجماعة؟',
      date: '2025/06/08',
      topic: 'الفقه الإسلامي',
      status: 'VERIFIED'
    },
    {
      id: 'rec-3',
      question: 'ما هي أركان الإيمان؟',
      date: '2025/06/06',
      topic: 'العقيدة',
      status: 'VERIFIED'
    },
    {
      id: 'rec-4',
      question: 'ما شروط التوبة النصوح؟',
      date: '2025/06/04',
      topic: 'التزكية والأخلاق',
      status: 'VERIFIED'
    },
    {
      id: 'rec-5',
      question: 'ما فضل الصدق في الإسلام؟',
      date: '2025/06/01',
      topic: 'الأخلاق والسنة',
      status: 'VERIFIED'
    }
  ];

  const currentRecords = records.length > 0 ? records : defaultRecords;
  const verifiedCount = journeyState?.uniqueVerifiedCount ?? currentRecords.filter((r) => r.status === 'VERIFIED').length;
  const targetCount = journeyState?.targetCount ?? 20;
  const progressPercent = journeyState?.progressPercentage ?? Math.min(Math.round((verifiedCount / targetCount) * 100), 100);
  const isEligible = journeyState?.assessmentEligible ?? (verifiedCount >= targetCount);

  const steps = [
    {
      number: '1',
      title: 'سؤالك',
      desc: 'تطرح سؤالك بوضوح'
    },
    {
      number: '2',
      title: 'الإجابة الموثقة',
      desc: 'تحصل على إجابة من مصادر معتمدة'
    },
    {
      number: '3',
      title: 'الاستكشاف والقراءة',
      desc: 'تعمق في المصادر ووسع معرفتك'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">رحلتي المعرفية</h2>
        <p className="text-sm sm:text-base text-[#D1EAE2]/80">
          خطوتك نحو فهم أعمق
        </p>
      </div>

      {/* 3 Step Indicator Cards (Matching approved design) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {steps.map((step) => (
          <div
            key={step.number}
            className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-5 text-center flex flex-col items-center justify-center relative overflow-hidden"
          >
            <div className="w-10 h-10 rounded-full bg-[#0D332A] border border-[#34D399]/40 text-[#34D399] font-bold text-lg flex items-center justify-center mb-3">
              {step.number}
            </div>
            <h3 className="text-base font-bold text-white mb-1">{step.title}</h3>
            <p className="text-xs text-[#D1EAE2]/70">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Milestone Progress Bar: 20 Verified Questions */}
      <div className="bg-[#0D332A] border border-[#1A5243] rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#34D399]" />
            <span className="text-sm sm:text-base font-bold text-white">
              محطة التقييم المعرفي (20 سؤالاً موثقاً)
            </span>
          </div>
          <span className="text-sm font-semibold text-[#34D399]">
            {verifiedCount} / {targetCount}
          </span>
        </div>

        {/* Progress track */}
        <div className="w-full h-3 bg-[#06231C] rounded-full overflow-hidden border border-[#1A5243] mb-4">
          <div
            className="h-full bg-gradient-to-l from-[#34D399] to-[#10B981] rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#D1EAE2]/70">
          <span>
            {isEligible
              ? '🎉 أحسنت! اكتملت الـ 20 محطة موثقة وأصبح اختبار الفهم متاحاً.'
              : `تبقى ${Math.max(0, targetCount - verifiedCount)} أسئلة موثقة جديدة لفتح اختبار الرحلة المعرفية الشامل.`}
          </span>

          <div className="flex items-center gap-2">
            {isEligible && !assessmentCompleted && (
              <button
                onClick={onStartAssessment}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-[#34D399] hover:bg-[#6EE7B7] text-[#06231C] font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {isLoading ? 'جاري التحضير...' : 'بدء اختبار الفهم'}
              </button>
            )}

            {assessmentCompleted && (
              <button
                onClick={onViewReport}
                className="px-4 py-2 rounded-xl bg-[#103C31] hover:bg-[#15483B] border border-[#34D399] text-[#34D399] font-bold transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                عرض تقرير الرحلة
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Questions Log (سجل أسئلتك) */}
      <div className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1A5243]/60">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#34D399]" />
            سجل أسئلتك
          </h3>
          <span className="text-xs text-[#7CA79B]">
            {currentRecords.length} أسئلة مستكشفة
          </span>
        </div>

        <div className="divide-y divide-[#1A5243]/40">
          {currentRecords.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectRecord && onSelectRecord(item)}
              className="py-3.5 flex items-center justify-between hover:bg-[#0D332A]/50 px-3 rounded-xl cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-white group-hover:text-[#34D399] transition-colors">
                  {item.question || item.questionText}
                </span>
                {item.topic && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#0D332A] text-[#7CA79B] border border-[#1A5243] hidden sm:inline-block">
                    {item.topic}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-[#7CA79B]">
                <span className="font-mono">{item.date}</span>
                <ChevronLeft className="w-4 h-4 text-[#7CA79B] group-hover:text-[#34D399] group-hover:-translate-x-1 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
