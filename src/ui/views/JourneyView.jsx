import React, { useState } from 'react';
import {
  Compass,
  CheckCircle,
  BookOpen,
  ArrowLeft,
  ChevronLeft,
  Sparkles,
  Award,
  FileText,
  Clock,
  HelpCircle,
  AlertCircle
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
  const [activeTab, setActiveTab] = useState('verified'); // 'verified' | 'history'

  const verifiedCount = journeyState?.uniqueVerifiedCount ?? records.filter((r) => r.status === 'VERIFIED').length;
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ANSWERED':
      case 'VERIFIED':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#103C31] text-[#34D399] border border-[#34D399]/40 font-medium">
            موثق
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-300 border border-amber-600/40 font-medium">
            جزئي
          </span>
        );
      case 'REFER_TO_AUTHORITY':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/40 text-cyan-300 border border-cyan-600/40 font-medium">
            إحالة للفتوى
          </span>
        );
      case 'NEEDS_CLARIFICATION':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-200 border border-amber-500/40 font-medium">
            استيضاح
          </span>
        );
      case 'INSUFFICIENT':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium">
            أدلة غير كافية
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0D332A] text-[#7CA79B] border border-[#1A5243]">
            {status}
          </span>
        );
    }
  };

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

      {/* Questions & History Container */}
      <div className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-6">
        {/* Tab Headers */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-[#1A5243]/60">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('verified')}
              className={`text-sm font-bold flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'verified'
                  ? 'bg-[#103C31] text-[#34D399] border border-[#34D399]/40'
                  : 'text-[#7CA79B] hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              المحطات الموثقة ({records.length})
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`text-sm font-bold flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'history'
                  ? 'bg-[#103C31] text-[#34D399] border border-[#34D399]/40'
                  : 'text-[#7CA79B] hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              سجل الاستفسارات ({history.length})
            </button>
          </div>

          <span className="text-xs text-[#7CA79B]">
            {activeTab === 'verified' ? `${records.length} أسئلة موثقة` : `${history.length} تفاعلات مسجلة`}
          </span>
        </div>

        {/* Tab 1: Verified Journey Records */}
        {activeTab === 'verified' && (
          <div>
            {records.length === 0 ? (
              <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#0D332A] border border-[#1A5243] flex items-center justify-center text-[#34D399] mb-3">
                  <Compass className="w-6 h-6" />
                </div>
                <p className="text-base font-bold text-white mb-1">
                  لم تبدأ رحلتك المعرفية بعد.
                </p>
                <p className="text-xs text-[#D1EAE2]/70 max-w-md leading-relaxed">
                  ستظهر هنا الأسئلة التي اكتمل توثيقها والتحقق منها.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#1A5243]/40">
                {records.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectRecord && onSelectRecord(item)}
                    className="py-3.5 flex items-center justify-between hover:bg-[#0D332A]/50 px-3 rounded-xl cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-white group-hover:text-[#34D399] transition-colors">
                        {item.question || item.questionText || item.originalQuestion}
                      </span>
                      {item.topic && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#0D332A] text-[#7CA79B] border border-[#1A5243] hidden sm:inline-block">
                          {item.topic}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-[#7CA79B]">
                      <span className="font-mono">{item.date || (item.timestamp ? item.timestamp.slice(0, 10) : '')}</span>
                      <ChevronLeft className="w-4 h-4 text-[#7CA79B] group-hover:text-[#34D399] group-hover:-translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Full Question History */}
        {activeTab === 'history' && (
          <div>
            {history.length === 0 ? (
              <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#0D332A] border border-[#1A5243] flex items-center justify-center text-[#7CA79B] mb-3">
                  <Clock className="w-6 h-6" />
                </div>
                <p className="text-base font-bold text-white mb-1">
                  لا توجد استفسارات مسجلة بعد.
                </p>
                <p className="text-xs text-[#D1EAE2]/70 max-w-md leading-relaxed">
                  ستظهر هنا جميع الأسئلة التي طرحتها في جلستك الحالية وحالات معالجتها.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#1A5243]/40">
                {history.map((item) => (
                  <div
                    key={item.interactionId}
                    onClick={() => onSelectRecord && onSelectRecord({ question: item.originalQuestion })}
                    className="py-3.5 flex items-center justify-between hover:bg-[#0D332A]/50 px-3 rounded-xl cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-white group-hover:text-[#34D399] transition-colors">
                        {item.originalQuestion}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-[#7CA79B]">
                      <span className="font-mono">{item.timestamp ? item.timestamp.slice(0, 10) : ''}</span>
                      <ChevronLeft className="w-4 h-4 text-[#7CA79B] group-hover:text-[#34D399] group-hover:-translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
