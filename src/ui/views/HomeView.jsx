import React, { useState } from 'react';
import Logo from '../components/Logo';
import IslamicOrnament from '../components/IslamicOrnament';
import { Search, ArrowLeft } from 'lucide-react';

export default function HomeView({ onAskQuestion }) {
  const [question, setQuestion] = useState('');

  const topicShortcuts = [
    { label: 'القرآن والسنة', sample: 'هل القرآن من تأليف محمد ﷺ؟' },
    { label: 'العقيدة', sample: 'ما هي أركان الإيمان الستة؟' },
    { label: 'الفقه', sample: 'ما حكم صلاة الجماعة في المسجد؟' },
    { label: 'التاريخ الإسلامي', sample: 'ما أول مسجد بني في الإسلام؟' },
    { label: 'مواضيع أخرى', sample: 'ما معنى التوكل في الإسلام؟' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    onAskQuestion(question.trim());
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col justify-between overflow-hidden">
      {/* Center Hero Section */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-16 sm:pt-24 pb-12 text-center flex-1 flex flex-col items-center justify-center">
        
        {/* Emblem & Branding */}
        <div className="mb-6 transform hover:scale-105 transition-transform duration-300">
          <Logo size="xl" showText={true} />
        </div>

        {/* Main Statement */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight leading-snug">
          لأن الفهم أعمق من مجرد إجابة
        </h1>

        {/* Supporting Description */}
        <p className="text-base sm:text-lg text-[#D1EAE2]/90 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
          منصة ذكاء اصطناعي تساعدك على الوصول إلى إجابات موثوقة من مصادر معتمدة، مع رحلة معرفية تدعم فضولك.
        </p>

        {/* Primary Search Input Pill */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl relative mb-6 group"
        >
          <div className="relative flex items-center bg-[#0D332A] rounded-full border border-[#1A5243] shadow-lg shadow-black/20 focus-within:border-[#34D399] focus-within:ring-2 focus-within:ring-[#34D399]/20 transition-all duration-200">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="اكتب سؤالك هنا..."
              className="w-full h-14 sm:h-16 pr-14 pl-16 bg-transparent text-white placeholder-[#7CA79B] text-base sm:text-lg rounded-full focus:outline-none"
            />
            {/* Search Icon on right side in RTL */}
            <div className="absolute right-5 text-[#7CA79B] pointer-events-none group-focus-within:text-[#34D399] transition-colors">
              <Search className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            {/* Submit Arrow Circle on left side in RTL */}
            <button
              type="submit"
              disabled={!question.trim()}
              className="absolute left-3 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#082A22] border border-[#1A5243] text-white hover:bg-[#34D399] hover:text-[#06231C] disabled:opacity-40 disabled:hover:bg-[#082A22] disabled:hover:text-white flex items-center justify-center transition-all duration-200"
              aria-label="إرسال السؤال"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* Topic Shortcuts */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-2xl">
          {topicShortcuts.map((topic, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onAskQuestion(topic.sample)}
              className="px-4 py-1.5 rounded-full bg-[#0D332A]/70 hover:bg-[#103C31] text-xs sm:text-sm text-[#D1EAE2] hover:text-[#34D399] border border-[#1A5243] hover:border-[#34D399]/40 transition-colors"
            >
              {topic.label}
            </button>
          ))}
        </div>
      </div>

      {/* Islamic Architectural Landscape Illustration anchored at bottom */}
      <div className="relative w-full mt-auto">
        <IslamicOrnament className="w-full max-h-56 sm:max-h-72 opacity-90" />
      </div>
    </div>
  );
}
