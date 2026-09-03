/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0e1a',
        card: '#0f1629',
        border: '#1e2d4a',
        primary: '#00d4ff',
        success: '#00ff88',
        danger: '#ff4444',
        warning: '#ffaa00',
        text: '#e2e8f0',
        subtext: '#64748b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        neon: '0 0 12px rgba(0,212,255,0.5)',
        'neon-green': '0 0 12px rgba(0,255,136,0.5)',
        'neon-red': '0 0 12px rgba(255,68,68,0.5)',
      },
      keyframes: {
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 6px rgba(0,212,255,0.4)' },
          '50%': { boxShadow: '0 0 18px rgba(0,212,255,0.9)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        pulseGlow: 'pulseGlow 1.6s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
}
