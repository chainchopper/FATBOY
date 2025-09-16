/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts,css,scss}",
    // include Angular inline templates or other files if needed
    "./src/**/**.component.{ts,html}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#f038ff',
        teal: {
          DEFAULT: '#0abdc6'
        }
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        popIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        sweepScanner: {
          '0%': { transform: 'translateX(-110%)' },
          '100%': { transform: 'translateX(110%)' }
        }
      },
      animation: {
        fadeInUp: 'fadeInUp 0.5s ease-out forwards',
        popIn: 'popIn 0.35s ease-out forwards',
        sweepScanner: 'sweepScanner 2.5s infinite ease-in-out'
      }
    },
  },
  safelist: [
    // Static class names used dynamically in templates or from JS
    'bg-[#f038ff]', 'bg-[#0abdc6]', 'text-teal-400', 'text-purple-400',
    'shadow-teal-500/50', 'shadow-purple-500/50', 'animate-neon-flicker',
    'bg-teal-900/20', 'bg-purple-900/20', 'border-teal-500', 'border-purple-500',
    // Icon/button variants that may be toggled at runtime
    'text-purple-400', 'text-teal-400', 'bg-teal-500', 'bg-purple-500',
  ],
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ],
};