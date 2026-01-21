/** @type {import('tailwindcss').Config} */
const rootConfig = require('../../../tailwind.config.js');

module.exports = {
  ...rootConfig,
  content: [
    "./src/microservices/visualization/**/*.{js,jsx,ts,tsx}",
    "./src/shared/components/**/*.{js,jsx,ts,tsx}",
    "./src/shared/hooks/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    ...rootConfig.theme,
    extend: {
      ...rootConfig.theme.extend,
      colors: {
        ...rootConfig.theme.extend.colors,
        visualization: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75'
        }
      },
      animation: {
        ...rootConfig.theme.extend.animation,
        'chart-draw': 'chartDraw 1s ease-out',
        'gauge-fill': 'gaugeFill 1.5s ease-out',
        'network-pulse': 'networkPulse 2s ease-in-out infinite',
        'timeline-enter': 'timelineEnter 0.5s ease-out'
      },
      keyframes: {
        ...rootConfig.theme.extend.keyframes,
        chartDraw: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' }
        },
        gaugeFill: {
          '0%': { transform: 'rotate(-90deg)' },
          '100%': { transform: 'rotate(var(--gauge-rotation))' }
        },
        networkPulse: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.1)' }
        },
        timelineEnter: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        }
      }
    }
  }
};
