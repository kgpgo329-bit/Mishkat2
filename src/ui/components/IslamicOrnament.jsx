import React from 'react';

export default function IslamicOrnament({ className = "" }) {
  return (
    <div className={`pointer-events-none select-none overflow-hidden ${className}`}>
      {/* Visual replica of "زخرفة أسفل الصفحة" from the Mishkat reference image */}
      <svg
        viewBox="0 0 1000 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="waveGradDeep" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0B372C" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#041A14" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="waveGradMid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#145A48" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#082B22" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="waveGradLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#227D65" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0E4234" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="archGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#34D399" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#08382B" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* Outer Islamic Arch Silhouette on Left Side */}
        <path
          d="M80 320 C80 180 130 90 200 45 C270 90 320 180 320 320 Z"
          fill="url(#archGrad)"
          stroke="#1E5C4B"
          strokeWidth="2"
        />

        {/* Inner Arch Silhouette */}
        <path
          d="M115 320 C115 205 150 130 200 95 C250 130 285 205 285 320 Z"
          fill="#06231C"
          stroke="#266D5A"
          strokeWidth="1.5"
        />

        {/* Delicate Plant / Leaf Sprout Motif inside the arch */}
        <path
          d="M200 320 C200 240 200 190 200 160"
          stroke="#34D399"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Lower leaves */}
        <path
          d="M200 260 C175 245 170 220 185 210 C198 220 200 245 200 260 Z"
          fill="#34D399"
          fillOpacity="0.85"
        />
        <path
          d="M200 235 C225 220 230 195 215 185 C202 195 200 220 200 235 Z"
          fill="#34D399"
          fillOpacity="0.85"
        />
        {/* Upper leaves */}
        <path
          d="M200 195 C185 180 182 160 195 152 C204 160 202 180 200 195 Z"
          fill="#6EE7B7"
        />
        <path
          d="M200 160 C200 145 207 138 200 130 C193 138 200 145 200 160 Z"
          fill="#A7F3D0"
        />

        {/* Flowing Dunes / Rolling Waves at the bottom across full width */}
        {/* Back wave */}
        <path
          d="M0 240 Q250 180 500 230 T1000 190 L1000 320 L0 320 Z"
          fill="url(#waveGradLight)"
        />
        {/* Middle wave */}
        <path
          d="M0 260 Q320 200 640 250 T1000 230 L1000 320 L0 320 Z"
          fill="url(#waveGradMid)"
        />
        {/* Front wave */}
        <path
          d="M0 285 Q200 240 450 270 T1000 260 L1000 320 L0 320 Z"
          fill="url(#waveGradDeep)"
        />
      </svg>
    </div>
  );
}
