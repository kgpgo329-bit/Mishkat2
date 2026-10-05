import React, { useState } from 'react';
import {
  Compass,
  CheckCircle,
  BookOpen,
  ChevronLeft,
  Sparkles,
  Award,
  FileText,
  Lock,
  LayoutGrid
} from 'lucide-react';

export default function JourneyView({
  records = [],
  history = [],
  journeyState = null,
  onSelectRecord,
  onStartAssessment,
  onViewReport,
  assessmentCompleted = false,
  isLoading = false
}) {
  const verifiedCount = journeyState?.uniqueVerifiedCount ?? records.filter((r) => r.status === 'VERIFIED').length;
  const targetCount = journeyState?.targetCount ?? 20;
  const progressPercent = journeyState?.progressPercentage ?? Math.min(Math.round((verifiedCount / targetCount) * 100), 100);
  const isEligible = journeyState?.assessmentEligible ?? (verifiedCount >= targetCount);
  const remainingCount = Math.max(0, targetCount - verifiedCount);

  // Dynamic breakdown by Islamic domain/topic from real verified records
  const domainBreakdown = {};
  let directQuestionsCount = 0;
  let deepLearningQuestionsCount = 0;

  for (const r of records) {
    const topic = r.topic || 'عام';
    domainBreakdown[topic] = (domainBreakdown[topic] || 0) + 1;
    if (r.origin === 'DEEP_LEARNING') {
      deepLearningQuestionsCount++;
    } else {
      directQuestionsCount++;
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Top verified journey badge */}
      <div className="flex justify-center mb-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0D332A] border border-[#1A5243] text-[#34D399] text-xs font-semibold">
          <CheckCircle className="w-4 h-4" />
          <span>مسارك المعرفي الموثق</span>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">رحلتي المعرفية في مشكاة</h1>
        <p className="text-xs sm:text-sm text-[#D1EAE2]/80 max-w-xl mx-auto leading-relaxed">
          سجل معرفي شخصي ومستمر يوثق كل مسألة استكشفتها، ويرصد الأدلة المعتمدة، ويقيس تراكم فهمك.
        </p>
      </div>

      {/* Milestone Progress Card (Matching Screenshot 1) */}
      <div className="bg-[#082A22] border border-[#1A5243] rounded-3xl p-6 sm:p-8 mb-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="text-xs text-[#7CA79B] mb-1">التقدم التراكمي نحو التقييم الشامل</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {verifiedCount} <span className="text-[#34D399]">/ {targetCount}</span> <span className="text-sm font-normal text-[#D1EAE2]">سجل موثق</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0D332A] border border-[#1A5243] text-xs text-[#D1EAE2]">
              <Lock className="w-3.5 h-3.5 text-[#7CA79B]" />
              <span>متبقي {remainingCount} سجلات</span>
            </div>

            {/* Assessment Button: locked or unlocked */}
            {!isEligible ? (
              <button
                disabled
                className="px-4 py-2 rounded-xl bg-[#0D332A] border border-[#1A5243]/80 text-[#7CA79B] text-xs font-medium flex items-center gap-1.5 cursor-not-allowed"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>التقييم مقفل ({verifiedCount}/{targetCount})</span>
              </button>
            ) : !assessmentCompleted ? (
              <button
                onClick={onStartAssessment}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-[#34D399] hover:bg-[#6EE7B7] text-[#06231C] text-xs font-bold transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isLoading ? 'جاري التحضير...' : 'بدء التقييم الشامل'}</span>
              </button>
            ) : (
              <button
                onClick={onViewReport}
                className="px-4 py-2 rounded-xl bg-[#103C31] hover:bg-[#15483B] border border-[#34D399] text-[#34D399] text-xs font-bold transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>عرض تقرير الرحلة</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress track */}
        <div className="w-full h-2.5 bg-[#06231C] rounded-full overflow-hidden border border-[#1A5243] mb-3">
          <div
            className="h-full bg-gradient-to-l from-[#34D399] to-[#10B981] rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="text-[11px] text-[#7CA79B] leading-relaxed">
          كل سؤال تطرحه ويحصل على إجابة موثقة يُحفظ هنا تلقائياً، بعد الوصول إلى 20 سجلاً يفتح مسار التقييم المعرفي.
        </p>
      </div>

      {/* 2 Statistics Breakdown Cards (Matching Screenshot 1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Domain Distribution Card */}
        <div className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-5">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white mb-4">
            <LayoutGrid className="w-4 h-4 text-[#34D399]" />
            <span>توزيع المعرفة بحسب المجالات الشرعية</span>
          </div>

          {Object.keys(domainBreakdown).length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              {Object.entries(domainBreakdown).map(([domain, count]) => (
                <div
                  key={domain}
                  className="bg-[#0D332A] border border-[#1A5243] rounded-xl p-3 flex items-center justify-between"
                >
                  <span className="text-xs font-semibold text-white uppercase">{domain}</span>
                  <span className="text-xs text-[#34D399] font-medium">{count} سجلات</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[#7CA79B]">
              لا توجد مجالات مسجلة بعد. اطرح أسئلة لبدء تصنيف رحلتك.
            </div>
          )}
        </div>

        {/* Question Sources Card */}
        <div className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white mb-4">
              <Sparkles className="w-4 h-4 text-[#34D399]" />
              <span>مصادر الأسئلة</span>
            </div>

            <div className="space-y-2.5">
              <div className="bg-[#0D332A] border border-[#1A5243] rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs text-[#D1EAE2]">أسئلة مباشرة منك</span>
                <span className="text-xs font-bold text-white">{directQuestionsCount}</span>
              </div>
              <div className="bg-[#0D332A] border border-[#1A5243] rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs text-[#D1EAE2]">عبر «التعلم العميق»</span>
                <span className="text-xs font-bold text-[#34D399]">{deepLearningQuestionsCount}</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#7CA79B] mt-4 pt-3 border-t border-[#1A5243]/40">
            تنمو رحلتك مع كل سؤال تستكشف دلالته مع مشكاة.
          </div>
        </div>
      </div>

      {/* Verified Records List (Matching Screenshot 3) */}
      <div className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-6">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>السجلات المعرفية المحققة</span>
              <span className="text-sm font-semibold text-[#34D399]">({records.length})</span>
            </h3>
            <span className="text-xs text-[#7CA79B]">
              {records.length} سجل موثق
            </span>
          </div>
          <p className="text-xs text-[#D1EAE2]/70 mt-1">
            كل سجل يمثل وحدة تعلم مستقلة مدعومة بأدلة معتمدة
          </p>
        </div>

        {records.length === 0 ? (
          <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[#0D332A] border border-[#1A5243] flex items-center justify-center text-[#34D399] mb-3">
              <Compass className="w-6 h-6" />
            </div>
            <p className="text-base font-bold text-white mb-1">
              لم تبدأ رحلتك المعرفية بعد.
            </p>
            <p className="text-xs text-[#D1EAE2]/70 max-w-md leading-relaxed">
              ستظهر هنا الأسئلة التي اكتمل توثيقها والتحقق منها عبر محرك مشكاة.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectRecord && onSelectRecord(item)}
                className="p-4 rounded-xl bg-[#0D332A] hover:bg-[#103C31] border border-[#1A5243] hover:border-[#34D399]/40 cursor-pointer transition-all duration-200 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.topic && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#06231C] text-[#34D399] border border-[#34D399]/30 font-medium uppercase">
                        {item.topic}
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#082A22] text-[#D1EAE2]/90 border border-[#1A5243]">
                      {item.origin === 'DEEP_LEARNING' ? 'تعلم عميق' : 'سؤال مباشر'}
                    </span>
                    {item.concepts?.[0] && (
                      <span className="text-[11px] text-[#7CA79B] hidden md:inline">
                        • {item.concepts[0]}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#7CA79B]">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#06231C] border border-[#1A5243]/60 text-[#34D399]">
                      <BookOpen className="w-3 h-3" />
                      {item.sources?.length || 1} أدلة
                    </span>
                    <ChevronLeft className="w-4 h-4 text-[#7CA79B] group-hover:text-[#34D399] group-hover:-translate-x-1 transition-all" />
                  </div>
                </div>

                <div className="text-sm sm:text-base font-bold text-white group-hover:text-[#34D399] transition-colors leading-relaxed">
                  {item.question || item.questionText || item.originalQuestion}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
