import React, { useState } from 'react';
import {
  CheckCircle2,
  BookOpen,
  ExternalLink,
  Copy,
  Star,
  ArrowRight,
  Search,
  Check,
  AlertCircle,
  HelpCircle,
  Scale,
  Quote
} from 'lucide-react';
import DeepLearningSection from '../components/DeepLearningSection';

export default function ResultView({
  question = "هل القرآن من تأليف محمد؟",
  resultData,
  onBack,
  onAskQuestion
}) {
  const [copied, setCopied] = useState(false);
  const [rated, setRated] = useState(false);

  // If no resultData provided, display clean empty state without fabricating fake answers
  if (!resultData) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-[#D1EAE2] hover:text-[#34D399] transition-colors mb-6 group"
        >
          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          العودة إلى الصفحة الرئيسية
        </button>
        <div className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-12 text-center shadow-xl">
          <HelpCircle className="w-12 h-12 text-[#34D399] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">لا توجد إجابة معروضة حالياً</h3>
          <p className="text-sm text-[#D1EAE2]/70 max-w-md mx-auto mb-6">
            يرجى كتابة سؤالك في محرك البحث للوصول إلى إجابة موثقة من المصادر المعتمدة.
          </p>
          <button
            onClick={onBack}
            className="px-6 py-2.5 rounded-xl bg-[#34D399] hover:bg-[#6EE7B7] text-[#06231C] font-bold text-sm transition-colors"
          >
            طرح سؤال جديد
          </button>
        </div>
      </div>
    );
  }

  const data = resultData;

  // Harmonize sources and deep learning from canonical API schema
  const sources = (data.sources || []).map((src, idx) => ({
    id: src.id || src.sourceId || idx + 1,
    name: src.sourceName || src.name || 'مصدر معتمد',
    title: src.title || '',
    section: src.section || '',
    url: src.url || src.sourceUrl || '',
    verified: src.verified !== false,
    reason: src.reason || ''
  }));

  const citations = Array.isArray(data.citations) ? data.citations : [];
  const deepLearningItems = data.deepLearningSuggestions || data.deepLearningQuestions || [];

  const handleCopy = () => {
    navigator.clipboard.writeText(`${question}\n\n${data.answer || ''}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRate = () => {
    setRated(!rated);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Back navigation link */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-[#D1EAE2] hover:text-[#34D399] transition-colors mb-6 group"
      >
        <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
        العودة إلى الصفحة الرئيسية
      </button>

      {/* Question display pill */}
      <div className="w-full bg-[#0D332A] border border-[#1A5243] rounded-full px-6 py-4 flex items-center justify-between mb-8 shadow-md">
        <span className="text-base sm:text-lg font-medium text-white truncate pl-4">
          {question}
        </span>
        <Search className="w-5 h-5 text-[#34D399] shrink-0" />
      </div>

      {/* Main Result Card */}
      <div className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-6 sm:p-8 shadow-xl relative">
        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-6">
          {data.status === 'ANSWERED' && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#103C31] border border-[#34D399]/40 text-[#34D399] text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{data.statusLabel || 'إجابة موثقة'}</span>
            </div>
          )}
          {data.status === 'PARTIAL' && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-sm font-semibold">
              <AlertCircle className="w-4 h-4" />
              <span>{data.statusLabel || 'إجابة جزئية موثقة'}</span>
            </div>
          )}
          {data.status === 'INSUFFICIENT' && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/60 border border-red-500/40 text-red-300 text-sm font-semibold">
              <AlertCircle className="w-4 h-4" />
              <span>{data.statusLabel || 'مصادر غير كافية للتحقق'}</span>
            </div>
          )}
          {data.status === 'NEEDS_CLARIFICATION' && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/60 border border-blue-500/40 text-blue-300 text-sm font-semibold">
              <HelpCircle className="w-4 h-4" />
              <span>{data.statusLabel || 'السؤال يحتاج إلى توضيح'}</span>
            </div>
          )}
          {data.status === 'REFER_TO_AUTHORITY' && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 text-sm font-semibold">
              <Scale className="w-4 h-4" />
              <span>{data.statusLabel || 'إحالة إلى المفتي والجهات الرسمية'}</span>
            </div>
          )}
        </div>

        {/* Answer Content */}
        <div className="text-base sm:text-lg text-white leading-relaxed font-light mb-8 space-y-4">
          <p className="leading-loose whitespace-pre-line">{data.answer}</p>
        </div>

        {/* Verified Citations Snippets (if provided by canonical pipeline) */}
        {citations.length > 0 && (
          <div className="border-t border-[#1A5243]/60 pt-6 mb-8">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#D1EAE2] mb-3">
              <Quote className="w-4 h-4 text-[#34D399]" />
              <span>الشواهد والاقتباسات الموثقة</span>
            </div>
            <div className="space-y-2.5">
              {citations.map((c, idx) => (
                <div
                  key={c.chunkId || idx}
                  className="p-3 rounded-xl bg-[#0D332A]/40 border border-[#1A5243]/40 text-xs sm:text-sm text-[#D1EAE2]"
                >
                  <div className="text-[#34D399] font-medium mb-1">
                    «{c.sourceName || 'المصدر المعتمد'}»
                  </div>
                  <p className="leading-relaxed font-light italic">"{c.text}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Used Sources Section */}
        {sources.length > 0 && (
          <div className="border-t border-[#1A5243]/60 pt-6 mb-8">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#D1EAE2] mb-4">
              <BookOpen className="w-4 h-4 text-[#34D399]" />
              <span>المصادر المعتمدة</span>
            </div>

            <ol className="space-y-3 pr-2 list-none">
              {sources.map((src, index) => (
                <li
                  key={src.id || index}
                  className="flex items-start justify-between gap-4 p-3 rounded-xl bg-[#0D332A]/50 border border-[#1A5243]/50 text-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#103C31] text-[#34D399] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <div>
                      <div className="text-white font-medium">
                        {src.name} {src.title && `— ${src.title}`}
                      </div>
                      {src.section && (
                        <div className="text-xs text-[#7CA79B] mt-0.5">
                          {src.section}
                        </div>
                      )}
                      {src.reason && (
                        <div className="text-xs text-[#34D399]/80 mt-1">
                          وجه الاستدلال: {src.reason}
                        </div>
                      )}
                    </div>
                  </div>

                  {src.url ? (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-lg bg-[#06231C] hover:bg-[#103C31] border border-[#1A5243] text-xs text-[#D1EAE2] hover:text-[#34D399] flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      عرض المصدر
                    </a>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Action Buttons Toolbar */}
        <div className="border-t border-[#1A5243]/60 pt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {sources.length > 0 && sources[0]?.url && (
              <a
                href={sources[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-[#0D332A] hover:bg-[#103C31] border border-[#1A5243] text-xs sm:text-sm text-white hover:text-[#34D399] flex items-center gap-2 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                عرض المصدر
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl bg-[#0D332A] hover:bg-[#103C31] border border-[#1A5243] text-xs sm:text-sm text-[#D1EAE2] hover:text-white flex items-center gap-2 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#34D399]" />
                  <span className="text-[#34D399]">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>نسخ الإجابة</span>
                </>
              )}
            </button>

            <button
              onClick={handleRate}
              className={`px-4 py-2 rounded-xl border text-xs sm:text-sm flex items-center gap-2 transition-colors ${
                rated
                  ? 'bg-[#103C31] border-[#34D399] text-[#34D399]'
                  : 'bg-[#0D332A] hover:bg-[#103C31] border-[#1A5243] text-[#D1EAE2] hover:text-white'
              }`}
            >
              <Star className={`w-4 h-4 ${rated ? 'fill-[#34D399]' : ''}`} />
              <span>{rated ? 'تم التقييم' : 'تقييم الإجابة'}</span>
            </button>
          </div>
        </div>

        {/* Deep Learning Follow-up Questions Section */}
        {deepLearningItems && deepLearningItems.length > 0 && (
          <DeepLearningSection
            questions={deepLearningItems}
            onSelectQuestion={onAskQuestion}
          />
        )}
      </div>
    </div>
  );
}
