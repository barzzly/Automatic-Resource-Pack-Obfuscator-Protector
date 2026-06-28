import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        surface: '#111118',
        'surface-2': '#16161f',
        border: '#1e1e2e',
        'border-accent': '#7c3aed',
        accent: '#7c3aed',
        'accent-light': '#a855f7',
        muted: '#3f3f5c',
        text: '#e2e8f0',
        'text-muted': '#64748b',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontFamily: {
        display: ['var(--font-space)', 'sans-serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'grid-flow': 'gridFlow 24s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'fade-up': 'fadeUp 0.55s ease-out forwards',
        orbit: 'orbit 12s linear infinite',
        dash: 'dash 1.4s linear infinite',
        pop: 'pop 0.45s ease-out both',
      },
      keyframes: {
        gridFlow: {
          '0%': { backgroundPosition: '0 0, 0 0' },
          '100%': { backgroundPosition: '96px 96px, 48px 48px' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 22px rgba(124, 58, 237, 0.25)' },
          '50%': { boxShadow: '0 0 42px rgba(168, 85, 247, 0.5)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        orbit: {
          to: { transform: 'rotate(360deg)' },
        },
        dash: {
          to: { strokeDashoffset: '-32' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
