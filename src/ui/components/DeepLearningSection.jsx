import React from 'react';
import { Sparkles, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function DeepLearningSection({ questions = [], onSelectQuestion }) {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="mt-8 pt-8 border-t border-[#1A5243]/60">
      {/* Header Container Matching Screenshot 2 */}
      <div className="bg-[#082A22] border border-[#1A5243] rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#103C31] text-[#34D399] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white">التعلم العميق</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#103C31] text-[#34D399] border border-[#34D399]/40 text-xs font-semibold">
              مسار اشتقاقي
            </span>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-[#D1EAE2]/80 mb-6">
          محاور بحثية وأسئلة تأصيلية مرتبطة بسؤالك لتوسيع مدارك الفهم والاستفادة
        </p>

        {/* Vertical Stack of Question Cards */}
        <div className="space-y-3.5">
          {questions.map((q, idx) => {
            const qText = typeof q === 'string' ? q : (q.question || '');
            const qObj = typeof q === 'object' ? q : {};
            const badgeLabel = qObj.topic || qObj.theme || qObj.badge || 'محاور التوسع المعرفي';
            const rationaleText = qObj.rationale || qObj.explanation || 'توسيع المعرفة بفتح المسائل التأصيلية المرتبطة';

            return (
              <div
                key={idx}
                onClick={() => onSelectQuestion(qText, {
                  origin: 'DEEP_LEARNING',
                  parentRecordId: qObj.parentRecordId || null,
                  followUpId: qObj.followUpId || null
                })}
                className="group p-4 sm:p-5 rounded-2xl bg-[#0D332A] hover:bg-[#103C31] border border-[#1A5243] hover:border-[#34D399]/50 cursor-pointer transition-all duration-200"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-[#06231C] text-[#34D399] border border-[#34D399]/30 font-semibold text-[11px]">
                    {badgeLabel}
                  </span>
                  <span className="text-[#D1EAE2]/70 text-[11px] leading-relaxed">
                    • {rationaleText}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm sm:text-base font-bold text-white group-hover:text-[#34D399] transition-colors leading-relaxed">
                    {qText}
                  </span>

                  <span className="w-9 h-9 rounded-full bg-[#082A22] border border-[#1A5243] group-hover:border-[#34D399] flex items-center justify-center text-[#7CA79B] group-hover:text-[#06231C] group-hover:bg-[#34D399] shrink-0 transition-all duration-200">
                    <ArrowLeft className="w-4 h-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note Matching Screenshot 2 */}
        <div className="mt-5 pt-4 border-t border-[#1A5243]/40 flex items-center gap-2 text-xs text-[#7CA79B]">
          <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
          <span>اختيار أي سؤال ينقلك إلى مسار استرجاع وتوثيق كامل، ويضاف إلى رحلتك المعرفية بعد توثيقه.</span>
        </div>
      </div>
    </div>
  );
}
