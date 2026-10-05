import React from 'react';

export default function Logo({ size = "md", showText = true, className = "", onClick }) {
  // Sizes: sm, md, lg, xl
  const sizeMap = {
    sm: { icon: "w-7 h-7", text: "text-lg", sub: "text-[9px] tracking-[0.2em]" },
    md: { icon: "w-10 h-10", text: "text-2xl", sub: "text-[10px] tracking-[0.25em]" },
    lg: { icon: "w-16 h-16", text: "text-4xl", sub: "text-xs tracking-[0.3em]" },
    xl: { icon: "w-24 h-24", text: "text-5xl", sub: "text-sm tracking-[0.35em]" },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-3 cursor-pointer select-none group transition-transform ${className}`}
    >
      {/* Icon Emblem: Arch + Open Book + Radiant Star */}
      <div className={`relative ${currentSize.icon} flex-shrink-0 transition-transform group-hover:scale-105`}>
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
          {/* Outer Arch */}
          <path
            d="M60 10 C42 25 24 50 24 82 C24 99 35 110 60 110 C85 110 96 99 96 82 C96 50 78 25 60 10 Z"
            stroke="#34D399"
            strokeWidth="5"
            strokeLinejoin="round"
          />

          {/* Inner Arch Accent */}
          <path
            d="M60 22 C47 34 34 54 34 81 C34 93 42 101 60 101 C78 101 86 93 86 81 C86 54 73 34 60 22 Z"
            fill="#0D332A"
            stroke="#216352"
            strokeWidth="1.5"
          />

          {/* Open Book Pages (Quran / Knowledge) */}
          <path
            d="M60 78 C52 74 42 74 36 77 L36 57 C43 54 53 54 60 58 C67 54 77 54 84 57 L84 77 C78 74 68 74 60 78 Z"
            fill="#34D399"
          />
          <path d="M60 58 L60 78" stroke="#082A22" strokeWidth="2.5" strokeLinecap="round" />

          {/* Radiant Star / Lantern Light */}
          <path
            d="M60 36 L62.5 43 L69.5 44.5 L64.5 49 L66 56 L60 52.5 L54 56 L55.5 49 L50.5 44.5 L57.5 43 Z"
            fill="#A7F3D0"
          />
          <circle cx="60" cy="45" r="2.5" fill="#FFFFFF" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col text-right">
          <span className={`font-arabic font-bold text-white tracking-wide leading-none ${currentSize.text}`}>
            مشكاة
          </span>
          <span className={`text-[#34D399] font-semibold font-sans uppercase mt-0.5 opacity-90 ${currentSize.sub}`}>
            MISHKAT
          </span>
        </div>
      )}
    </div>
  );
}
