import React, { useState } from 'react';
import Logo from './Logo';
import { Search, User, Menu, X } from 'lucide-react';

export default function Navbar({ currentView, setCurrentView, onOpenSearch }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'الرئيسية' },
    { id: 'sources', label: 'المصادر' },
    { id: 'journey', label: 'رحلتي المعرفية' },
    { id: 'report', label: 'تقرير رحلتك المعرفية' },
    { id: 'fatwa', label: 'طلب الفتوى والمختص' },
    { id: 'about', label: 'حول مشكاة' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#06231C]/90 backdrop-blur-md border-b border-[#1A5243]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Right side in RTL: Navigation Links & Logo */}
        <div className="flex items-center gap-8">
          {/* Logo on far right */}
          <Logo size="sm" onClick={() => setCurrentView('home')} />

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`relative py-2 transition-colors duration-150 ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-[#D1EAE2]/80 hover:text-white'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#34D399] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Left side in RTL: Specialist Portal, Language & Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('specialist')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#1A5243] bg-[#0D332A]/50 hover:bg-[#103C31] text-xs text-[#D1EAE2] hover:text-[#34D399] hover:border-[#34D399]/40 transition-colors"
          >
            <span>بوابة المتخصصين (المراجعة)</span>
          </button>

          <button
            onClick={() => {}}
            className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs text-[#7CA79B] hover:text-white border border-[#1A5243]/60 hover:border-[#1A5243] transition-colors"
          >
            English
          </button>

          <button
            onClick={onOpenSearch}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#D1EAE2] hover:text-white hover:bg-[#0D332A] transition-colors border border-transparent hover:border-[#1A5243]"
            title="البحث العام"
            aria-label="البحث"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Mobile hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center text-[#D1EAE2] hover:text-white hover:bg-[#0D332A] transition-colors"
            aria-label="القائمة"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#082A22] border-b border-[#1A5243] px-6 py-4 flex flex-col gap-3 shadow-xl">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                setMobileMenuOpen(false);
              }}
              className={`text-right py-2 text-base transition-colors ${
                currentView === item.id
                  ? 'text-[#34D399] font-bold'
                  : 'text-[#D1EAE2] hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
