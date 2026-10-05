import React from 'react';
import { HelpCircle, CheckCircle, Cpu, BookOpen, ShieldCheck } from 'lucide-react';
import Logo from '../components/Logo';

export default function AboutView() {
  const sections = [
    {
      id: 'what',
      icon: <BookOpen className="w-5 h-5 text-[#34D399]" />,
      title: 'ما هي مشكاة؟',
      content:
        'مشكاة منصة تجمع بين قوة المصادر الإسلامية الموثوقة وتقنيات الذكاء الاصطناعي لتمنحك إجابات دقيقة وتفهم أعمق لأسئلتك الشرعية والمعرفية، مع بناء رحلة تعلم مستمرة تنمي بصيرتك وثقافتك الإسلامية.'
    },
    {
      id: 'methodology',
      icon: <ShieldCheck className="w-5 h-5 text-[#34D399]" />,
      title: 'منهجية التحقق',
      content:
        'نستند إلى مصادر معتمدة وموثوقة مع مراجعة دقيقة للمحتوى وتوثيق المصادر لضمان دقة المعلومة. لا نعتمد على ذاكرة الذكاء الاصطناعي وحدها، بل نخضع كل إجابة لمحاكمة دلالية صارمة تثبت صحة الاستدلال من النص المعتمد.'
    },
    {
      id: 'ai_role',
      icon: <Cpu className="w-5 h-5 text-[#34D399]" />,
      title: 'دور الذكاء الاصطناعي',
      content:
        'يعمل الذكاء الاصطناعي في مشكاة كطبقة فهم وتحليل واستدلال لتوجيهك إلى المصادر المناسبة وتيسير صياغة الجواب واقتراح مسارات التعلم، دون التعدي على القيم الشرعية والمنهج العلمي الرصين، فالأدلة المعتمدة هي مصدر الحقيقة.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-block mb-4">
          <Logo size="md" showText={false} />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">حول مشكاة</h2>
        <p className="text-base text-[#D1EAE2]/80 max-w-xl mx-auto">
          منصة إسلامية موثوقة للبحث عن المعرفة وبناء رحلة فهم عميقة
        </p>
      </div>

      {/* Three Primary Cards (Matching reference screenshot) */}
      <div className="space-y-5">
        {sections.map((section) => (
          <div
            key={section.id}
            className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-6 sm:p-7 hover:border-[#34D399]/40 transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#0D332A] border border-[#1A5243] flex items-center justify-center shrink-0">
                {section.icon}
              </div>
              <h3 className="text-lg font-bold text-white">{section.title}</h3>
            </div>
            <p className="text-sm sm:text-base text-[#D1EAE2]/90 leading-relaxed pr-12">
              {section.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
