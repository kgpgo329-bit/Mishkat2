import React, { useState } from 'react';
import { Search, ExternalLink, BookOpen, Layers } from 'lucide-react';

export default function SourcesView() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'الكل' },
    { id: 'quran_sunnah', label: 'القرآن والسنة' },
    { id: 'aqeeda', label: 'العقيدة' },
    { id: 'fiqh', label: 'الفقه' },
    { id: 'history', label: 'التاريخ الإسلامي' },
    { id: 'general', label: 'كتب عامة' },
  ];

  const sourcesList = [
    {
      id: 'quran',
      title: 'القرآن الكريم',
      description: 'تفسير ومعاني القرآن الكريم وتلاواته المعتمدة وفق المصحف الشريف.',
      category: 'quran_sunnah',
      url: 'https://quranpedia.net',
      domain: 'quranpedia.net'
    },
    {
      id: 'tabari',
      title: 'تفسير الطبري',
      description: 'جامع البيان عن تأويل آي القرآن - إمام المفسرين وأوثق تفاسير السلف بالأثر.',
      category: 'quran_sunnah',
      url: 'https://dorar.net/tafseer',
      domain: 'dorar.net'
    },
    {
      id: 'bukhari',
      title: 'صحيح البخاري',
      description: 'الجامع المسند الصحيح المختصر من أمور رسول الله ﷺ وسننه وأيامه.',
      category: 'quran_sunnah',
      url: 'https://dorar.net/hadith',
      domain: 'dorar.net'
    },
    {
      id: 'moia',
      title: 'موقع وزارة الشؤون الإسلامية',
      description: 'مقالات وأبحاث ودراسات إسلامية موثوقة برعاية الوزارة.',
      category: 'general',
      url: 'https://www.moia.gov.sa',
      domain: 'moia.gov.sa'
    },
    {
      id: 'history',
      title: 'تاريخ الإسلام',
      description: 'الموسوعة التاريخية للسيرة النبوية والخلفاء الراشدين وأحداث التاريخ الإسلامي.',
      category: 'history',
      url: 'https://dorar.net/history',
      domain: 'dorar.net'
    },
    {
      id: 'fiqh_enc',
      title: 'موسوعة الفقه الإسلامي',
      description: 'موسوعة فقهية شاملة تتناول المسائل والأدلة وفق المذاهب الفقهية المعتبرة.',
      category: 'fiqh',
      url: 'https://dorar.net/feqhia',
      domain: 'dorar.net'
    },
    {
      id: 'aqeeda_enc',
      title: 'الموسوعة العقدية',
      description: 'بيان عقيدة أهل السنة والجماعة والرد على الشبهات في أصول الإيمان.',
      category: 'aqeeda',
      url: 'https://dorar.net/aqeeda',
      domain: 'dorar.net'
    },
    {
      id: 'jamhara',
      title: 'موسوعة الجمهرة لمفردات المحتوى الإسلامي',
      description: 'معجم دقيق لمصطلحات ومفردات التراث الشرعي وتأصيل معانيها وضوابط ترجمتها.',
      category: 'general',
      url: 'https://islamic-content.com/dictionary',
      domain: 'islamic-content.com'
    },
    {
      id: 'bayyinat',
      title: 'بيّنات: أسئلة وأجوبة عن الإسلام',
      description: 'إجابات علمية موثقة عن أبرز الأسئلة الشائعة والشبهات الفكرية المعاصرة.',
      category: 'general',
      url: 'https://dawa.center/file/7937',
      domain: 'dawa.center'
    }
  ];

  const filteredSources = sourcesList.filter((source) => {
    const matchesCategory =
      activeCategory === 'all' || source.category === activeCategory;
    const matchesSearch =
      source.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Title & Subtitle */}
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">المصادر</h2>
        <p className="text-sm sm:text-base text-[#D1EAE2]/80">
          مراجع ومصادر موثوقة من مصادر معتمدة
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-white text-[#06231C] font-bold shadow-md'
                  : 'bg-[#0D332A] text-[#D1EAE2] hover:bg-[#103C31] hover:text-white border border-[#1A5243]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Search in Sources */}
      <div className="max-w-xl mx-auto mb-10">
        <div className="relative flex items-center bg-[#0D332A] rounded-full border border-[#1A5243] focus-within:border-[#34D399] transition-colors">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث في المصادر..."
            className="w-full h-12 pr-12 pl-4 bg-transparent text-white placeholder-[#7CA79B] text-sm rounded-full focus:outline-none"
          />
          <Search className="absolute right-4 w-4 h-4 text-[#7CA79B]" />
        </div>
      </div>

      {/* Sources Grid (2 columns matching reference) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSources.map((source) => (
          <div
            key={source.id}
            className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-5 hover:border-[#34D399]/40 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#34D399] shrink-0" />
                  {source.title}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[#D1EAE2]/80 leading-relaxed mb-4">
                {source.description}
              </p>
            </div>

            <div className="border-t border-[#1A5243]/50 pt-3 flex items-center justify-between">
              <span className="text-xs text-[#7CA79B] font-mono">
                {source.domain}
              </span>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D332A] hover:bg-[#103C31] border border-[#1A5243] text-xs text-[#D1EAE2] hover:text-[#34D399] transition-colors"
              >
                <span>فتح المصدر</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {filteredSources.length === 0 && (
        <div className="text-center py-12 text-[#7CA79B] text-sm">
          لم يتم العثور على مصادر تطابق بحثك.
        </div>
      )}
    </div>
  );
}
