import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowLeft, Sparkles } from 'lucide-react';

export default function SearchModal({ isOpen, onClose, onSearch }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim());
    onClose();
  };

  const sampleQuestions = [
    "هل القرآن من تأليف محمد؟",
    "ما حكم صلاة الجماعة؟",
    "ما هي أركان الإيمان؟",
    "ما شروط التوبة النصوح؟"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-2xl bg-[#082A22] border border-[#1A5243] rounded-2xl shadow-2xl p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center text-[#7CA79B] hover:text-white hover:bg-[#0D332A] transition-colors"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-4 text-right flex items-center gap-2">
          <Search className="w-5 h-5 text-[#34D399]" />
          البحث في مشكاة
        </h3>

        <form onSubmit={handleSubmit} className="relative mb-6">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اكتب سؤالك الشرعي أو المعرفي هنا..."
            className="w-full h-14 pr-12 pl-14 bg-[#06231C] border border-[#1A5243] rounded-xl text-white placeholder-[#7CA79B] text-base focus:outline-none focus:border-[#34D399] transition-all"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7CA79B]" />
          <button
            type="submit"
            disabled={!query.trim()}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-[#34D399] disabled:bg-[#1A5243] disabled:text-[#7CA79B] text-[#06231C] flex items-center justify-center font-bold hover:bg-[#6EE7B7] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </form>

        <div className="text-right">
          <div className="text-xs text-[#7CA79B] font-semibold mb-2 flex items-center gap-1.5 justify-start">
            <Sparkles className="w-3.5 h-3.5 text-[#34D399]" />
            أسئلة مقترحة للاستكشاف:
          </div>
          <div className="flex flex-wrap gap-2">
            {sampleQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onSearch(q);
                  onClose();
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#0D332A] text-[#D1EAE2] hover:bg-[#103C31] hover:text-[#34D399] border border-[#1A5243] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
