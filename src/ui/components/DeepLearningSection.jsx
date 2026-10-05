import React from 'react';
import { Sparkles, ArrowLeft } from 'lucide-react';

export default function DeepLearningSection({ questions = [], onSelectQuestion }) {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="mt-8 pt-8 border-t border-[#1A5243]/50">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#34D399]" />
        <h3 className="text-lg font-bold text-white">التعلّم العميق</h3>
        <span className="text-xs text-[#7CA79B] mr-2">
          (أسئلة استكشافية متقدمة لتوسيع فهمك انطلاقاً من هذا الجواب)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {questions.map((q, idx) => {
          const qText = typeof q === 'string' ? q : (q.question || '');
          const qObj = typeof q === 'object' ? q : {};
          return (
            <button
              key={idx}
              onClick={() => onSelectQuestion(qText, {
                origin: 'DEEP_LEARNING',
                parentRecordId: qObj.parentRecordId || null,
                followUpId: qObj.followUpId || null
              })}
              className="group flex items-center justify-between p-4 rounded-xl bg-[#0D332A] hover:bg-[#103C31] border border-[#1A5243] hover:border-[#34D399]/40 text-right transition-all duration-200"
            >
              <span className="text-sm font-medium text-[#D1EAE2] group-hover:text-white leading-relaxed">
                {qText}
              </span>
              <span className="w-8 h-8 rounded-full bg-[#082A22] flex items-center justify-center text-[#7CA79B] group-hover:text-[#34D399] group-hover:bg-[#06231C] shrink-0 mr-3 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
