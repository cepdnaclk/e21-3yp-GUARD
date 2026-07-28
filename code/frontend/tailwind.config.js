/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  // Respect the existing [data-theme="dark"] toggle in ThemeContext
  darkMode: ['selector', '[data-theme="dark"]'],

  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Mapped from base.css :root CSS variables
        primary:        '#0ea5e9',
        'primary-dark': '#0284c7',
        danger:         '#ef4444',
        success:        '#22c55e',
        warning:        '#f59e0b',
        surface:        '#ffffff',
        'text-main':    '#1e293b',
        'text-muted':   '#64748b',
      },
    },
  },

  plugins: [],
};

