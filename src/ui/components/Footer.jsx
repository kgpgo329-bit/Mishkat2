import React from 'react';
import Logo from './Logo';

export default function Footer({ setCurrentView }) {
  return (
    <footer className="relative z-10 border-t border-[#1A5243]/40 bg-[#06231C]/90 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-[#7CA79B]">
        <div className="flex items-center gap-3">
          <Logo size="sm" showText={true} onClick={() => setCurrentView('home')} />
          <span className="text-xs text-[#7CA79B] border-r border-[#1A5243] pr-3 mr-1 hidden sm:inline">
            منصة معرفية إسلامية موثوقة
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs text-[#A7C1B8]">
          <button onClick={() => setCurrentView('home')} className="hover:text-[#34D399] transition-colors">الرئيسية</button>
          <button onClick={() => setCurrentView('sources')} className="hover:text-[#34D399] transition-colors">المصادر المعتمدة</button>
          <button onClick={() => setCurrentView('journey')} className="hover:text-[#34D399] transition-colors">رحلتي المعرفية</button>
          <button onClick={() => setCurrentView('about')} className="hover:text-[#34D399] transition-colors">حول مشكاة</button>
        </div>

        <div className="text-xs text-[#7CA79B]/80 text-center md:text-left">
          جميع الحقوق محفوظة © {new Date().getFullYear()} مشكاة
        </div>
      </div>
    </footer>
  );
}
