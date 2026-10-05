import React, { useState } from 'react';
import {
  FileText,
  Award,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Compass,
  Sparkles,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';

export default function JourneyReportView({ reportData, onBackToJourney, onAskQuestion }) {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'assessment'

  // Extract sections if canonical client-safe report is provided
  const js = reportData?.sections?.['ملخص الرحلة المعرفية'] || reportData?.sections?.JOURNEY_SUMMARY;
  const as = reportData?.sections?.['تقييم الفهم'] || reportData?.sections?.ASSESSMENT_EVALUATION;

  // If report data has not been generated yet, render authentic empty state
  if (!reportData || (!js && !as)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-[#082A22] border border-[#1A5243] rounded-3xl p-8 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-[#103C31] text-[#34D399] flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            لم يتم إصدار تقرير الرحلة المعرفية بعد
          </h2>
          <p className="text-sm text-[#D1EAE2]/80 leading-relaxed mb-6">
            يصدر التقرير النهائي تلقائياً بعد إتمام 20 محطة معرفية موثقة واجتياز تقييم الفهم بنجاح عبر النظام الحقيقي.
          </p>
          <button
            onClick={onBackToJourney}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#34D399] text-[#051C17] font-semibold text-sm rounded-xl hover:bg-[#2BB380] transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            العودة إلى رحلتي المعرفية
          </button>
        </div>
      </div>
    );
  }

  // Harmonized report object from real persisted state only
  const report = {
    verifiedQuestionsCount: js?.uniqueVerifiedCount ?? reportData?.verifiedQuestionsCount ?? 0,
    overallScore: as?.scorePercentage ?? reportData?.overallScore ?? 0,
    completionDate: reportData?.createdAt
      ? new Date(reportData.createdAt).toLocaleDateString('ar-SA')
      : (reportData?.completionDate || new Date().toLocaleDateString('ar-SA')),
    topics: js?.topicsCovered
      ? js.topicsCovered.map(t => typeof t === 'string' ? { name: t, count: '' } : t)
      : (reportData?.topics || []),
    keyConcepts: js?.conceptsEncountered || reportData?.keyConcepts || [],
    consultedSources: js?.sourcesUsed
      ? js.sourcesUsed.map(s => ({
          name: s.sourceName || s.name || 'مصدر معتمد',
          title: s.title || '',
          url: s.url || ''
        }))
      : (reportData?.consultedSources || []),
    deepLearningPaths: reportData?.deepLearningPaths || [],
    progression: js?.progression || null,
    masteredConcepts: as?.conceptsUnderstood || reportData?.masteredConcepts || [],
    reviewNeededConcepts: as?.conceptsNeedingReview || reportData?.reviewNeededConcepts || [],
    factualInterpretation: as?.factualInterpretation || null,
    recommendedSourcesForReview: reportData?.recommendedSourcesForReview || [],
    suggestedNextQuestions: reportData?.suggestedNextQuestions || []
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Back button */}
      <button
        onClick={onBackToJourney}
        className="inline-flex items-center gap-2 text-sm text-[#D1EAE2] hover:text-[#34D399] transition-colors mb-6 group"
      >
        <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
        العودة إلى رحلتي المعرفية
      </button>

      {/* Hero Header */}
      <div className="bg-[#082A22] border border-[#1A5243] rounded-3xl p-6 sm:p-8 mb-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#103C31] text-[#34D399] text-xs font-semibold mb-3">
              <Award className="w-4 h-4" />
              تقرير إنجاز المعرفة الموثقة
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              تقرير الرحلة المعرفية
            </h1>
            <p className="text-xs sm:text-sm text-[#D1EAE2]/80">
              توثيق شامل لما استكشفته عبر {report.verifiedQuestionsCount} محطة موثقة مع تقييم دقيق للاستيعاب
            </p>
          </div>

          <div className="flex items-center gap-4 bg-[#0D332A] border border-[#1A5243] rounded-2xl p-4 self-start sm:self-auto shrink-0">
            <div className="text-center">
              <div className="text-3xl font-extrabold text-[#34D399]">
                {report.overallScore}%
              </div>
              <div className="text-[11px] text-[#D1EAE2]/70 mt-0.5">درجة الاستيعاب</div>
            </div>
            <div className="h-10 w-px bg-[#1A5243]" />
            <div className="text-center">
              <div className="text-3xl font-extrabold text-white">
                {report.verifiedQuestionsCount}
              </div>
              <div className="text-[11px] text-[#D1EAE2]/70 mt-0.5">محطة موثقة</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-[#1A5243]/60 mb-8 pb-1">
        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-3 px-4 text-sm font-semibold transition-all relative ${
            activeTab === 'summary'
              ? 'text-white font-bold'
              : 'text-[#7CA79B] hover:text-[#D1EAE2]'
          }`}
        >
          <span className="flex items-center gap-2">
            <Compass className="w-4 h-4" />
            الجزء الأول: ملخص الرحلة (ماذا تعلّمت؟)
          </span>
          {activeTab === 'summary' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#34D399] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('assessment')}
          className={`pb-3 px-4 text-sm font-semibold transition-all relative ${
            activeTab === 'assessment'
              ? 'text-white font-bold'
              : 'text-[#7CA79B] hover:text-[#D1EAE2]'
          }`}
        >
          <span className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            الجزء الثاني: تقييم الفهم (إلى أي درجة فهمت؟)
          </span>
          {activeTab === 'assessment' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#34D399] rounded-full" />
          )}
        </button>
      </div>

      {/* TAB 1: ملخص الرحلة المعرفية */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Topics Explored */}
          <div className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#34D399]" />
              الموضوعات التي استكشفتها
            </h3>
            {report.topics.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {report.topics.map((t, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#0D332A] border border-[#1A5243]">
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    {t.count ? (
                      <div className="text-xs text-[#34D399] mt-1">{t.count} أسئلة موثقة</div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#7CA79B]">لم يتم تسجيل موضوعات موثقة بعد.</p>
            )}
          </div>

          {/* Key Concepts */}
          <div className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#34D399]" />
              المفاهيم الرئيسية المكتسبة
            </h3>
            {report.keyConcepts.length > 0 ? (
              <ul className="space-y-2.5">
                {report.keyConcepts.map((concept, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-[#D1EAE2]">
                    <span className="w-5 h-5 rounded-full bg-[#103C31] text-[#34D399] flex items-center justify-center text-xs shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span>{concept}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#7CA79B]">لم تسجل مفاهيم مكتسبة بعد.</p>
            )}
          </div>

          {/* Progression Overview (if available from real journey) */}
          {report.progression && (
            <div className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#34D399]" />
                مسار التدرج والتعمّق
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-[#0D332A] border border-[#1A5243]">
                  <div className="text-xl font-bold text-[#34D399]">{report.progression.userQuestions}</div>
                  <div className="text-xs text-[#D1EAE2]/70 mt-1">أسئلة مباشرة</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0D332A] border border-[#1A5243]">
                  <div className="text-xl font-bold text-[#34D399]">{report.progression.deepLearningFollowUps}</div>
                  <div className="text-xs text-[#D1EAE2]/70 mt-1">تعلّم عميق</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0D332A] border border-[#1A5243]">
                  <div className="text-xl font-bold text-white">{report.progression.lineageLinksCount}</div>
                  <div className="text-xs text-[#D1EAE2]/70 mt-1">روابط نسب معرفي</div>
                </div>
              </div>
            </div>
          )}

          {/* Deep Learning Branches (if present) */}
          {report.deepLearningPaths.length > 0 && (
            <div className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#34D399]" />
                مسارات التوسع عبر التعلّم العميق
              </h3>
              <div className="space-y-3">
                {report.deepLearningPaths.map((path, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#0D332A] border border-[#1A5243] text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-white font-medium">{path.from}</span>
                    <span className="text-[#34D399] hidden sm:inline">← تعمقت إلى ←</span>
                    <span className="text-[#34D399] sm:text-right font-medium">{path.to}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sources Consulted */}
          {report.consultedSources.length > 0 && (
            <div className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-[#34D399]" />
                المصادر المعتمدة التي رجعت إليها
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {report.consultedSources.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#0D332A] border border-[#1A5243] text-xs flex items-center justify-between"
                  >
                    <span className="text-white font-medium">
                      {s.name} {s.title ? `— ${s.title}` : ''}
                    </span>
                    {s.url && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#34D399] hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: تقييم الفهم */}
      {activeTab === 'assessment' && (
        <div className="space-y-6">
          {/* Factual Interpretation */}
          {report.factualInterpretation && (
            <div className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-5 text-sm text-[#D1EAE2] leading-relaxed">
              {report.factualInterpretation}
            </div>
          )}

          {/* Mastered Concepts */}
          <div className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#34D399]" />
              نقاط القوة والمفاهيم التي أتقنتها
            </h3>
            {report.masteredConcepts.length > 0 ? (
              <ul className="space-y-2.5">
                {report.masteredConcepts.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-[#D1EAE2]">
                    <span className="w-5 h-5 rounded-full bg-[#103C31] text-[#34D399] flex items-center justify-center text-xs shrink-0 mt-0.5">
                      ★
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#7CA79B]">لم تسجل مفاهيم مستوفاة بالكامل بعد.</p>
            )}
          </div>

          {/* Concepts Needing Review */}
          {report.reviewNeededConcepts.length > 0 && (
            <div className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                مفاهيم تحتاج إلى مراجعة وتدقيق
              </h3>
              <ul className="space-y-2.5">
                {report.reviewNeededConcepts.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-amber-200">
                    <span className="w-5 h-5 rounded-full bg-amber-950/60 text-amber-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                      !
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Sources for Review */}
          {report.recommendedSourcesForReview.length > 0 && (
            <div className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#34D399]" />
                مصادر مقترحة للمراجعة والتعمّق
              </h3>
              <div className="space-y-2">
                {report.recommendedSourcesForReview.map((src, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#0D332A] border border-[#1A5243] text-xs sm:text-sm text-[#D1EAE2] flex items-center justify-between"
                  >
                    <span>{src.name}</span>
                    {src.url && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#34D399] hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Next Questions */}
          {report.suggestedNextQuestions.length > 0 && (
            <div className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#34D399]" />
                أسئلة مقترحة لبدء رحلتك القادمة
              </h3>
              <div className="space-y-3">
                {report.suggestedNextQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => onAskQuestion && onAskQuestion(q)}
                    className="w-full text-right p-3.5 rounded-xl bg-[#0D332A] hover:bg-[#103C31] border border-[#1A5243] hover:border-[#34D399]/40 text-xs sm:text-sm text-[#D1EAE2] hover:text-white flex items-center justify-between transition-colors group"
                  >
                    <span>{q}</span>
                    <ChevronLeft className="w-4 h-4 text-[#7CA79B] group-hover:text-[#34D399] group-hover:-translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
