/** @type {import('tailwindcss').Config} */
const rootConfig = require('../../../tailwind.config.js');

module.exports = {
  ...rootConfig,
  content: [
    "./src/microservices/analytics/**/*.{js,jsx,ts,tsx}",
    "./src/shared/components/**/*.{js,jsx,ts,tsx}",
    "./src/shared/hooks/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    ...rootConfig.theme,
    extend: {
      ...rootConfig.theme.extend,
      colors: {
        ...rootConfig.theme.extend.colors,
        analytics: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e'
        }
      },
      animation: {
        ...rootConfig.theme.extend.animation,
        'chart-draw': 'chartDraw 1s ease-out',
        'metric-pulse': 'metricPulse 2s ease-in-out infinite',
        'kpi-glow': 'kpiGlow 2s ease-in-out infinite'
      },
      keyframes: {
        ...rootConfig.theme.extend.keyframes,
        chartDraw: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' }
        },
        metricPulse: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' }
        },
        kpiGlow: {
          '0%, 100%': { boxShadow: '0 0 0px rgba(139,92,246,0)' },
          '50%': { boxShadow: '0 0 20px rgba(139,92,246,0.3)' }
        }
      }
    }
  }
};

