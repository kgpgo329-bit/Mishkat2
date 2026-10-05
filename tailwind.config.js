/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mishkat: {
          bg: '#06231C',
          dark: '#082A22',
          surface: '#0D332A',
          card: '#103C31',
          cardHover: '#15483B',
          border: '#1A5243',
          borderLight: '#266D5A',
          mint: '#34D399',
          mintLight: '#6EE7B7',
          mintDark: '#059669',
          emerald: '#10B981',
          gold: '#FBBF24',
          text: '#FFFFFF',
          textDim: '#D1EAE2',
          textMuted: '#7CA79B',
        }
      },
      fontFamily: {
        arabic: ['"IBM Plex Sans Arabic"', 'Cairo', 'system-ui', 'sans-serif'],
        quran: ['"Amiri"', 'serif'],
        sans: ['"Plus Jakarta Sans"', '"IBM Plex Sans Arabic"', 'sans-serif'],
      },
      boxShadow: {
        'glow-mint': '0 0 25px -5px rgba(52, 211, 153, 0.25)',
        'glow-soft': '0 10px 30px -10px rgba(6, 35, 28, 0.8)',
      }
    },
  },
  plugins: [],
}
