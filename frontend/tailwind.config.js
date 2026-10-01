/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          deep: '#07111F',
          blue: '#0B1F33',
        },
        electric: {
          blue: '#1677FF',
        },
        cyan: '#00C2FF',
        teal: '#00D4A8',
        white: '#F8FAFC',
        muted: '#94A3B8',
        warning: '#F59E0B',
        danger: '#EF4444',
        success: '#22C55E',
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        fleet: {
          "primary": "#1677FF",
          "secondary": "#00C2FF",
          "accent": "#00D4A8",
          "neutral": "#0B1F33",
          "base-100": "#07111F",
          "info": "#3ABFF8",
          "success": "#22C55E",
          "warning": "#F59E0B",
          "error": "#EF4444",
        },
      },
    ],
  },
}
